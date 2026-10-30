-- ============================================================
-- Supabase Storage Setup: Bucket 'product-images' & RLS Policies
-- Jalankan seluruh skrip ini di Dashboard Supabase > SQL Editor
-- ============================================================

-- 1. Buat bucket 'product-images' jika belum ada & set sebagai public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Pastikan RLS aktif pada tabel storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy 1: Izinkan semua orang (publik) melihat foto produk
DROP POLICY IF EXISTS "Public Read Images" ON storage.objects;
CREATE POLICY "Public Read Images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- 4. Policy 2: Izinkan pengguna terautentikasi (authenticated) untuk mengunggah foto
DROP POLICY IF EXISTS "Authenticated Upload Images" ON storage.objects;
CREATE POLICY "Authenticated Upload Images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Policy 3: Izinkan pengguna terautentikasi untuk memperbarui foto mereka
DROP POLICY IF EXISTS "Authenticated Update Images" ON storage.objects;
CREATE POLICY "Authenticated Update Images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 6. Policy 4: Izinkan pengguna terautentikasi untuk menghapus foto
DROP POLICY IF EXISTS "Authenticated Delete Images" ON storage.objects;
CREATE POLICY "Authenticated Delete Images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);
