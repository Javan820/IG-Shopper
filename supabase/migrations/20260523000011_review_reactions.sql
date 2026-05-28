-- Discord-style emoji reactions on reviews
CREATE TABLE IF NOT EXISTS review_reactions (
  user_id    UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  review_id  UUID        NOT NULL REFERENCES reviews(id)   ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, review_id, emoji),
  CONSTRAINT emoji_allowed CHECK (emoji = ANY(ARRAY['👍','❤️','🔥','😮','💯','😂']))
);

CREATE INDEX IF NOT EXISTS idx_review_reactions_review ON review_reactions(review_id);

ALTER TABLE review_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read review_reactions"
  ON review_reactions FOR SELECT
  USING (true);

CREATE POLICY "Auth users insert own reactions"
  ON review_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auth users delete own reactions"
  ON review_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
