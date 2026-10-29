'use client'
// src/app/(main)/checkout/CheckoutForm.tsx — Form COD Checkout
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CartItem {
  quantity: number
  products: {
    id: number
    price: number
    store_id: number
    stores: { id: number; name: string }
  }
}

interface Props {
  userId: number
  cartItems: CartItem[]
  total: number
  defaultName: string
  defaultPhone: string
}

export default function CheckoutForm({ userId, cartItems, total, defaultName, defaultPhone }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [address,  setAddress]  = useState('')
  const [notes,    setNotes]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Kelompokkan item berdasarkan toko
  const storeGroups = cartItems.reduce((acc: Record<number, CartItem[]>, item) => {
    const storeId = item.products.stores.id
    if (!acc[storeId]) acc[storeId] = []
    acc[storeId].push(item)
    return acc
  }, {})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) { setError('Alamat pengiriman wajib diisi.'); return }

    setLoading(true)
    setError(null)

    try {
      // 0. Validasi ketersediaan stok produk terkini sebelum membuat pesanan
      const productIds = cartItems.map((i) => i.products.id)
      const { data: latestProducts, error: pErr } = await supabase
        .from('products')
        .select('id, name, stock, is_active')
        .in('id', productIds)

      if (pErr) throw new Error('Gagal memeriksa ketersediaan stok produk.')

      for (const item of cartItems) {
        const p = latestProducts?.find((prod: any) => prod.id === item.products.id)
        if (!p || !p.is_active) {
          throw new Error(`Produk "${item.products.id}" sudah tidak aktif atau tidak tersedia.`)
        }
        if (p.stock <= 0) {
          throw new Error(`Maaf, produk "${p.name}" telah Sold Out (Stok Habis). Silakan hapus dari keranjang.`)
        }
        if (p.stock < item.quantity) {
          throw new Error(
            `Stok produk "${p.name}" tidak mencukupi (Tersisa ${p.stock} item, dipesan ${item.quantity} item). Silakan sesuaikan jumlah di keranjang.`
          )
        }
      }

      // Buat order per toko (sesuai alur marketplace)
      for (const [storeIdStr, items] of Object.entries(storeGroups)) {
        const storeId = Number(storeIdStr)
        const storeTotal = items.reduce((s, i) => s + i.products.price * i.quantity, 0)

        // 1. Insert order
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            buyer_id:         userId,
            store_id:         storeId,
            total_price:      storeTotal,
            status:           'pending' as const,
            shipping_address: address,
            payment_method:   'cod',
            notes:            notes || null,
          })
          .select('id')
          .single()

        if (orderErr || !order) throw new Error(orderErr?.message ?? 'Gagal membuat pesanan')

        // 2. Insert order items
        const orderItems = items.map(i => ({
          order_id:   order.id,
          product_id: i.products.id,
          quantity:   i.quantity,
          price:      i.products.price,
        }))
        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
        if (itemsErr) throw new Error(itemsErr.message)
      }

      // 3. Kosongkan keranjang
      await supabase.from('cart').delete().eq('user_id', userId)

      router.push('/orders?success=1')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan, coba lagi.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E1E1E] rounded-xl border border-[#2E2E2E] p-5 space-y-4">
      <h2 className="font-semibold text-neutral-200">Data Pengiriman</h2>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Alamat Pengiriman Lengkap <span className="text-red-500">*</span>
        </label>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Masukkan alamat lengkap termasuk RT/RW, kelurahan, kecamatan, kota, dan kode pos..."
          required
          rows={3}
          className="w-full px-4 py-3 bg-[#121212] border border-[#2E2E2E] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">Catatan (opsional)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="cth: titip di depan pintu"
          className="w-full px-4 py-3 bg-[#121212] border border-[#2E2E2E] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
        />
      </div>

      {/* Metode pembayaran */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-900/30 rounded-full flex items-center justify-center text-xl">💵</div>
          <div>
            <p className="font-medium text-emerald-400 text-sm">Bayar di Tempat (COD)</p>
            <p className="text-xs text-emerald-400/80">Bayar saat barang tiba di tangan kamu</p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-[#2E2E2E] pt-4">
        <div className="flex justify-between font-bold text-neutral-100 text-lg">
          <span>Total Pembayaran</span>
          <span className="text-blue-400">Rp {total.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {error && <p className="text-rose-400 text-sm bg-rose-950/30 border border-rose-800/40 p-3 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-md shadow-blue-600/20"
      >
        {loading ? '⏳ Memproses...' : `✅ Buat Pesanan — Rp ${total.toLocaleString('id-ID')}`}
      </button>
    </form>
  )
}

