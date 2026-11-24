// src/app/api/notify/order/route.ts — Endpoint Server Notifikasi Japri WhatsApp (Penjual & Pembeli) saat Checkout & Update Status Pesanan COD
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

type OrderEventType = 'new_order' | 'status_update'
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'

interface OrderDetailRow {
  id: number
  buyer_id: number
  store_id: number
  total_price: number
  status: OrderStatus
  shipping_address: string
  notes: string | null
  buyer: {
    id: number
    name: string
    phone: string | null
  } | null
  stores: {
    id: number
    name: string
    address: string | null
    user_id: number
  } | null
  order_items: Array<{
    quantity: number
    price: number
    products: {
      name: string
    } | null
  }>
}

const recentOrderNotifs = new Map<string, number>()
const COOLDOWN_MS = 15_000

function cleanupOldEntries(now: number) {
  for (const [key, timestamp] of recentOrderNotifs.entries()) {
    if (now - timestamp > COOLDOWN_MS) {
      recentOrderNotifs.delete(key)
    }
  }
}

function isValidWaPhone(phone?: string | null): phone is string {
  if (!phone) return false
  const digits = phone.replace(/[^0-9]/g, '')
  return digits.length >= 10 && digits.length <= 15 && (digits.startsWith('08') || digits.startsWith('628'))
}

