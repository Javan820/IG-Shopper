-- ============================================================
-- Security hardening
--
-- 1. Privilege-escalation fix (CRITICAL): migration
--    20260523000001 granted ALL on all tables to authenticated,
--    and the profiles UPDATE policy has no column restriction —
--    so any signed-in user could run
--    `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()`
--    through the REST API and become an admin. Restrict UPDATE
--    to the columns the app actually lets users edit.
--
-- 2. update_profile_review_count() runs with invoker rights, so
--    after the column-level grant it could no longer bump
--    review_count (not in the granted column list). Make it
--    SECURITY DEFINER like the shop_rating_stats /
--    shop_reaction_stats trigger functions.
--
-- 3. notifications INSERT policy was WITH CHECK (true), letting
--    any authenticated user forge in-app notifications for any
--    user. Every legitimate insert goes through the service role
--    (which bypasses RLS), so no client INSERT policy is needed.
--
-- 4. anon never writes anywhere (all writes are Server Actions
--    with an authenticated user or the service role) — make anon
--    read-only outright instead of relying on RLS alone.
-- ============================================================

-- 1. profiles: column-level UPDATE only
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (display_name, bio, avatar_url, display_tier) ON profiles TO authenticated;

-- 2. keep the review-count trigger working under the new grants
CREATE OR REPLACE FUNCTION update_profile_review_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET review_count = review_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET review_count = GREATEST(review_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. notifications: service-role inserts only
DROP POLICY IF EXISTS "Service insert notifications" ON notifications;

-- 4. anon is read-only everywhere
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;
