-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Storage Buckets for Zait & Filters
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create storage buckets (if they don't already exist)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', TRUE, FALSE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']),
  ('payment-screenshots', 'payment-screenshots', TRUE, FALSE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('promo-images', 'promo-images', TRUE, FALSE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public SELECT (reading) on all buckets — anyone can view images
CREATE POLICY "Public SELECT - product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Public SELECT - payment-screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Public SELECT - promo-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'promo-images');

-- 3. INSERT policies
--    The server-side API (/api/upload and /api/admin/migrate-images) uses the
--    service role key so it bypasses RLS entirely. These row-level policies
--    are a safety net for direct client-side usage.

-- 3a. payment-screenshots — any authenticated OR anonymous user can upload
--     (needed for guest checkout where the user may not be logged in)
CREATE POLICY "Public INSERT - payment-screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-screenshots');

-- 3b. product-images — only admins can upload directly via the server API
--     (no public or authenticated INSERT policy — relies on service role key)
--     No INSERT policy needed; only the server API with service role can upload.

-- 3c. promo-images — same as product-images, admins only via server API
--     No INSERT policy needed.

-- 4. Allow owners to UPDATE/DELETE their own objects
CREATE POLICY "Owner UPDATE - product-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

CREATE POLICY "Owner DELETE - product-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

CREATE POLICY "Owner UPDATE - promo-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'promo-images' AND auth.uid() = owner);

CREATE POLICY "Owner DELETE - promo-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'promo-images' AND auth.uid() = owner);

CREATE POLICY "Owner UPDATE - payment-screenshots"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'payment-screenshots' AND auth.uid() = owner);

CREATE POLICY "Owner DELETE - payment-screenshots"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'payment-screenshots' AND auth.uid() = owner);
