// src/app/(main)/products/[id]/page.tsx — Halaman Detail Produk
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddToCartButton from './AddToCartButton'
import ReviewForm from './ReviewForm'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Ambil detail produk dengan relasi
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      stores ( id, name, logo, address, user_id ),
      categories ( id, name ),
      reviews ( id, user_id, rating, comment, created_at, users(name, avatar) )
    `)
    .eq('id', Number(id))
    .eq('is_active', true)
    .single()

  if (error || !product) notFound()

  // Hitung rata-rata rating
  const reviews = product.reviews as any[] ?? []
  const avgRating = reviews.length
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // Cek apakah user sudah login
  const { data: { user } } = await supabase.auth.getUser()

  let currentProfile: { id: number } | null = null
  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()
    currentProfile = p
  }

  const isStoreOwner = currentProfile ? (product.stores as any)?.user_id === currentProfile.id : false
  const existingReview = currentProfile ? reviews.find((r: any) => r.user_id === currentProfile?.id) : null

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-400 mb-6">
        <Link href="/" className="hover:text-blue-400">Beranda</Link>
        {' › '}
        <Link href={`/?category=${(product.categories as any)?.id}`} className="hover:text-blue-400">
          {(product.categories as any)?.name ?? 'Produk'}
        </Link>
        {' › '}
        <span className="text-neutral-200">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gambar */}
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl overflow-hidden shadow-sm">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-8xl text-neutral-600 bg-[#121212]">
              📦
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <span className="text-xs bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full font-medium">
              {(product.categories as any)?.name ?? 'Produk'}
            </span>
            <h1 className="text-2xl font-bold text-neutral-100 mt-2">{product.name}</h1>

            {avgRating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-medium text-neutral-200">{avgRating}</span>
                <span className="text-sm text-neutral-400">({reviews.length} ulasan)</span>
              </div>
            )}
          </div>

          <div className="text-3xl font-bold text-blue-400">
            Rp {Number(product.price).toLocaleString('id-ID')}
          </div>

          <p className="text-sm text-neutral-400">
            Stok: <span className={`font-medium ${product.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {product.stock > 0 ? `${product.stock} tersedia` : 'Habis'}
            </span>
          </p>

          {product.description && (
            <p className="text-neutral-300 text-sm leading-relaxed border-t border-[#2E2E2E] pt-4">
              {product.description}
            </p>
          )}

          {/* Tombol beli & status stok live */}
          <AddToCartButton
            productId={product.id}
            isLoggedIn={!!user}
            maxStock={product.stock}
          />

          {/* Info toko */}
          <div className="border border-[#2E2E2E] rounded-xl p-4 bg-[#1E1E1E] space-y-3">
            <p className="text-xs text-neutral-400">Dijual oleh</p>
            <div className="flex items-center justify-between">
              <Link href={`/store/${(product.stores as any)?.id}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-[#2E2E2E] flex items-center justify-center text-lg overflow-hidden">
                  {(product.stores as any)?.logo
                    ? <img src={(product.stores as any).logo} alt="" className="w-full h-full object-cover" />
                    : '🏪'}
                </div>
                <div>
                  <p className="font-medium text-neutral-100 group-hover:text-blue-400 transition-colors text-sm">
                    {(product.stores as any)?.name}
                  </p>
                  <p className="text-xs text-neutral-400">{(product.stores as any)?.address ?? ''}</p>
                </div>
              </Link>

              {!isStoreOwner && (
                <Link
                  href={`/chat?store_id=${(product.stores as any)?.id}`}
                  className="px-3 py-1.5 rounded-lg border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs font-medium transition-colors"
                >
                  💬 Chat Penjual
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ulasan */}
      <section id="reviews" className="mt-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100">
            Ulasan Pembeli ({reviews.length})
          </h2>
          {avgRating && (
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-semibold text-yellow-400">
              <span>★</span>
              <span>{avgRating} / 5.0</span>
            </div>
          )}
        </div>

        {/* Form ulasan */}
        <ReviewForm
          productId={product.id}
          userId={currentProfile?.id ?? null}
          isStoreOwner={isStoreOwner}
          existingReview={existingReview ? { rating: existingReview.rating, comment: existingReview.comment } : null}
        />

        {reviews.length === 0 ? (
          <p className="text-neutral-400 text-sm py-8 text-center bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl">Belum ada ulasan untuk produk ini. Jadilah yang pertama memberikan ulasan!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#2E2E2E] flex items-center justify-center text-sm overflow-hidden">
                    {r.users?.avatar ? <img src={r.users.avatar} alt="" /> : '👤'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{r.users?.name ?? 'Pengguna'}</p>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={s <= r.rating ? 'text-yellow-400' : 'text-neutral-600'}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-neutral-300">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

