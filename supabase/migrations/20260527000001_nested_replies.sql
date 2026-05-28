-- Add parent_reply_id to thread_replies to support nested/threaded replies.
-- ON DELETE SET NULL: orphaned children bubble up to root level when parent is deleted.
ALTER TABLE thread_replies
  ADD COLUMN IF NOT EXISTS parent_reply_id uuid REFERENCES thread_replies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_thread_replies_parent
  ON thread_replies (parent_reply_id)
  WHERE parent_reply_id IS NOT NULL;
