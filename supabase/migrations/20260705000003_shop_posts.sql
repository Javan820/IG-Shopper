-- ============================================================
-- shop_posts — latest Instagram posts per shop, shown as a
-- story-style deck on the shop profile page.
--
-- Media is REHOSTED: the worker downloads each post's thumbnail
-- (IG CDN URLs are signed and expire within days, and hotlinking
-- them would leak visitors' IPs to Meta) and uploads it to the
-- `shop-posts` storage bucket. Only Supabase Storage URLs are
-- ever stored here. Reels are represented by their cover frame
-- (is_video = true → play overlay in the UI); the card links out
-- to the real post on instagram.com.
--
-- Writes happen exclusively through the worker's service role —
-- there are deliberately NO client INSERT/UPDATE/DELETE policies
-- and no write grants.
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shortcode   text NOT NULL,
  caption     text,
  is_video    boolean NOT NULL DEFAULT false,
  media_url   text NOT NULL,
  taken_at    timestamptz,
  position    int NOT NULL DEFAULT 0,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, shortcode)
);

CREATE INDEX IF NOT EXISTS idx_shop_posts_shop ON shop_posts (shop_id, position);

ALTER TABLE shop_posts ENABLE ROW LEVEL SECURITY;

-- Posts are public only while their shop is publicly visible.
CREATE POLICY "shop_posts: public read for live shops"
  ON shop_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shops s
      WHERE s.id = shop_id AND s.status = 'approved' AND s.is_active
    )
  );

-- Migration 20260523000001 granted ALL on pre-existing tables only;
-- new tables need explicit grants. Clients are read-only here.
GRANT SELECT ON shop_posts TO anon, authenticated;
GRANT ALL ON shop_posts TO service_role;

-- Storage bucket for rehosted post thumbnails / reel covers.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-posts',
  'shop-posts',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read; no INSERT/UPDATE/DELETE policies → only the worker's
-- service role can write to the bucket.
CREATE POLICY "Shop post media publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-posts');
