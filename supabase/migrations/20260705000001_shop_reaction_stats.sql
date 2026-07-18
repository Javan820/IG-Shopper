-- ============================================================
-- Migration: Denormalised shop reaction stats
-- ------------------------------------------------------------
-- The homepage "Fresh Finds" tabs rank shops by popularity and by
-- recommendation. Both depend on shop_reactions, which had no
-- denormalised counter — ranking would have required an unbounded
-- GROUP BY aggregate on every homepage load.
--
-- This mirrors 20260618000001_shop_rating_stats.sql: two counters on
-- the shops row maintained by a trigger on shop_reactions, plus a
-- GENERATED popularity_score (reviews + reactions) so the homepage
-- can sort entirely in SQL with one indexed query.
--
-- Run manually in the Supabase Dashboard SQL Editor.
-- ============================================================

-- 1. Counter columns. reaction_count = all reactions (recommend +
--    neutral + avoid); recommend_count = 'recommend' only. Both are
--    the source of truth, maintained by the trigger below.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS reaction_count  int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recommend_count int NOT NULL DEFAULT 0;

-- 2. popularity_score is GENERATED from reviews + reactions, so it can
--    never drift. review_count is added by 20260618000001.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS popularity_score int
  GENERATED ALWAYS AS (review_count + reaction_count) STORED;

-- 3. Trigger function. SECURITY DEFINER for the same reason as
--    apply_review_stats(): there is no RLS UPDATE policy letting a
--    normal user update an arbitrary shop, so an invoker-rights
--    trigger would update zero rows when a user reacts. Running as the
--    table owner bypasses RLS for this controlled aggregate write.
CREATE OR REPLACE FUNCTION apply_reaction_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shops
       SET reaction_count  = reaction_count + 1,
           recommend_count = recommend_count + (NEW.reaction = 'recommend')::int
     WHERE id = NEW.shop_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shops
       SET reaction_count  = GREATEST(0, reaction_count - 1),
           recommend_count = GREATEST(0, recommend_count - (OLD.reaction = 'recommend')::int)
     WHERE id = OLD.shop_id;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.shop_id = OLD.shop_id THEN
      -- reaction type changed on the same shop; total count unchanged
      UPDATE shops
         SET recommend_count = GREATEST(0, recommend_count
               + (NEW.reaction = 'recommend')::int
               - (OLD.reaction = 'recommend')::int)
       WHERE id = NEW.shop_id;
    ELSE
      -- reaction moved to a different shop (rare, but stay correct)
      UPDATE shops
         SET reaction_count  = GREATEST(0, reaction_count - 1),
             recommend_count = GREATEST(0, recommend_count - (OLD.reaction = 'recommend')::int)
       WHERE id = OLD.shop_id;
      UPDATE shops
         SET reaction_count  = reaction_count + 1,
             recommend_count = recommend_count + (NEW.reaction = 'recommend')::int
       WHERE id = NEW.shop_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Only fire on the columns that affect the aggregate.
DROP TRIGGER IF EXISTS shop_reactions_apply_stats ON shop_reactions;
CREATE TRIGGER shop_reactions_apply_stats
  AFTER INSERT OR DELETE OR UPDATE OF reaction, shop_id ON shop_reactions
  FOR EACH ROW EXECUTE FUNCTION apply_reaction_stats();

-- 4. Backfill existing rows from current reaction data.
UPDATE shops s
   SET reaction_count  = agg.total,
       recommend_count = agg.recommends
  FROM (
    SELECT shop_id,
           count(*)::int                                         AS total,
           count(*) FILTER (WHERE reaction = 'recommend')::int   AS recommends
      FROM shop_reactions
     GROUP BY shop_id
  ) agg
 WHERE agg.shop_id = s.id;

-- 5. Indexes backing the homepage "Most Popular" / "Highest Recommended" sorts.
CREATE INDEX IF NOT EXISTS shops_popularity_idx      ON shops (popularity_score DESC);
CREATE INDEX IF NOT EXISTS shops_recommend_count_idx ON shops (recommend_count DESC);

-- 6. Mirror the codebase grant convention for the new function.
GRANT EXECUTE ON FUNCTION apply_reaction_stats() TO anon, authenticated, service_role;
