-- ============================================================
-- Migration: Denormalised shop rating stats
-- ------------------------------------------------------------
-- The /shops browse page previously fetched every approved shop
-- AND every matching review, then aggregated avg_rating /
-- review_count in JS on each request (unbounded, O(shops+reviews)).
--
-- This moves the aggregate onto the shops row, maintained by a
-- trigger on `reviews`, so the browse page can filter, sort, and
-- paginate entirely in SQL with one indexed query.
--
-- Run manually in the Supabase Dashboard SQL Editor.
-- ============================================================

-- 1. Aggregate-holding columns (rating_sum + review_count are the
--    source of truth; avg_rating is derived).
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS review_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_sum   int NOT NULL DEFAULT 0;

-- 2. avg_rating is GENERATED from the two counters — it can never
--    drift out of sync and never divides by zero (NULL when no reviews).
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2)
  GENERATED ALWAYS AS (
    CASE WHEN review_count > 0
         THEN round(rating_sum::numeric / review_count, 2)
         ELSE NULL
    END
  ) STORED;

-- 3. Trigger function. SECURITY DEFINER is REQUIRED: there is no RLS
--    UPDATE policy that lets a normal authenticated user update an
--    arbitrary shop, so an invoker-rights trigger would silently update
--    zero rows when a regular user posts a review. Running as the table
--    owner (postgres) bypasses RLS for this controlled aggregate write.
CREATE OR REPLACE FUNCTION apply_review_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shops
       SET review_count = review_count + 1,
           rating_sum   = rating_sum + NEW.rating
     WHERE id = NEW.shop_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shops
       SET review_count = GREATEST(0, review_count - 1),
           rating_sum   = GREATEST(0, rating_sum - OLD.rating)
     WHERE id = OLD.shop_id;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.shop_id = OLD.shop_id THEN
      -- rating edited on the same shop
      UPDATE shops
         SET rating_sum = rating_sum + (NEW.rating - OLD.rating)
       WHERE id = NEW.shop_id;
    ELSE
      -- review moved to a different shop (rare, but stay correct)
      UPDATE shops
         SET review_count = GREATEST(0, review_count - 1),
             rating_sum   = GREATEST(0, rating_sum - OLD.rating)
       WHERE id = OLD.shop_id;
      UPDATE shops
         SET review_count = review_count + 1,
             rating_sum   = rating_sum + NEW.rating
       WHERE id = NEW.shop_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Only fire on the columns that affect the aggregate (the post-insert
-- image_urls UPDATE in submitReview must NOT re-fire it).
DROP TRIGGER IF EXISTS reviews_apply_stats ON reviews;
CREATE TRIGGER reviews_apply_stats
  AFTER INSERT OR DELETE OR UPDATE OF rating, shop_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION apply_review_stats();

-- 4. Backfill existing rows from current review data.
UPDATE shops s
   SET review_count = agg.cnt,
       rating_sum   = agg.total
  FROM (
    SELECT shop_id, count(*)::int AS cnt, sum(rating)::int AS total
      FROM reviews
     GROUP BY shop_id
  ) agg
 WHERE agg.shop_id = s.id;

-- 5. Indexes backing the browse-page sorts.
CREATE INDEX IF NOT EXISTS shops_avg_rating_idx   ON shops (avg_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS shops_review_count_idx ON shops (review_count DESC);

-- 6. Mirror the codebase grant convention for the new function.
GRANT EXECUTE ON FUNCTION apply_review_stats() TO anon, authenticated, service_role;
