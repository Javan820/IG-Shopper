-- ============================================================
-- threads
-- ============================================================
CREATE TABLE IF NOT EXISTS threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  category    text,
  like_count  integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_category   ON threads (category) WHERE category IS NOT NULL;

-- ============================================================
-- thread_likes
-- ============================================================
CREATE TABLE IF NOT EXISTS thread_likes (
  thread_id  uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- ============================================================
-- thread_replies
-- ============================================================
CREATE TABLE IF NOT EXISTS thread_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_replies_thread ON thread_replies (thread_id, created_at);

-- ============================================================
-- Triggers: maintain like_count and reply_count automatically
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_like_count_trigger
  AFTER INSERT OR DELETE ON thread_likes
  FOR EACH ROW EXECUTE FUNCTION update_thread_like_count();

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_reply_count_trigger
  AFTER INSERT OR DELETE ON thread_replies
  FOR EACH ROW EXECUTE FUNCTION update_thread_reply_count();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE threads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_replies ENABLE ROW LEVEL SECURITY;

-- threads
DROP POLICY IF EXISTS "Public read threads"           ON threads;
DROP POLICY IF EXISTS "Authenticated create thread"   ON threads;
DROP POLICY IF EXISTS "Own delete thread"             ON threads;

CREATE POLICY "Public read threads"
  ON threads FOR SELECT USING (true);

CREATE POLICY "Authenticated create thread"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own delete thread"
  ON threads FOR DELETE
  USING (auth.uid() = user_id);

-- thread_likes
DROP POLICY IF EXISTS "Public read thread_likes" ON thread_likes;
DROP POLICY IF EXISTS "Own thread_likes"         ON thread_likes;

CREATE POLICY "Public read thread_likes"
  ON thread_likes FOR SELECT USING (true);

CREATE POLICY "Own thread_likes"
  ON thread_likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- thread_replies
DROP POLICY IF EXISTS "Public read thread_replies"         ON thread_replies;
DROP POLICY IF EXISTS "Authenticated create thread_reply"  ON thread_replies;
DROP POLICY IF EXISTS "Own delete thread_reply"            ON thread_replies;

CREATE POLICY "Public read thread_replies"
  ON thread_replies FOR SELECT USING (true);

CREATE POLICY "Authenticated create thread_reply"
  ON thread_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own delete thread_reply"
  ON thread_replies FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, DELETE ON threads        TO authenticated;
GRANT SELECT                 ON threads        TO anon;

GRANT SELECT, INSERT, DELETE ON thread_likes   TO authenticated;
GRANT SELECT                 ON thread_likes   TO anon;

GRANT SELECT, INSERT, DELETE ON thread_replies TO authenticated;
GRANT SELECT                 ON thread_replies TO anon;
