-- ============================================================
-- SkalaShop — RLS Policies & Database Setup (100% Idempotent)
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run
-- Skrip ini aman dijalankan berulang-ulang tanpa error
-- ============================================================

-- ── STEP 1: Tambah kolom auth_id ke tabel users ──────────────
-- Menghubungkan Supabase Auth (auth.uid()) dengan tabel users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);


-- ── STEP 2: Enable Row Level Security (RLS) di semua tabel ───
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;


-- ── STEP 3: Policy tabel USERS ───────────────────────────────
DROP POLICY IF EXISTS "users_select_own"  ON public.users;
DROP POLICY IF EXISTS "users_insert_own"  ON public.users;
DROP POLICY IF EXISTS "users_update_own"  ON public.users;
DROP POLICY IF EXISTS "users_public_read" ON public.users;

-- Public bisa membaca info dasar (nama/avatar) untuk ulasan dan profil toko
CREATE POLICY "users_public_read" ON public.users
  FOR SELECT USING (true);

-- User bisa insert profilnya sendiri dengan mencocokkan auth_id
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- User hanya bisa update profil miliknya
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid());


-- ── STEP 4: Policy tabel STORES ──────────────────────────────
DROP POLICY IF EXISTS "stores_public_read"    ON public.stores;
DROP POLICY IF EXISTS "stores_owner_insert"   ON public.stores;
DROP POLICY IF EXISTS "stores_owner_update"   ON public.stores;

CREATE POLICY "stores_public_read" ON public.stores
  FOR SELECT USING (true);

CREATE POLICY "stores_owner_insert" ON public.stores
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "stores_owner_update" ON public.stores
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );


-- ── STEP 5: Policy tabel PRODUCTS ────────────────────────────
DROP POLICY IF EXISTS "products_public_read"     ON public.products;
DROP POLICY IF EXISTS "products_seller_insert"   ON public.products;
DROP POLICY IF EXISTS "products_seller_update"   ON public.products;
DROP POLICY IF EXISTS "products_seller_delete"   ON public.products;
DROP POLICY IF EXISTS "products_seller_read_own" ON public.products;

-- Publik bisa melihat produk yang aktif
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = true);

-- Seller bisa melihat semua produk tokonya (termasuk yang nonaktif)
CREATE POLICY "products_seller_read_own" ON public.products
  FOR SELECT USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Seller bisa insert produk ke tokonya sendiri
CREATE POLICY "products_seller_insert" ON public.products
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Seller bisa update produk tokonya sendiri
CREATE POLICY "products_seller_update" ON public.products
  FOR UPDATE USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Seller bisa menghapus produk tokonya sendiri
CREATE POLICY "products_seller_delete" ON public.products
  FOR DELETE USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );


-- ── STEP 6: Policy & Deduplikasi tabel CATEGORIES ───────────
-- Bersihkan kategori duplikat di DB jika ada
DO $$
BEGIN
  -- Reassign produk ke ID kategori terendah yang namanya sama
  WITH ranked AS (
    SELECT id, name, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id ASC) as rn,
           FIRST_VALUE(id) OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id ASC) as primary_id
    FROM public.categories
  )
  UPDATE public.products p
  SET category_id = r.primary_id
  FROM ranked r
  WHERE p.category_id = r.id AND r.rn > 1;

  -- Hapus duplikat dari tabel categories
  DELETE FROM public.categories
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM public.categories
    GROUP BY LOWER(TRIM(name))
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Lanjutkan jika tabel kosong
END $$;

-- Buat UNIQUE index agar tidak bisa terjadi duplikasi nama kategori lagi di DB
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_idx ON public.categories (LOWER(TRIM(name)));

DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);


-- ── STEP 7: Policy tabel CART ────────────────────────────────
DROP POLICY IF EXISTS "cart_own_all" ON public.cart;

CREATE POLICY "cart_own_all" ON public.cart
  FOR ALL USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  ) WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );


-- ── STEP 8: Policy tabel ORDERS (Privasi & Keamanan COD) ─────
DROP POLICY IF EXISTS "orders_buyer_read"    ON public.orders;
DROP POLICY IF EXISTS "orders_buyer_insert"  ON public.orders;
DROP POLICY IF EXISTS "orders_seller_read"   ON public.orders;
DROP POLICY IF EXISTS "orders_seller_update" ON public.orders;

