-- Add image columns to content tables
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE threads ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE thread_replies ADD COLUMN IF NOT EXISTS image_url text;

-- Grant service_role access to updated columns
GRANT ALL ON TABLE reviews TO service_role;
GRANT ALL ON TABLE threads TO service_role;
GRANT ALL ON TABLE thread_replies TO service_role;

-- ──────────────────────────────────────────────
-- Storage bucket: review-images
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Review images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

CREATE POLICY "Authenticated users can upload review images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own review images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ──────────────────────────────────────────────
-- Storage bucket: thread-images
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thread-images',
  'thread-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Thread images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thread-images');

CREATE POLICY "Authenticated users can upload thread images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'thread-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own thread images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'thread-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
