'use client'
// src/app/(main)/store/orders/SellerOrderManager.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface OrderItem {
  id: number
  quantity: number
  price: number
  products: {
    id: number
    name: string
    image: string | null
  } | null
}

interface Order {
  id: number
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
  total_price: number
  shipping_address: string
  notes: string | null
  payment_method: string
  created_at: string
  buyer: {
    id: number
    name: string
    phone: string
  } | null
  order_items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-950/40 text-amber-400 border-amber-800/40' },
  processing: { label: 'Diproses', color: 'bg-blue-950/40 text-blue-400 border-blue-800/40' },
  shipped: { label: 'Dikirim', color: 'bg-purple-950/40 text-purple-400 border-purple-800/40' },
  completed: { label: 'Selesai', color: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' },
  cancelled: { label: 'Dibatalkan', color: 'bg-rose-950/40 text-rose-400 border-rose-800/40' },
}

/**
 * Masking nomor telepon pembeli demi menjaga privasi (cth: 0812****789)
 */
function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '-'
  const cleaned = phone.trim()
  if (cleaned.length <= 6) return cleaned.slice(0, 2) + '****' + cleaned.slice(-2)
  return cleaned.slice(0, 4) + '****' + cleaned.slice(-3)
}

export default function SellerOrderManager({ initialOrders }: { initialOrders: Order[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filter, setFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const filteredOrders = orders.filter((o) => (filter === 'all' ? true : o.status === filter))

  async function handleStatusChange(orderId: number, newStatus: Order['status']) {
    setUpdatingId(orderId)
    setError(null)
    setSuccessMsg(null)

    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (updateErr) throw updateErr

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )

      if (newStatus === 'cancelled') {
        setSuccessMsg(`Pesanan #${orderId} dibatalkan. Stok produk dikembalikan secara otomatis ke katalog toko.`)
      } else {
        setSuccessMsg(`Status pesanan #${orderId} berhasil diubah menjadi "${newStatus}".`)
      }
      setTimeout(() => setSuccessMsg(null), 4000)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah status pesanan.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'all', label: 'Semua' },
          { key: 'pending', label: 'Menunggu' },
          { key: 'processing', label: 'Diproses' },
          { key: 'shipped', label: 'Dikirim' },
          { key: 'completed', label: 'Selesai' },
          { key: 'cancelled', label: 'Dibatalkan' },
        ].map((tab) => {
          const count =
            tab.key === 'all'
              ? orders.length
              : orders.filter((o) => o.status === tab.key).length

          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filter === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#1E1E1E] text-neutral-300 border border-[#2E2E2E] hover:border-blue-500/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.key ? 'bg-blue-700 text-white' : 'bg-[#2E2E2E] text-neutral-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-950/30 p-3 rounded-xl border border-rose-800/40">{error}</p>}
      {successMsg && <p className="text-xs text-emerald-400 bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/40 flex items-center gap-1.5 font-medium"><span>✅</span><span>{successMsg}</span></p>}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-[#1E1E1E] rounded-2xl border border-[#2E2E2E] text-neutral-400">
          <p className="text-4xl mb-2">📦</p>
          <p className="font-medium text-neutral-200 text-sm">Tidak ada pesanan</p>
          <p className="text-xs mt-1">Belum ada pesanan dengan status ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const st = STATUS_CONFIG[order.status] ?? {
              label: order.status,
              color: 'bg-[#2E2E2E] text-neutral-300',
            }
            const isUpdating = updatingId === order.id

            return (
              <div
                key={order.id}
                className="bg-[#1E1E1E] rounded-2xl border border-[#2E2E2E] p-5 space-y-4"
              >
                {/* Header card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2E2E2E]">
                  <div>
                    <span className="text-xs font-bold text-neutral-100">
                      Pesanan #{order.id}
                    </span>
                    <span className="text-xs text-neutral-400 ml-2">
                      · {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${st.color}`}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Info Pembeli & Alamat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#121212] border border-[#2E2E2E] p-3.5 rounded-xl">
                  <div>
                    <p className="text-neutral-400 mb-0.5">Pembeli:</p>
                    <p className="font-semibold text-neutral-100">{order.buyer?.name ?? 'Pengguna'}</p>
                    {order.buyer?.phone && (
                      <p className="text-neutral-400 mt-1 flex items-center gap-1.5 font-mono text-[11px]">
                        <span>📞 {maskPhoneNumber(order.buyer.phone)}</span>
                        <span className="text-[9px] bg-amber-950/40 text-amber-400 border border-amber-800/40 px-1 py-0.2 rounded font-sans" title="Data nomor pembeli disamarkan demi privasi dan keamanan transaksi COD">
                          🔒 Privasi Dilindungi
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-neutral-400 mb-0.5">Alamat Pengiriman (COD):</p>
                    <p className="text-neutral-200 leading-relaxed whitespace-pre-line">
                      {order.shipping_address}
                    </p>
                    {order.notes && (
                      <p className="text-neutral-400 italic mt-1">Catatan: "{order.notes}"</p>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#2E2E2E] overflow-hidden flex-shrink-0">
                          {item.products?.image ? (
                            <img
                              src={item.products.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="flex items-center justify-center h-full text-base">📦</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-100 truncate">
                            {item.products?.name ?? 'Produk'}
                          </p>
                          <p className="text-neutral-400">
                            {item.quantity} × Rp {Number(item.price).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-neutral-100 flex-shrink-0">
                        Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-[#2E2E2E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-neutral-400 mr-2">Total Pesanan:</span>
                    <span className="font-bold text-blue-400 text-sm">
                      Rp {Number(order.total_price).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Tombol Update Status Cepat */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(order.id, 'processing')}
                          disabled={isUpdating}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {isUpdating ? '⏳...' : '✓ Proses Pesanan'}
                        </button>
                        <button
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          disabled={isUpdating}
                          className="bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Tolak
                        </button>
                      </>
                    )}

                    {order.status === 'processing' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'shipped')}
                        disabled={isUpdating}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {isUpdating ? '⏳...' : '🚚 Kirim Pesanan'}
                      </button>
                    )}

                    {order.status === 'shipped' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'completed')}
                        disabled={isUpdating}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {isUpdating ? '⏳...' : '✓ Selesaikan Pesanan'}
                      </button>
                    )}

                    {/* Manual Dropdown Selector */}
                    <select
                      value={order.status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                      className="border border-[#2E2E2E] rounded-lg text-xs py-1 px-2 text-neutral-200 focus:outline-none focus:border-blue-500 bg-[#121212]"
                    >
                      <option value="pending">Menunggu</option>
                      <option value="processing">Diproses</option>
                      <option value="shipped">Dikirim</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

