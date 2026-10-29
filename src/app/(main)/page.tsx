"use client";

import { useState, useMemo, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/client";

export default function HomePage({
  rawCategories: initialCategories = [],
  rawProducts: initialProducts = [],
}: any) {
  const [rawCategories, setRawCategories] = useState<any[]>(initialCategories);
  const [rawProducts, setRawProducts] = useState<any[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isLoading, setIsLoading] = useState(
    initialCategories.length === 0 && initialProducts.length === 0
  );

  useEffect(() => {
    // Jika data awal sudah ada (misal dari SSR atau props), pakai langsung
    if (initialProducts.length > 0 || initialCategories.length > 0) {
      setRawProducts(initialProducts);
      setRawCategories(initialCategories);
      setIsLoading(false);
      return;
    }

    // Ambil data langsung dari Supabase saat render di client
    const supabase = createClient();
    async function loadData() {
      try {
        setIsLoading(true);

        // 1. Ambil Kategori dari Supabase
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");

        if (cats && cats.length > 0) {
          setRawCategories(cats);
        }

        // 2. Ambil Produk Aktif dari Supabase
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, image, stock, store_id, category_id, categories(id, name), stores(name)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (prods && prods.length > 0) {
          const formatted = prods.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            category: p.categories?.name || "Umum",
            image_url: p.image || "",
            store_id: String(p.store_id || ""),
          }));
          setRawProducts(formatted);
        }
      } catch (err) {
        console.error("Gagal memuat data dari Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [initialCategories, initialProducts]);

  const uniqueCategories = useMemo(() => {
    const categories = rawCategories.map((c: any) => c.name || c);
    return ["Semua", ...Array.from(new Set(categories))];
  }, [rawCategories]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "Semua") return rawProducts;
    return rawProducts.filter((p: any) => p.category === selectedCategory);
  }, [selectedCategory, rawProducts]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Banner Utama */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#0284C7] p-8 sm:p-12 text-white shadow-2xl shadow-blue-950/40 border border-blue-900/40 mb-10">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300 border border-cyan-400/30 backdrop-blur-md">
            <svg className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Marketplace COD Terpercaya
          </span>
          <h1 className="mt-4 text-3xl font-black sm:text-5xl tracking-tight leading-tight">
            Selamat Datang di SkalaShop! 🛍️
          </h1>
          <p className="mt-3 text-sm sm:text-base text-blue-100">
            Temukan barang impian dengan transaksi Cash On Delivery yang aman dan langsung terhubung dengan penjual.
          </p>
        </div>

        {/* Electric Lightning Bolt Vector dengan Neon Glow di sisi kanan */}
        <div className="absolute right-4 -bottom-6 sm:right-12 sm:top-1/2 sm:-translate-y-1/2 pointer-events-none select-none opacity-85 sm:opacity-95">
          <div className="relative flex items-center justify-center">
            {/* Ambient Cyan Glow */}
            <div className="absolute h-40 w-40 sm:h-56 sm:w-56 rounded-full bg-[#38BDF8]/25 blur-3xl animate-pulse" />
            <svg
              className="relative h-32 w-32 sm:h-48 sm:w-48 text-[#38BDF8] drop-shadow-[0_0_25px_rgba(56,189,248,0.85)] filter"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="#38BDF8"
              strokeWidth="0.5"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>

        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </section>

      {/* Kategori Produk */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4">Kategori Produk</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {uniqueCategories.map((cat: any, index: number) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={index}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400"
                    : "border border-[#2E2E2E] bg-[#1E1E1E] text-neutral-400 hover:border-neutral-700 hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Produk Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Produk Terbaru</h2>
          <span className="text-xs text-neutral-400">
            Menampilkan {filteredProducts.length} produk
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-[#1E1E1E] border border-[#2E2E2E]"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-[#2E2E2E] bg-[#1E1E1E] p-12 text-center text-neutral-400">
            Belum ada produk yang tersedia di kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
