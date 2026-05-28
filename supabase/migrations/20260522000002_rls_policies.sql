-- ============================================================
-- Migration 002: Row Level Security Policies
-- IG Shop Directory
-- ============================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_claims  ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_shops  ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_flags   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone (including anonymous) can read all profiles
CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT
  USING (true);

-- User can create their own profile (enforced by trigger, but belt-and-suspenders)
CREATE POLICY "profiles: user can insert own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- User can update only their own profile
CREATE POLICY "profiles: user can update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- SHOPS
-- ============================================================

-- Public (anon + auth) can see approved, active shops
CREATE POLICY "shops: public read approved"
  ON shops FOR SELECT
  USING (status = 'approved' AND is_active = true);

-- Authenticated users can see their own submissions regardless of status
CREATE POLICY "shops: auth read own submissions"
  ON shops FOR SELECT
  USING (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

-- Admins can see all shops (any status, any is_active)
CREATE POLICY "shops: admin read all"
  ON shops FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Any authenticated user can submit a new shop (lands in pending)
CREATE POLICY "shops: auth can insert"
  ON shops FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

-- A claimed, verified owner can edit their own shop listing
CREATE POLICY "shops: claimed owner can update"
  ON shops FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    claimed_by = auth.uid() AND
    is_claimed = true
  );

-- Admins can update any shop (approve, reject, edit)
CREATE POLICY "shops: admin can update"
  ON shops FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete shops
CREATE POLICY "shops: admin can delete"
  ON shops FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- REVIEWS
-- ============================================================

-- Anyone can read reviews
CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT
  USING (true);

-- Authenticated users can post a review; shop owners cannot review their own shop
CREATE POLICY "reviews: auth can insert"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = shop_id
        AND shops.claimed_by = auth.uid()
    )
  );

-- Users can edit their own review
CREATE POLICY "reviews: user can update own"
  ON reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own review
CREATE POLICY "reviews: user can delete own"
  ON reviews FOR DELETE
  USING (user_id = auth.uid());

-- Admins can delete any review (moderation)
CREATE POLICY "reviews: admin can delete"
  ON reviews FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SHOP CLAIMS
-- ============================================================

-- Users can view their own claims
CREATE POLICY "shop_claims: user read own"
  ON shop_claims FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all claims
CREATE POLICY "shop_claims: admin read all"
  ON shop_claims FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Any authenticated user can submit a claim
CREATE POLICY "shop_claims: auth can insert"
  ON shop_claims FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Only admins can update claim status (approve / reject)
CREATE POLICY "shop_claims: admin can update"
  ON shop_claims FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SAVED SHOPS
-- ============================================================

-- Users have full access to their own bookmarks only
CREATE POLICY "saved_shops: user full access"
  ON saved_shops FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- REVIEW HELPFUL
-- ============================================================

-- Anyone can read helpful records (used to derive per-user voted state in UI)
CREATE POLICY "review_helpful: public read"
  ON review_helpful FOR SELECT
  USING (true);

-- Authenticated users can mark a review as helpful
CREATE POLICY "review_helpful: auth can insert"
  ON review_helpful FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can un-mark their own helpful vote
CREATE POLICY "review_helpful: user can delete own"
  ON review_helpful FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- REVIEW FLAGS
-- ============================================================

-- Admins can read all flagged reviews
CREATE POLICY "review_flags: admin read all"
  ON review_flags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Any authenticated user can flag a review
CREATE POLICY "review_flags: auth can insert"
  ON review_flags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Admins can update flag status (dismiss / action)
CREATE POLICY "review_flags: admin can update"
  ON review_flags FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
