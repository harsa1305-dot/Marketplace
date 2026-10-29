// src/app/(main)/orders/page.tsx — Halaman Daftar Pesanan (Obsidian Dark Mode)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Menunggu',    color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30' },
  processing: { label: 'Diproses',   color: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  shipped:    { label: 'Dikirim',    color: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' },
  completed:  { label: 'Selesai',    color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' },
  cancelled:  { label: 'Dibatalkan', color: 'bg-red-500/10 text-red-400 border border-red-500/30' },
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params   = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/orders')

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: number } | null; error: unknown }

  if (!profile) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, created_at, payment_method,
      stores ( name ),
      order_items ( quantity, price, products(name, image) )
    `)
    .eq('buyer_id', profile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-white">📦 Pesanan Saya</h1>

      {params.success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm">
          ✅ Pesanan COD berhasil dibuat! Penjual akan segera memproses dan mengantarkan paket Anda.
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 bg-[#1E1E1E] border border-[#2E2E2E] rounded-3xl p-8 shadow-sm">
          <p className="text-6xl mb-4">📭</p>
          <p className="text-lg font-bold text-white">Belum ada pesanan</p>
          <p className="text-sm text-neutral-400 mt-1 mb-6">Mulai belanja dan nikmati pembayaran aman Cash On Delivery!</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 hover:bg-blue-700 transition active:scale-95">
            Mulai Belanja →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as any[]).map((order: any) => {
            const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-neutral-800 text-neutral-300 border border-neutral-700' }
            return (
              <div key={order.id} className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 shadow-sm hover:border-blue-500/30 transition">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-neutral-400 font-medium">
                      Order #{order.id} · {new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">🏪 {order.stores?.name ?? 'Toko'}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2 border-t border-[#2E2E2E] pt-3">
                  {order.order_items?.slice(0, 2).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#121212] border border-[#2E2E2E] overflow-hidden flex-shrink-0">
                        {item.products?.image
                          ? <img src={item.products.image} alt="" className="w-full h-full object-cover" />
                          : <span className="flex items-center justify-center h-full text-sm">📦</span>}
                      </div>
                      <p className="text-sm text-neutral-200 flex-1 truncate">
                        {item.products?.name} <span className="text-neutral-400 font-semibold">×{item.quantity}</span>
                      </p>
                    </div>
                  ))}
                  {order.order_items?.length > 2 && (
                    <p className="text-xs text-neutral-400">+{order.order_items.length - 2} produk lainnya</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#2E2E2E]">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-400 tracking-wider uppercase">
                      Bayar di Tempat ({order.payment_method?.toUpperCase() || 'COD'})
                    </p>
                    <p className="font-extrabold text-blue-400 text-base">
                      Rp {Number(order.total_price).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-xs bg-[#121212] hover:bg-blue-500/10 text-blue-400 border border-[#2E2E2E] hover:border-blue-500/40 font-semibold px-4 py-2 rounded-xl transition inline-flex items-center gap-1"
                  >
                    Lihat Detail →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
