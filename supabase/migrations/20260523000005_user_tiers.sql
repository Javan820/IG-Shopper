-- Add review_count to profiles for tier computation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count int4 NOT NULL DEFAULT 0;

-- Backfill from existing reviews
UPDATE profiles p
SET review_count = (SELECT COUNT(*) FROM reviews r WHERE r.user_id = p.id);

-- Maintain review_count on review insert / delete
CREATE OR REPLACE FUNCTION update_profile_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET review_count = review_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET review_count = GREATEST(review_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_count
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_profile_review_count();
