-- Allow users to choose which earned tier badge to display on their profile/reviews.
-- 'admin' is a special style only settable by admin users (enforced in server action).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_tier TEXT
    CHECK (display_tier IN ('newcomer', 'regular', 'contributor', 'expert', 'legend', 'admin'));
