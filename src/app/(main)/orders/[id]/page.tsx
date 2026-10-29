// src/app/(main)/orders/[id]/page.tsx — Halaman Detail Pesanan (Obsidian Dark Mode)
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

const STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  pending: {
    label: 'Menunggu Konfirmasi',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    desc: 'Pesanan telah dibuat dan sedang menunggu konfirmasi penjual.',
  },
  processing: {
    label: 'Sedang Diproses',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    desc: 'Penjual sedang menyiapkan dan mengemas pesananmu.',
  },
  shipped: {
    label: 'Dalam Pengiriman',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    desc: 'Pesanan sedang dikirim ke alamat tujuan oleh kurir COD.',
  },
  completed: {
    label: 'Selesai',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    desc: 'Pesanan telah berhasil diterima dan transaksi COD selesai.',
  },
  cancelled: {
    label: 'Dibatalkan',
    color: 'bg-red-500/10 text-red-400 border-red-500/30',
    desc: 'Pesanan ini telah dibatalkan dan stok dikembalikan.',
  },
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/orders/${id}`)

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: { id: number } | null; error: unknown }

  if (!profile) redirect('/login')

  // Ambil data order
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, status, total_price, shipping_address, notes, payment_method, created_at,
      store_id,
      stores (
        id, name, logo, address,
        users ( id, name, phone )
      ),
      order_items (
        id, quantity, price, product_id,
        products ( id, name, image, price )
      )
    `)
    .eq('id', Number(id))
    .single()

  if (error || !order) notFound()

  // Keamanan: pastikan buyer atau pemilik toko yang bisa melihat
  const orderData = order as any
  const storeOwnerId = orderData.stores?.users?.id
  const isSeller = storeOwnerId === profile.id

  const { data: orderOwner } = await supabase
    .from('orders')
    .select('buyer_id')
    .eq('id', Number(id))
    .single()

  if (orderOwner?.buyer_id !== profile.id && !isSeller) {
    redirect('/orders')
  }

  const st = STATUS_MAP[orderData.status] ?? {
    label: orderData.status,
    color: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    desc: '',
  }

  const items = (orderData.order_items as any[]) ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/orders"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mb-2 transition"
          >
            ← Kembali ke Pesanan Saya
          </Link>
          <h1 className="text-2xl font-black text-white">Detail Pesanan #{orderData.id}</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Dibuat pada {new Date(orderData.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })} WIB
          </p>
        </div>
        <div>
          <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold border ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Status banner */}
      {st.desc && (
        <div className="bg-[#1E1E1E] border border-blue-500/20 rounded-2xl p-4 text-xs sm:text-sm text-neutral-200 flex items-center gap-3">
          <span className="text-xl">ℹ️</span>
          <span>{st.desc}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: Order items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-white text-base pb-3 border-b border-[#2E2E2E]">
              Daftar Produk ({items.length})
            </h2>

            <div className="divide-y divide-[#2E2E2E] space-y-3">
              {items.map((item: any) => {
                const p = item.products
                return (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl bg-[#121212] border border-[#2E2E2E] overflow-hidden flex-shrink-0">
                        {p?.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="flex items-center justify-center h-full text-2xl">📦</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        {p ? (
                          <Link
                            href={`/products/${p.id}`}
                            className="text-sm font-semibold text-white hover:text-blue-400 line-clamp-1 transition"
                          >
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-neutral-500">Produk tidak lagi tersedia</span>
                        )}
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {item.quantity} × Rp {Number(item.price).toLocaleString('id-ID')}
                        </p>
                        {orderData.status === 'completed' && p && (
                          <Link
                            href={`/products/${p.id}#reviews`}
                            className="text-xs text-blue-400 font-semibold hover:underline inline-block mt-1"
                          >
                            ⭐ Beri Ulasan
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-white">
                        Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="border-t border-[#2E2E2E] mt-4 pt-4 flex justify-between items-center">
              <span className="font-semibold text-neutral-300">Total Pembayaran (COD)</span>
              <span className="text-xl font-black text-blue-400">
                Rp {Number(orderData.total_price).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Right col: Store & Shipping info */}
        <div className="space-y-4">
          {/* Toko */}
          <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
              <span>🏪</span> Informasi Penjual
            </h3>
            <p className="font-semibold text-white text-sm">{orderData.stores?.name ?? 'Toko'}</p>
            {orderData.stores?.address && (
              <p className="text-xs text-neutral-400 mt-1">📍 {orderData.stores.address}</p>
            )}
            {orderData.stores?.users?.phone && (
              <p className="text-xs text-neutral-400 mt-1">📞 {orderData.stores.users.phone}</p>
            )}

            <div className="pt-3 border-t border-[#2E2E2E]">
              <Link
                href={`/store/${orderData.stores?.id}`}
                className="block text-center py-2 px-3 border border-[#2E2E2E] bg-[#121212] hover:border-blue-500/40 rounded-xl text-xs font-semibold text-neutral-200 hover:text-white transition"
              >
                Kunjungi Etalase Toko →
              </Link>
            </div>
          </div>

          {/* Pengiriman & Pembayaran */}
          <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
              <span>🚚</span> Pengiriman &amp; Pembayaran
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-neutral-400 block">Metode Pembayaran</span>
                <span className="font-bold text-emerald-400">
                  💵 {orderData.payment_method?.toUpperCase() || 'COD (BAYAR DI TEMPAT)'}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Alamat Tujuan</span>
                <p className="text-xs text-neutral-200 mt-0.5 whitespace-pre-line leading-relaxed">
                  {orderData.shipping_address}
                </p>
              </div>
              {orderData.notes && (
                <div>
                  <span className="text-xs text-neutral-400 block">Catatan Pembeli</span>
                  <p className="text-xs text-neutral-300 italic mt-0.5 bg-[#121212] border border-[#2E2E2E] p-2.5 rounded-xl">
                    "{orderData.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
