CREATE TABLE IF NOT EXISTS shop_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   text        NOT NULL CHECK (reaction IN ('recommend', 'neutral', 'avoid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

ALTER TABLE shop_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shop reactions"
  ON shop_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reaction"
  ON shop_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reaction"
  ON shop_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reaction"
  ON shop_reactions FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_reactions TO authenticated;
GRANT SELECT ON shop_reactions TO anon;
