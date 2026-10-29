// src/app/(main)/cart/page.tsx — Halaman Keranjang (Obsidian Dark Mode)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CartList from './CartList'

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/cart')

  // Ambil profile user dari tabel users
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: number } | null; error: unknown }

  if (!profile) redirect('/login')

  // Ambil isi keranjang dengan detail produk
  const { data: cartItems } = await supabase
    .from('cart')
    .select(`
      id, quantity,
      products ( id, name, price, image, stock, is_active,
        stores ( id, name )
      )
    `)
    .eq('user_id', profile.id)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-white">🛒 Keranjang Belanja</h1>

      {!cartItems || cartItems.length === 0 ? (
        <div className="text-center py-20 bg-[#1E1E1E] border border-[#2E2E2E] rounded-3xl p-8 shadow-sm">
          <p className="text-6xl mb-4">🛒</p>
          <p className="text-lg font-bold text-white">Keranjangmu masih kosong</p>
          <p className="text-sm text-neutral-400 mt-1 mb-6">Yuk temukan produk impianmu dengan sistem COD aman!</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 hover:bg-blue-700 transition active:scale-95">
            Lihat Produk Terbaru →
          </Link>
        </div>
      ) : (
        <CartList cartItems={cartItems as any[]} userId={profile.id} />
      )}
    </div>
  )
}
