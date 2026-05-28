-- Track whether a shop's IG handle is still reachable.
-- Checked automatically on shop page visits via after(); admins notified on first broken detection.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS ig_handle_status text NOT NULL DEFAULT 'unchecked'
    CHECK (ig_handle_status IN ('unchecked', 'active', 'broken')),
  ADD COLUMN IF NOT EXISTS ig_handle_checked_at timestamptz;

-- Extend the notification type constraint to include admin-targeted handle alerts.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('new_review', 'new_follower', 'review_reaction', 'handle_broken'));
