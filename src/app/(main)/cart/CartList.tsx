'use client'
// src/app/(main)/cart/CartList.tsx — Daftar Item Keranjang (Obsidian Dark Mode)
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CartItem {
  id: number
  quantity: number
  products: {
    id: number
    name: string
    price: number
    image: string | null
    stock: number
    is_active: boolean
    stores: { id: number; name: string }
  }
}

interface Props {
  cartItems: CartItem[]
  userId: number
}

export default function CartList({ cartItems, userId }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [items,   setItems]   = useState<CartItem[]>(cartItems)
  const [loading, setLoading] = useState<number | null>(null)

  const total = items.reduce((sum, item) => sum + item.products.price * item.quantity, 0)

  async function updateQty(productId: number, qty: number) {
    if (qty < 1) return
    setLoading(productId)
    await supabase.from('cart')
      .update({ quantity: qty })
      .eq('user_id', userId)
      .eq('product_id', productId)
    setItems(prev => prev.map(i => i.products.id === productId ? { ...i, quantity: qty } : i))
    setLoading(null)
  }

  async function removeItem(productId: number) {
    setLoading(productId)
    await supabase.from('cart')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
    setItems(prev => prev.filter(i => i.products.id !== productId))
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Daftar item */}
      {items.map(item => (
        <div key={item.id} className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-4 flex gap-4 items-start shadow-sm hover:border-blue-500/30 transition">
          {/* Gambar */}
          <div className="w-20 h-20 rounded-xl bg-[#121212] border border-[#2E2E2E] flex-shrink-0 overflow-hidden">
            {item.products.image
              ? <img src={item.products.image} alt={item.products.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            }
          </div>

          {/* Detail */}
          <div className="flex-1 min-w-0">
            <Link href={`/products/${item.products.id}`}
              className="font-semibold text-white hover:text-blue-400 transition-colors text-sm line-clamp-2">
              {item.products.name}
            </Link>
            <p className="text-xs text-neutral-400 mt-0.5">🏪 {item.products.stores.name}</p>
            <p className="text-blue-400 font-extrabold text-sm mt-1">
              Rp {item.products.price.toLocaleString('id-ID')}
            </p>

            {/* Qty control */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => updateQty(item.products.id, item.quantity - 1)}
                disabled={loading === item.products.id || item.quantity <= 1}
                className="w-7 h-7 rounded-lg border border-[#2E2E2E] bg-[#121212] flex items-center justify-center text-neutral-300 hover:text-white hover:border-blue-500/50 disabled:opacity-30 transition">
                −
              </button>
              <span className="text-sm font-bold text-white w-6 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.products.id, item.quantity + 1)}
                disabled={loading === item.products.id || item.quantity >= item.products.stock}
                className="w-7 h-7 rounded-lg border border-[#2E2E2E] bg-[#121212] flex items-center justify-center text-neutral-300 hover:text-white hover:border-blue-500/50 disabled:opacity-30 transition">
                +
              </button>
              <button
                onClick={() => removeItem(item.products.id)}
                disabled={loading === item.products.id}
                className="ml-3 text-xs text-neutral-400 hover:text-red-400 transition-colors">
                Hapus
              </button>
            </div>
          </div>

          {/* Subtotal */}
          <div className="text-right flex-shrink-0">
            <p className="font-extrabold text-white text-sm">
              Rp {(item.products.price * item.quantity).toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex justify-between text-sm text-neutral-400">
          <span>Subtotal ({items.length} produk)</span>
          <span className="font-semibold text-white">Rp {total.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between font-extrabold text-white text-base border-t border-[#2E2E2E] pt-3">
          <span>Total Tagihan (COD)</span>
          <span className="text-blue-400 text-lg">Rp {total.toLocaleString('id-ID')}</span>
        </div>
        <Link href="/checkout"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/20 active:scale-[0.99] text-sm">
          Lanjut ke Checkout COD →
        </Link>
      </div>
    </div>
  )
}
