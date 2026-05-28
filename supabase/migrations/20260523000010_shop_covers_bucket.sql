INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-covers',
  'shop-covers',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Shop covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-covers');
