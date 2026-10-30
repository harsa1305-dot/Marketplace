-- ==============================================================================
-- COD-In / COD-In Migration: Fix Checkout Stock Trigger & Increase Storage to 100MB
-- Jalankan skrip ini langsung di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zwnphrmqpxdyfdrjlnyt/sql
-- ==============================================================================

-- 1. Konfigurasi Bucket 'product-images' (Ukuran maksimal 100MB & MIME Types Gambar)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  104857600, -- 100MB dalam bytes (100 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];

-- 2. Pastikan Storage RLS Objects Mengizinkan Upload dan Baca Gambar
DROP POLICY IF EXISTS "Allow authenticated uploads to product-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow authenticated update to product-images" ON storage.objects;
CREATE POLICY "Allow authenticated update to product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Allow public read product-images" ON storage.objects;
CREATE POLICY "Allow public read product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 3. Policy RLS Membaca Data Produk Aktif untuk Semua User & Buyer
DROP POLICY IF EXISTS "Allow public read active products" ON public.products;
CREATE POLICY "Allow public read active products" 
ON public.products FOR SELECT 
USING (true);

-- 4. Perbaikan Trigger Pemotong Stok: Gunakan SECURITY DEFINER
-- Mengatasi error: "Produk tidak ditemukan." saat Buyer melakukan checkout.
-- Dengan SECURITY DEFINER, fungsi berjalan dengan hak istimewa owner sehingga
-- PostgreSQL mengizinkan penguncian row (FOR UPDATE) dan pemotongan stok produk lintas user/toko.
CREATE OR REPLACE FUNCTION public.decrease_product_stock_on_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INT;
BEGIN
  -- Kunci baris produk untuk transaksi atomik
  SELECT stock INTO current_stock 
  FROM public.products 
  WHERE id = NEW.product_id 
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Produk tidak ditemukan.';
  END IF;

  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Stok produk tidak mencukupi (Tersisa: %, Diminta: %)', current_stock, NEW.quantity;
  END IF;

  -- Potong stok produk
  UPDATE public.products
  SET stock = stock - NEW.quantity,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrease_product_stock ON public.order_items;
CREATE TRIGGER trg_decrease_product_stock
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.decrease_product_stock_on_order();

-- 5. Sinkronisasi Stok Pesanan (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_order_status_stock_sync()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Kasus 1: Pesanan dibatalkan -> kembalikan stok
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      UPDATE public.products
      SET stock = stock + item.quantity,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  -- Kasus 2: Pesanan batal diaktifkan kembali -> potong stok lagi
  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      UPDATE public.products
      SET stock = GREATEST(0, stock - item.quantity),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_order_status_stock_sync ON public.orders;
CREATE TRIGGER trg_handle_order_status_stock_sync
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_stock_sync();