async function sendFonnteDirectMessage(token: string, targetPhone: string, message: string) {
  const digits = targetPhone.replace(/[^0-9]/g, '')
  const formData = new FormData()
  formData.append('target', digits)
  formData.append('countryCode', '62')
  formData.append('message', message)

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
    },
    body: formData,
    signal: AbortSignal.timeout(10000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.status === false) {
    throw new Error(data?.reason || data?.detail || 'Gagal mengirim pesan WhatsApp via Fonnte.')
  }
  return data
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const orderId = Number(body?.orderId)
    const eventType: OrderEventType = body?.eventType === 'status_update' ? 'status_update' : 'new_order'
    const requestedStatus: OrderStatus | undefined = body?.status

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: 'ID pesanan tidak valid.' }, { status: 400 })
    }

    const fonnteToken = process.env.FONNTE_TOKEN?.trim()
    if (!fonnteToken) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'FONNTE_TOKEN belum dikonfigurasi.',
      })
    }

    // 1. Verifikasi user yang login
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = (await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single()) as { data: { id: number } | null; error: unknown }

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profil pengguna tidak ditemukan.' }, { status: 403 })
    }

    // 2. Ambil detail order lengkap via Admin Client setelah autentikasi
    const adminSupabase = await createAdminClient()
    const { data: order, error: orderErr } = (await adminSupabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        store_id,
        total_price,
        status,
        shipping_address,
        notes,
        buyer:users!orders_buyer_id_fkey ( id, name, phone ),
        stores ( id, name, address, user_id ),
        order_items ( quantity, price, products ( name ) )
      `)
      .eq('id', orderId)
      .single()) as { data: OrderDetailRow | null; error: unknown }

    if (orderErr || !order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    // Validasi hak akses: new_order hanya oleh pembeli, status_update hanya oleh pemilik toko
    if (eventType === 'new_order' && order.buyer_id !== profile.id) {
      return NextResponse.json({ success: false, error: 'Tidak memiliki akses ke pesanan ini.' }, { status: 403 })
    }
    if (eventType === 'status_update' && order.stores?.user_id !== profile.id) {
      return NextResponse.json({ success: false, error: 'Hanya pemilik toko yang dapat mengirim update status.' }, { status: 403 })
    }

    const effectiveStatus: OrderStatus = requestedStatus || order.status

    // 3. Guard anti-spam
    const now = Date.now()
    cleanupOldEntries(now)
    const dedupKey = `${order.id}:${eventType}:${effectiveStatus}`
    const lastSentAt = recentOrderNotifs.get(dedupKey)
    if (lastSentAt && now - lastSentAt < COOLDOWN_MS) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Notifikasi pesanan yang sama baru saja dikirim.',
      })
    }

    // Ambil nomor WA pemilik toko
    let sellerPhone: string | null = null
    if (order.stores?.user_id) {
      const { data: sellerUser } = (await adminSupabase
        .from('users')
        .select('phone')
        .eq('id', order.stores.user_id)
        .maybeSingle()) as { data: { phone: string | null } | null; error: unknown }
      sellerPhone = sellerUser?.phone ?? null
    }

    const buyerName = order.buyer?.name || 'Pembeli COD-In'
    const buyerPhone = order.buyer?.phone || null
    const storeName = order.stores?.name || 'Toko COD-In'
    const formattedTotal = `Rp ${Number(order.total_price).toLocaleString('id-ID')}`
    const baseUrl = (process.env.NEXT_PUBLIC_CANONICAL_URL || 'https://codin.web.id').replace(/\/$/, '')

    const itemsSummary =
      order.order_items && order.order_items.length > 0
        ? order.order_items
            .map((item) => `  - ${item.products?.name || 'Produk'} × ${item.quantity}`)
            .join('\n')
        : '  - Produk COD-In'

    const tasks: Promise<unknown>[] = []

    if (eventType === 'new_order') {
      // A. Kirim Japri ke Penjual
      if (isValidWaPhone(sellerPhone)) {
        const sellerMessage = [
          '🔔 *PESANAN COD BARU MASUK!*',
          `Halo *${storeName}*, ada pembeli yang baru saja membuat pesanan COD di tokomu!`,
          '',
          `📋 *Rincian Pesanan #ORD-${order.id}:*`,
          `• *Pembeli:* ${buyerName}${buyerPhone && buyerPhone !== '-' ? ` (${buyerPhone})` : ''}`,
          '• *Barang:*',
          itemsSummary,
          `• *Total:* *${formattedTotal}* (Bayar Cash saat Ketemuan)`,
          `• *Titik Temu COD:* ${order.shipping_address}`,
          order.notes ? `• *Catatan:* _${order.notes}_` : null,
          '',
          '👉 Segera konfirmasi pesanan & hubungi pembeli:',
          `${baseUrl}/store/orders`,
        ]
          .filter((line) => line !== null)
          .join('\n')

        tasks.push(sendFonnteDirectMessage(fonnteToken, sellerPhone, sellerMessage))
      }

      // B. Kirim Japri Bukti Pesanan ke Pembeli
      if (isValidWaPhone(buyerPhone)) {
        const buyerMessage = [
          '🛍️ *PESANAN COD BERHASIL DIBUAT!*',
          `Halo *${buyerName}*, pesananmu di *${storeName}* sudah kami teruskan ke penjual!`,
          '',
          `📋 *Rincian Pesanan #ORD-${order.id}:*`,
          '• *Barang:*',
          itemsSummary,
          `• *Total Bayar:* *${formattedTotal}*`,
          `• *Titik Temu COD:* ${order.shipping_address}`,
          order.notes ? `• *Catatan:* _${order.notes}_` : null,
          '',
          '💡 *Tips Aman COD-In:*',
          `Siapkan *uang pas ${formattedTotal}* saat ketemuan. Tunggu konfirmasi dari penjual sebelum berangkat ke lokasi ya!`,
          '',
          '🔗 Cek status pesananmu di sini:',
          `${baseUrl}/orders/${order.id}`,
        ]
          .filter((line) => line !== null)
          .join('\n')

        tasks.push(sendFonnteDirectMessage(fonnteToken, buyerPhone, buyerMessage))
      }
    } else if (eventType === 'status_update') {
      // Kirim Japri Update Status ke Pembeli
      if (isValidWaPhone(buyerPhone)) {
        let statusHeader = ''
        let statusBody = ''

        if (effectiveStatus === 'processing') {
          statusHeader = '✅ *PESANANMU DISETUJUI PENJUAL!*'
          statusBody = `Penjual dari *${storeName}* telah menyetujui pesananmu (*#ORD-${order.id}*). Penjual sedang menyiapkan barang untuk ketemuan COD.`
        } else if (effectiveStatus === 'shipped') {
          statusHeader = '🛵 *PENJUAL SEDANG MENUJU LOKASI!*'
          statusBody = `Penjual dari *${storeName}* sudah berangkat menuju titik temu (*${order.shipping_address}*) untuk pesanan *#ORD-${order.id}*. Mohon bersiap-siap dan standby di lokasi ya!`
        } else if (effectiveStatus === 'completed') {
          statusHeader = '🎉 *TRANSAKSI COD SELESAI!*'
          statusBody = `Terima kasih sudah berbelanja secara aman di COD-In bersama *${storeName}* (*#ORD-${order.id}*). Jangan lupa berikan ulasan bintang 5 untuk toko ya!`
        } else if (effectiveStatus === 'cancelled') {
          statusHeader = '❌ *PESANAN COD DIBATALKAN*'
          statusBody = `Maaf, pesanan *#ORD-${order.id}* di *${storeName}* telah dibatalkan. Silakan cek detailnya di website COD-In.`
        }

        if (statusHeader) {
          const updateMessage = [
            statusHeader,
            `Halo *${buyerName}*,`,
            statusBody,
            '',
            `📋 *Pesanan #ORD-${order.id}*`,
            '• *Barang:*',
            itemsSummary,
            `• *Total COD:* *${formattedTotal}*`,
            `• *Titik Temu:* ${order.shipping_address}`,
            '',
            '🔗 Lihat detail pesanan:',
            `${baseUrl}/orders/${order.id}`,
          ].join('\n')

          tasks.push(sendFonnteDirectMessage(fonnteToken, buyerPhone, updateMessage))
        }
      }
    }

    if (tasks.length === 0) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Nomor WhatsApp tujuan belum terdaftar atau tidak valid.',
      })
    }

    const results = await Promise.allSettled(tasks)
    const anyFulfilled = results.some((r) => r.status === 'fulfilled')

    if (!anyFulfilled) {
      const firstRejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
      return NextResponse.json({
        success: false,
        reason: firstRejected?.reason?.message || 'Gagal mengirim notifikasi WhatsApp.',
      })
    }

    recentOrderNotifs.set(dedupKey, now)

    return NextResponse.json({
      success: true,
      detail: 'Notifikasi WhatsApp pesanan berhasil dikirim.',
    })
  } catch (err: any) {
    console.error('WhatsApp order notify error:', err)
    return NextResponse.json({
      success: false,
      reason: err?.message || 'Terjadi kesalahan saat mengirim notifikasi pesanan.',
    })
  }
}

