'use client'
// src/app/(main)/products/[id]/AddToCartButton.tsx — Tombol Beli & Keranjang dengan Realtime Stock
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  productId: number
  isLoggedIn: boolean
  maxStock: number
}

export default function AddToCartButton({ productId, isLoggedIn, maxStock }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [stock, setStock] = useState<number>(maxStock)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Sinkronisasi jika initial prop berubah
  useEffect(() => {
    setStock(maxStock)
  }, [maxStock])

  // Listener Supabase Realtime: Sisa stok terbarui secara langsung tanpa refresh!
  useEffect(() => {
    const channel = supabase
      .channel(`live-stock-${productId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`,
        },
        (payload) => {
          if (typeof payload.new?.stock === 'number') {
            setStock(payload.new.stock)
            // Sesuaikan qty jika stok berkurang di bawah qty yang dipilih
            setQty((prev) => (payload.new.stock > 0 ? Math.min(prev, payload.new.stock) : 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [productId, supabase])

  async function handleAddToCart() {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/products/${productId}`)
      return
    }

    if (stock <= 0) {
      setErrorMsg('Maaf, produk ini baru saja habis (Sold Out).')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Ambil user_id dari tabel users berdasarkan auth_id
    const { data: profile } = (await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()) as { data: { id: number } | null; error: unknown }

    if (!profile) {
      setLoading(false)
      return
    }

    // Upsert ke cart
    const { error: cartErr } = await supabase.from('cart').upsert(
      { user_id: profile.id, product_id: productId, quantity: qty },
      { onConflict: 'user_id,product_id' }
    )

    if (cartErr) {
      setErrorMsg('Gagal menambahkan ke keranjang: ' + cartErr.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }

  // Tampilan jika produk SOLD OUT (Stok Habis = 0)
  if (stock <= 0) {
    return (
      <div className="space-y-3 pt-2">
        <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-2xl text-center space-y-1">
          <p className="text-rose-400 font-bold text-sm flex items-center justify-center gap-1.5">
            <span className="text-base">🚫</span>
            <span>Produk telah Sold Out / Stok Habis</span>
          </p>
          <p className="text-xs text-rose-400/80">
            Produk ini tidak dapat dibeli saat ini. Tombol akan aktif kembali secara live saat penjual melakukan restock.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled
            className="flex-1 bg-[#1E1E1E] text-neutral-500 font-semibold py-3 rounded-xl transition-colors text-sm cursor-not-allowed border border-[#2E2E2E]"
          >
            🛒 Tambah ke Keranjang
          </button>
          <button
            type="button"
            disabled
            className="flex-1 bg-[#1E1E1E] text-neutral-500 font-semibold py-3 rounded-xl transition-colors text-sm cursor-not-allowed border border-[#2E2E2E]"
          >
            Sold Out
          </button>
        </div>
      </div>
    )
  }

  // Tampilan jika stok TERSEDIA (> 0)
  return (
    <div className="space-y-3 pt-2">
      {/* Live stock badge */}
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-800/40">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Tersedia: {stock} item (Realtime)
        </span>
        <span className="text-neutral-400 text-[11px]">Batas max: {stock} unit</span>
      </div>

      {/* Quantity selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-300 font-medium">Jumlah:</span>
        <div className="flex items-center border border-[#2E2E2E] rounded-lg overflow-hidden bg-[#1E1E1E] shadow-sm">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-1.5 text-neutral-300 hover:bg-[#2E2E2E] transition-colors font-bold"
          >
            −
          </button>
          <span className="px-4 py-1.5 text-sm font-semibold min-w-[2.5rem] text-center text-neutral-100">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(stock, q + 1))}
            className="px-3 py-1.5 text-neutral-300 hover:bg-[#2E2E2E] transition-colors font-bold"
          >
            +
          </button>
        </div>
      </div>

      {errorMsg && <p className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/40">{errorMsg}</p>}

      {/* Tombol aksi */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={loading}
          className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50"
        >
          {loading ? '⏳ Memproses...' : done ? '✅ Ditambahkan!' : '🛒 Tambah ke Keranjang'}
        </button>
        <button
          type="button"
          onClick={async () => {
            await handleAddToCart()
            if (!loading) router.push('/cart')
          }}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-md shadow-blue-600/20"
        >
          Beli Sekarang
        </button>
      </div>
    </div>
  )
}
