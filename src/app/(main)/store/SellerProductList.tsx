'use client'
// src/app/(main)/store/SellerProductList.tsx — Manajemen Produk & Fitur Restock Cepat Toko
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface ProductItem {
  id: number
  name: string
  price: number
  stock: number
  is_active: boolean
  image: string | null
}

interface Props {
  initialProducts: ProductItem[]
}

export default function SellerProductList({ initialProducts }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<ProductItem[]>(initialProducts)
  const [restockId, setRestockId] = useState<number | null>(null)
  const [addQty, setAddQty] = useState<number>(10)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ id: number; text: string; error?: boolean } | null>(null)

  async function handleQuickRestock(productId: number, currentStock: number) {
    if (addQty <= 0) return
    setLoadingId(productId)
    setMsg(null)

    const newStock = currentStock + addQty

    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId)

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      )

      setMsg({
        id: productId,
        text: `✅ Berhasil restock! Stok bertambah +${addQty} (Total: ${newStock})`,
      })
      setRestockId(null)
      router.refresh()
    } catch (err: any) {
      setMsg({
        id: productId,
        text: 'Gagal restock: ' + (err?.message || 'Terjadi kesalahan'),
        error: true,
      })
    } finally {
      setLoadingId(null)
    }
  }

  async function handleToggleActive(productId: number, currentStatus: boolean) {
    setLoadingId(productId)

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId)

      if (error) throw error

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p))
      )
      router.refresh()
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {products.length === 0 ? (
        <p className="text-neutral-400 text-sm text-center py-8">
          Belum ada produk di toko ini. Klik <strong>+ Tambah Produk</strong> di atas untuk mulai berjualan!
        </p>
      ) : (
        products.map((p) => {
          const isSoldOut = p.stock <= 0
          const isRestocking = restockId === p.id
          const isLoading = loadingId === p.id

          return (
            <div
              key={p.id}
              className={`p-4 bg-[#121212] border rounded-2xl transition-all ${
                isSoldOut ? 'border-rose-900/60 bg-rose-950/10' : 'border-[#2E2E2E] hover:border-[#3E3E3E]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Detail info produk */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-[#2E2E2E] overflow-hidden flex-shrink-0 relative">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className={`w-full h-full object-cover ${isSoldOut ? 'opacity-70 grayscale-[25%]' : ''}`}
                      />
                    ) : (
                      <span className="flex items-center justify-center h-full text-2xl">📦</span>
                    )}
                    {isSoldOut && (
                      <span className="absolute inset-0 bg-rose-950/80 text-white font-black text-[9px] uppercase flex items-center justify-center text-center px-1">
                        Sold Out
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-100 truncate">{p.name}</p>
                    <p className="text-xs text-blue-400 font-bold mt-0.5">
                      Rp {Number(p.price).toLocaleString('id-ID')}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Status Stok */}
                      {isSoldOut ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/40 text-rose-400 border border-rose-800/40 flex items-center gap-1">
                          <span>🚫</span> Sold Out (Stok 0)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                          Sisa Stok: {p.stock} item
                        </span>
                      )}

                      {/* Status Aktif */}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          p.is_active ? 'bg-blue-950/40 text-blue-400 border border-blue-800/40' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {p.is_active ? 'Katalog Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol aksi */}
                <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                  {/* Tombol Buka Restock */}
                  <button
                    type="button"
                    onClick={() => {
                      setRestockId(isRestocking ? null : p.id)
                      setAddQty(10)
                      setMsg(null)
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1 ${
                      isSoldOut
                        ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-sm animate-pulse'
                        : 'bg-[#1E1E1E] hover:bg-blue-600/10 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    <span>⚡</span>
                    <span>{isRestocking ? 'Tutup' : isSoldOut ? 'Restock Sekarang!' : '+ Tambah Stok'}</span>
                  </button>

                  {/* Toggle Aktif/Nonaktif */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p.id, p.is_active)}
                    disabled={isLoading}
                    className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1.5 rounded-lg border border-[#2E2E2E] bg-[#1E1E1E]"
                    title={p.is_active ? 'Nonaktifkan produk' : 'Aktifkan produk'}
                  >
                    {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>

                  {/* Edit detail */}
                  <Link
                    href={`/store/products/${p.id}/edit`}
                    className="text-xs bg-[#2E2E2E] hover:bg-[#3E3E3E] text-neutral-300 font-medium px-3 py-1.5 rounded-xl transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>

              {/* Panel Quick Restock Form */}
              {isRestocking && (
                <div className="mt-3 pt-3 border-t border-[#2E2E2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E1E1E] p-3 rounded-xl border border-[#2E2E2E]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-neutral-300 font-semibold">Tambah Stok Sebanyak:</span>
                    {[5, 10, 25, 50, 100].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setAddQty(qty)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium ${
                          addQty === qty
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-[#121212] text-neutral-300 border-[#2E2E2E] hover:border-blue-500/50'
                        }`}
                      >
                        +{qty}
                      </button>
                    ))}

                    <div className="flex items-center gap-1 border border-[#2E2E2E] rounded-lg px-2 py-0.5 bg-[#121212]">
                      <span className="text-xs text-neutral-400">Custom:</span>
                      <input
                        type="number"
                        min="1"
                        value={addQty}
                        onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 text-xs font-bold text-neutral-100 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickRestock(p.id, p.stock)}
                      disabled={isLoading}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      {isLoading ? '⏳ Menyimpan...' : `✓ Simpan (+${addQty} Stok)`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockId(null)}
                      className="text-xs text-neutral-400 hover:text-neutral-200 px-2"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback Pesan */}
              {msg && msg.id === p.id && (
                <p
                  className={`text-xs mt-2 p-2 rounded-lg ${
                    msg.error ? 'bg-rose-950/30 text-rose-400 border border-rose-800/40' : 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
                  }`}
                >
                  {msg.text}
                </p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

