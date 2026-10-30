-- ============================================================
-- COD-In — Reset Database Fresh for Production
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- PERINGATAN: Skrip ini akan mengosongkan seluruh data uji coba!
-- ============================================================

-- ── 1. Kosongkan seluruh data tabel aplikasi (CASCADE) ────────
TRUNCATE TABLE 
  public.chat_messages,
  public.chats,
  public.reviews,
  public.order_items,
  public.orders,
  public.cart,
  public.products,
  public.stores,
  public.users
RESTART IDENTITY CASCADE;

-- ── 2. Bersihkan akun autentikasi dummy dari Supabase Auth ─────
-- Menghapus seluruh user test dari auth.users
DELETE FROM auth.users;

-- ── 3. Bersihkan file gambar dummy dari Supabase Storage ───────
DELETE FROM storage.objects WHERE bucket_id = 'product-images';

-- ── 4. Bersihkan dan Inisialisasi Ulang Kategori Standar ───────
TRUNCATE TABLE public.categories RESTART IDENTITY CASCADE;

INSERT INTO public.categories (name) VALUES
  ('Elektronik'),
  ('Fashion'),
  ('Makanan & Minuman'),
  ('Kecantikan'),
  ('Olahraga'),
  ('Rumah & Dapur'),
  ('Otomotif'),
  ('Buku & Alat Tulis'),
  ('Mainan & Hobi'),
  ('Lainnya');

-- ── 5. Pastikan Indeks Unik Kategori Tetap Aktif ──────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_idx ON public.categories (LOWER(TRIM(name)));

-- ============================================================
-- SELESAI! Database kini 100% FRESH & BERSIH siap digunakan
-- untuk produksi / live hosting resmi COD-In.
-- ============================================================