-- Pembeli hanya bisa melihat dan membuat pesanannya sendiri
CREATE POLICY "orders_buyer_read" ON public.orders
  FOR SELECT USING (
    buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "orders_buyer_insert" ON public.orders
  FOR INSERT WITH CHECK (
    buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Penjual hanya bisa melihat pesanan yang ditujukan ke tokonya
CREATE POLICY "orders_seller_read" ON public.orders
  FOR SELECT USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Penjual hanya bisa mengupdate status pesanan yang masuk ke tokonya
CREATE POLICY "orders_seller_update" ON public.orders
  FOR UPDATE USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );


-- ── STEP 9: Policy tabel ORDER_ITEMS ─────────────────────────
DROP POLICY IF EXISTS "order_items_read"   ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;

CREATE POLICY "order_items_read" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
         OR store_id IN (
           SELECT s.id FROM public.stores s
           JOIN public.users u ON s.user_id = u.id
           WHERE u.auth_id = auth.uid()
         )
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );


-- ── STEP 10: Policy tabel REVIEWS ────────────────────────────
DROP POLICY IF EXISTS "reviews_public_read"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_buyer_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_buyer_update" ON public.reviews;

CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_buyer_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "reviews_buyer_update" ON public.reviews
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );


-- ── STEP 11: Policy tabel CHATS ──────────────────────────────
DROP POLICY IF EXISTS "chats_participant_all" ON public.chats;

CREATE POLICY "chats_participant_all" ON public.chats
  FOR ALL USING (
    buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );


-- ── STEP 12: Policy tabel CHAT_MESSAGES ──────────────────────
DROP POLICY IF EXISTS "chat_messages_participant_all" ON public.chat_messages;

CREATE POLICY "chat_messages_participant_all" ON public.chat_messages
  FOR ALL USING (
    chat_id IN (
      SELECT id FROM public.chats
      WHERE buyer_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
         OR store_id IN (
           SELECT s.id FROM public.stores s
           JOIN public.users u ON s.user_id = u.id
           WHERE u.auth_id = auth.uid()
         )
    )
  );


-- ── STEP 13: Aktifkan Supabase Realtime (chat_messages, chats, orders, products) ──
-- Memastikan tabel masuk ke publikasi supabase_realtime untuk live updates
DO $$
BEGIN
  -- 1. chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  -- 2. chats
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;

  -- 3. orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- 4. products (untuk update sisa stok realtime di layar pembeli)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;

  -- Pasang REPLICA IDENTITY FULL agar payload event Realtime mengirimkan seluruh data baris
  ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
  ALTER TABLE public.chats REPLICA IDENTITY FULL;
  ALTER TABLE public.orders REPLICA IDENTITY FULL;
  ALTER TABLE public.products REPLICA IDENTITY FULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Lanjutkan jika konfigurasi replikasi sudah aktif
END $$;


-- ── STEP 14: Pengurangan Stok Otomatis saat Pesanan Dibuat ─────
-- Trigger otomatis memotong stok produk saat order_items diinsert.
-- Mencegah race condition dengan FOR UPDATE locking.
-- Menggunakan SECURITY DEFINER agar buyer bisa memotong stok produk milik toko lain secara sah.
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


-- ── STEP 15: Pengembalian Stok saat Pesanan Dibatalkan ─────────
-- Jika pesanan berstatus cancelled, kembalikan stok produk.
-- Jika pesanan batal diaktifkan kembali, potong kembali stoknya.
-- Menggunakan SECURITY DEFINER agar sinkronisasi stok berjalan mulus.
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

  -- Kasus 2: Pesanan yang sebelumnya batal diaktifkan kembali -> potong stok lagi
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

DROP TRIGGER IF EXISTS trg_order_status_stock_sync ON public.orders;
CREATE TRIGGER trg_order_status_stock_sync
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_stock_sync();

-- ============================================================
-- SELESAI! Seluruh RLS, deduplikasi, dan realtime sudah siap.
-- ============================================================
