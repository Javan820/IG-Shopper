-- ============================================================
-- user_follows
-- ============================================================
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('new_review', 'new_follower', 'review_reaction')),
  title      text NOT NULL,
  body       text,
  url        text,
  actor_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ============================================================
-- push_subscriptions  (one row per browser/device)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- notification_preferences  (one row per user; insert on first save)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id         uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  new_review      boolean NOT NULL DEFAULT true,
  new_follower    boolean NOT NULL DEFAULT true,
  review_reaction boolean NOT NULL DEFAULT true
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE user_follows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- user_follows: anyone can read; only you can follow/unfollow as yourself
DROP POLICY IF EXISTS "Public read user_follows"       ON user_follows;
DROP POLICY IF EXISTS "Authenticated follow"           ON user_follows;
DROP POLICY IF EXISTS "Authenticated unfollow"         ON user_follows;

CREATE POLICY "Public read user_follows"
  ON user_follows FOR SELECT USING (true);

CREATE POLICY "Authenticated follow"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Authenticated unfollow"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- notifications: only the recipient can read/update their own
DROP POLICY IF EXISTS "Own notifications select" ON notifications;
DROP POLICY IF EXISTS "Own notifications update" ON notifications;
DROP POLICY IF EXISTS "Service insert notifications" ON notifications;

CREATE POLICY "Own notifications select"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Own notifications update"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- push_subscriptions: users manage only their own
DROP POLICY IF EXISTS "Own push subscriptions" ON push_subscriptions;

CREATE POLICY "Own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- notification_preferences: users manage only their own
DROP POLICY IF EXISTS "Own notification prefs" ON notification_preferences;

CREATE POLICY "Own notification prefs"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, DELETE ON user_follows           TO authenticated;
GRANT SELECT                 ON user_follows           TO anon;

GRANT SELECT, INSERT, UPDATE ON notifications          TO authenticated;
GRANT SELECT, INSERT, DELETE ON push_subscriptions     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
