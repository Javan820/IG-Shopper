-- Allow admins to override any user's displayed tier/badge
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_override text DEFAULT NULL
  CHECK (tier_override IN ('newcomer', 'regular', 'contributor', 'expert', 'legend'));
