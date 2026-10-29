// src/app/(main)/store/page.tsx — Dashboard Toko Seller (Obsidian Dark Mode)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateStoreForm from './CreateStoreForm'
import SellerProductList from './SellerProductList'

export default async function StoreDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/store')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name')
    .eq('auth_id', user.id)
    .single() as { data: { id: number; name: string } | null; error: unknown }

  if (!profile) redirect('/login')

  // Cek apakah sudah punya toko
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, description, logo, address')
    .eq('user_id', profile.id)
    .maybeSingle()

  // Jika belum punya toko, tampilkan form buat toko
  if (!store) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-2xl font-black text-white">🏪 Buka Toko SkalaShop</h1>
        <p className="text-neutral-400 text-sm">Mulai berjualan dengan sistem khusus COD terpercaya — 100% gratis!</p>
        <CreateStoreForm userId={profile.id} />
      </div>
    )
  }

  // Sudah punya toko — tampilkan dashboard
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active, image')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total_price, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const totalRevenue = (orders as any[] ?? [])
    .filter((o: any) => o.status === 'completed')
    .reduce((s: number, o: any) => s + Number(o.total_price), 0)

  const pendingOrders = (orders as any[] ?? []).filter((o: any) => o.status === 'pending').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#2563EB] border border-blue-900/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl overflow-hidden shadow-inner backdrop-blur-md">
            {store.logo ? <img src={store.logo} alt="" className="w-full h-full object-cover" /> : '🏪'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">{store.name}</h1>
            <p className="text-blue-100 text-sm">{store.address ?? 'Belum ada alamat toko'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">📦</p>
          <p className="text-xl font-black text-white">{products?.length ?? 0}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Total Produk</p>
        </div>
        <Link href="/store/orders" className="bg-[#1E1E1E] border border-[#2E2E2E] hover:border-blue-500/50 transition-all rounded-2xl p-4 text-center group">
          <p className="text-2xl mb-1">🔔</p>
          <p className="text-xl font-black text-blue-400 group-hover:scale-105 transition-transform">{pendingOrders}</p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">Pesanan Baru (Kelola →)</p>
        </Link>
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">💰</p>
          <p className="text-xl font-black text-white">Rp {totalRevenue.toLocaleString('id-ID')}</p>
          <p className="text-xs text-neutral-400 mt-0.5">Total Pendapatan</p>
        </div>
      </div>

      {/* Pesanan Masuk Quick Banner */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-white text-sm">Pesanan Masuk Toko</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {pendingOrders > 0
              ? `Terdapat ${pendingOrders} pesanan baru yang menunggu konfirmasi!`
              : 'Semua pesanan pelanggan telah diproses.'}
          </p>
        </div>
        <Link
          href="/store/orders"
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95"
        >
          Kelola Pesanan Masuk →
        </Link>
      </div>

      {/* Produk & Manajemen Restock */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-white">Katalog Produk &amp; Manajemen Stok</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kelola status dan restock jumlah stok produk secara live.
            </p>
          </div>
          <Link
            href="/store/products/new"
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/20 active:scale-95"
          >
            + Tambah Produk
          </Link>
        </div>

        <SellerProductList initialProducts={(products as any[]) ?? []} />
      </div>
    </div>
  )
}
