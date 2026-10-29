// src/app/(main)/store/orders/page.tsx — Halaman Kelola Pesanan Masuk Toko
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SellerOrderManager from './SellerOrderManager'

export default async function SellerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/store/orders')

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: number } | null; error: unknown }

  if (!profile) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (!store) redirect('/store')

  // Ambil semua pesanan masuk untuk toko ini
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, shipping_address, notes, payment_method, created_at,
      buyer:buyer_id ( id, name, phone ),
      order_items (
        id, quantity, price,
        products ( id, name, image )
      )
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/store" className="text-neutral-400 hover:text-blue-400 transition-colors text-sm">
          ← Dashboard Toko
        </Link>
        <span className="text-neutral-600">/</span>
        <h1 className="text-xl font-bold text-neutral-100">Pesanan Masuk ({store.name})</h1>
      </div>

      <SellerOrderManager initialOrders={(orders as any[]) ?? []} />
    </div>
  )
}

