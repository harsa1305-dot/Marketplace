// src/app/api/notify/whatsapp/route.ts — Endpoint Server Notifikasi Produk Baru & Restok ke Grup WhatsApp via Fonnte
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type EventType = 'new_product' | 'restock'

interface ProductWithRelations {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  image: string | null
  is_active: boolean
  store_id: number
  stores: {
    id: number
    name: string
    address: string | null
    user_id: number
  } | null
  categories: {
    name: string
  } | null
}

// Guard anti-spam sederhana agar tidak mengirim pesan kembar dalam 30 detik
const recentNotifications = new Map<string, number>()
const COOLDOWN_MS = 30_000

function cleanupOldEntries(now: number) {
  for (const [key, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > COOLDOWN_MS) {
      recentNotifications.delete(key)
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const productId = Number(body?.productId)
    const eventType: EventType = body?.eventType === 'restock' ? 'restock' : 'new_product'
    const addedQty = body?.addedQty !== undefined ? Number(body.addedQty) : undefined

    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ success: false, error: 'ID produk tidak valid.' }, { status: 400 })
    }

    const fonnteToken = process.env.FONNTE_TOKEN?.trim()
    const fonnteGroupId = process.env.FONNTE_GROUP_ID?.trim()

    if (!fonnteToken || !fonnteGroupId) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'FONNTE_TOKEN atau FONNTE_GROUP_ID belum dikonfigurasi.',
      })
    }

    // 1. Verifikasi user login
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

    // 2. Ambil data produk & toko langsung dari database dan pastikan milik user ini
    const { data: product, error: prodError } = (await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        stock,
        image,
        is_active,
        store_id,
        stores ( id, name, address, user_id ),
        categories ( name )
      `)
      .eq('id', productId)
      .single()) as { data: ProductWithRelations | null; error: unknown }

    if (prodError || !product) {
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan.' }, { status: 404 })
    }

    if (product.stores?.user_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki akses ke toko produk ini.' },
        { status: 403 }
      )
    }

    if (!product.is_active || Number(product.stock) <= 0) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Notifikasi hanya dikirim untuk produk aktif dengan stok tersedia.',
      })
    }

    // 3. Anti-spam cooldown
    const now = Date.now()
    cleanupOldEntries(now)
    const dedupKey = `${product.id}:${eventType}`
    const lastSentAt = recentNotifications.get(dedupKey)
    if (lastSentAt && now - lastSentAt < COOLDOWN_MS) {
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Notifikasi produk yang sama baru saja dikirim.',
      })
    }

    // 4. Susun pesan WhatsApp (murni COD Direct tanpa istilah kurir)
    const baseUrl = (process.env.NEXT_PUBLIC_CANONICAL_URL || 'https://codin.web.id').replace(/\/$/, '')
    const productUrl = `${baseUrl}/products/${product.id}`
    const formattedPrice = `Rp ${Number(product.price).toLocaleString('id-ID')}`
    const storeName = product.stores?.name || 'Toko COD-In'
    const storeAddress = product.stores?.address?.trim()
    const categoryName = product.categories?.name?.trim()

    const detailLines = [
      `*${product.name}*`,
      `🏪 Toko: ${storeName}`,
      categoryName ? `🏷️ Kategori: ${categoryName}` : null,
      `💰 Harga: *${formattedPrice}*`,
      eventType === 'restock' && Number.isFinite(addedQty) && (addedQty ?? 0) > 0
        ? `📦 Stok Tersedia: ${product.stock} item (+${addedQty} baru masuk)`
        : `📦 Stok Tersedia: ${product.stock} item`,
      storeAddress ? `📍 Lokasi COD: ${storeAddress}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const header =
      eventType === 'restock'
        ? '🔥 *RESTOK LAGI DI COD-IN!*\nBarang yang sempat habis sekarang tersedia kembali:'
        : '🆕 *PRODUK BARU DI COD-IN!*\nAda barang baru yang baru saja diposting nih:'

    const footer =
      eventType === 'restock'
        ? `Yuk cek detailnya & chat penjual untuk ketemuan COD sebelum kehabisan lagi 👇\n${productUrl}`
        : `Yuk cek detailnya & ajak penjual ketemuan COD langsung 👇\n${productUrl}`

    const message = `${header}\n\n${detailLines}\n\n${footer}`

    // 5. Kirim ke Fonnte API menggunakan FormData (teks-only agar aman di paket Free; aktifkan FONNTE_SEND_IMAGE=true jika sudah paket berbayar)
    const formData = new FormData()
    formData.append('target', fonnteGroupId)
    formData.append('message', message)

    if (process.env.FONNTE_SEND_IMAGE === 'true' && product.image) {
      formData.append('url', product.image)
    }

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: fonnteToken,
      },
      body: formData,
      signal: AbortSignal.timeout(10000),
    })

    const fonnteData = await fonnteRes.json().catch(() => ({}))

    if (!fonnteRes.ok || fonnteData?.status === false) {
      console.error('Fonnte API error:', fonnteData)
      return NextResponse.json({
        success: false,
        reason: fonnteData?.reason || fonnteData?.detail || 'Gagal mengirim pesan via Fonnte.',
      })
    }

    recentNotifications.set(dedupKey, now)

    return NextResponse.json({
      success: true,
      detail: fonnteData?.detail || 'Notifikasi WhatsApp berhasil dikirim ke grup.',
    })
  } catch (err: any) {
    console.error('WhatsApp notify error:', err)
    return NextResponse.json({
      success: false,
      reason: err?.message || 'Terjadi kesalahan saat mengirim notifikasi WhatsApp.',
    })
  }
}

