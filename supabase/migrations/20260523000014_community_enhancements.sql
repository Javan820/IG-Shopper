-- ============================================================
-- Fix trigger functions: add SECURITY DEFINER so they can
-- UPDATE threads.like_count / reply_count regardless of the
-- calling role's permissions or RLS policies.
-- ============================================================
CREATE OR REPLACE FUNCTION update_thread_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE threads SET like_count = like_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE threads SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE threads SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Emoji reactions on threads
-- ============================================================
CREATE TABLE IF NOT EXISTS thread_reactions (
  thread_id  uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id, emoji),
  CONSTRAINT thread_reactions_emoji_check
    CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢'))
);

CREATE INDEX IF NOT EXISTS idx_thread_reactions_thread ON thread_reactions (thread_id);

-- ============================================================
-- Emoji reactions on thread replies
-- ============================================================
CREATE TABLE IF NOT EXISTS thread_reply_reactions (
  reply_id   uuid NOT NULL REFERENCES thread_replies(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reply_id, user_id, emoji),
  CONSTRAINT thread_reply_reactions_emoji_check
    CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢'))
);

CREATE INDEX IF NOT EXISTS idx_thread_reply_reactions_reply ON thread_reply_reactions (reply_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE thread_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_reply_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read thread_reactions"       ON thread_reactions;
DROP POLICY IF EXISTS "Own thread_reactions"               ON thread_reactions;
DROP POLICY IF EXISTS "Public read thread_reply_reactions" ON thread_reply_reactions;
DROP POLICY IF EXISTS "Own thread_reply_reactions"         ON thread_reply_reactions;

CREATE POLICY "Public read thread_reactions"
  ON thread_reactions FOR SELECT USING (true);

CREATE POLICY "Own thread_reactions"
  ON thread_reactions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read thread_reply_reactions"
  ON thread_reply_reactions FOR SELECT USING (true);

CREATE POLICY "Own thread_reply_reactions"
  ON thread_reply_reactions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT, INSERT, DELETE ON thread_reactions       TO authenticated;
GRANT SELECT                 ON thread_reactions       TO anon;

GRANT SELECT, INSERT, DELETE ON thread_reply_reactions TO authenticated;
GRANT SELECT                 ON thread_reply_reactions TO anon;
