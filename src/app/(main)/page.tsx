"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { createClient } from "@/lib/supabase/client";

function HomePageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || searchParams.get("q") || "";

  const [rawCategories, setRawCategories] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProducts() {
      try {
        setIsLoading(true);

        // 1. Ambil daftar kategori
        const { data: catsData } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");

        if (catsData && catsData.length > 0) {
          setRawCategories(catsData);
        }

        // 2. Ambil data produk
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        const formatted = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          stock: Number(p.stock) || 0,
          category_id: p.category_id,
          category: p.category || "",
          image_url: p.image || "",
          store_id: String(p.store_id || ""),
        }));

        setRawProducts(formatted);
      } catch (err) {
        console.error("Error fetching products:", err);
        setRawProducts([]);
      } finally {
        setIsLoading(false); // WAJIB! MATIKAN LOADING DALAM KONDISI APA PUN!
      }
    }

    fetchProducts();
  }, []);

  const uniqueCategories = useMemo(() => {
    const categories = rawCategories.map((c: any) => c.name || c);
    return ["Semua", ...Array.from(new Set(categories))];
  }, [rawCategories]);

  const filteredProducts = useMemo(() => {
    let result = rawProducts;
    if (selectedCategory !== "Semua") {
      const selectedCatObj = rawCategories.find(
        (c: any) => (c.name || c) === selectedCategory
      );
      const selectedCatId = selectedCatObj?.id;
      result = result.filter(
        (p: any) =>
          p.category === selectedCategory ||
          (selectedCatId && p.category_id === selectedCatId)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p: any) =>
        p.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedCategory, searchQuery, rawProducts, rawCategories]);

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
            Selamat Datang di COD-In! 🛍️
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

      {/* Produk Grid / Empty State */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Produk Terbaru</h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isLoading ? "Memuat data produk..." : `Menampilkan ${filteredProducts.length} produk`}
            </p>
          </div>

          {/* Search Bar Cepat */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk..."
              className="w-full rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] py-2 pl-10 pr-8 text-xs text-neutral-200 placeholder-neutral-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 1. JIKA isLoading === true: Tampilkan 'Memuat data produk...' */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#2E2E2E] bg-[#1E1E1E] px-6 py-16 text-center shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-3" />
            <p className="text-sm font-medium text-neutral-400">Memuat data produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* 2. JIKA isLoading === false DAN products.length === 0: HAPUS SPINNER & RENDER TEKS SEDERHANA 'Tidak ada produk' */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#2E2E2E] bg-[#1E1E1E] py-16 px-4 text-center shadow-lg">
            <p className="text-xl font-bold text-neutral-200 mb-1">
              Tidak ada produk
            </p>
            <p className="text-xs text-neutral-400 max-w-md">
              {searchQuery
                ? `Tidak ada produk dengan kata kunci "${searchQuery}".`
                : selectedCategory !== "Semua"
                ? `Tidak ada produk dalam kategori "${selectedCategory}".`
                : "Belum ada produk yang dijual saat ini."}
            </p>
            {(selectedCategory !== "Semua" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory("Semua");
                  setSearchQuery("");
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition"
              >
                Lihat Semua Produk
              </button>
            )}
          </div>
        ) : (
          /* 3. JIKA isLoading === false DAN products.length > 0: Render grid produk */
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

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
