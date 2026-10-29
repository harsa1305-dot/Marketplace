// src/app/(main)/checkout/page.tsx — Halaman Checkout (COD)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheckoutForm from './CheckoutForm'

export default async function CheckoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/checkout')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, phone')
    .eq('auth_id', user.id)
    .single() as { data: { id: number; name: string; phone: string } | null; error: unknown }

  if (!profile) redirect('/login')

  // Ambil isi keranjang
  const { data: cartItems } = await supabase
    .from('cart')
    .select(`
      quantity,
      products ( id, name, price, image, stock, is_active,
        store_id,
        stores ( id, name )
      )
    `)
    .eq('user_id', profile.id)

  if (!cartItems || cartItems.length === 0) redirect('/cart')

  const total = (cartItems as any[]).reduce(
    (sum: number, i: any) => sum + i.products.price * i.quantity, 0
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-100 mb-6">📦 Checkout</h1>

      {/* Ringkasan pesanan */}
      <div className="bg-[#1E1E1E] rounded-xl border border-[#2E2E2E] p-5 mb-4">
        <h2 className="font-semibold text-neutral-200 mb-3">Ringkasan Pesanan</h2>
        <div className="space-y-3">
          {(cartItems as any[]).map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#2E2E2E] flex-shrink-0 overflow-hidden">
                {item.products.image
                  ? <img src={item.products.image} alt="" className="w-full h-full object-cover" />
                  : <span className="flex items-center justify-center h-full text-xl">📦</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-100 truncate">{item.products.name}</p>
                <p className="text-xs text-neutral-400">
                  {item.quantity} × Rp {Number(item.products.price).toLocaleString('id-ID')}
                </p>
              </div>
              <p className="text-sm font-semibold text-neutral-200 flex-shrink-0">
                Rp {(item.products.price * item.quantity).toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-[#2E2E2E] mt-4 pt-3 flex justify-between font-bold text-neutral-100">
          <span>Total</span>
          <span className="text-blue-400">Rp {total.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Form checkout */}
      <CheckoutForm
        userId={profile.id}
        cartItems={cartItems as any[]}
        total={total}
        defaultName={profile.name}
        defaultPhone={profile.phone}
      />
    </div>
  )
}

