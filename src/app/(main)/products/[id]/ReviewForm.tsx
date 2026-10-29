'use client'
// src/app/(main)/products/[id]/ReviewForm.tsx — Form Ulasan Produk
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  productId: number
  userId: number | null
  isStoreOwner: boolean
  existingReview?: {
    rating: number
    comment: string | null
  } | null
}

export default function ReviewForm({ productId, userId, isStoreOwner, existingReview }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5)
  const [comment, setComment] = useState<string>(existingReview?.comment ?? '')
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!userId) {
    return (
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-4 text-center text-sm text-neutral-400">
        Silakan{' '}
        <Link href={`/login?redirect=/products/${productId}`} className="text-blue-400 font-semibold hover:underline">
          masuk
        </Link>{' '}
        untuk memberikan ulasan produk ini.
      </div>
    )
  }

  if (isStoreOwner) {
    return (
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl p-4 text-center text-xs text-neutral-400">
        Kamu tidak bisa memberikan ulasan pada produk tokomu sendiri.
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: upsertErr } = await supabase.from('reviews').upsert(
        {
          product_id: productId,
          user_id: userId!,
          rating: rating as any,
          comment: comment.trim() || null,
        },
        { onConflict: 'product_id,user_id' }
      )

      if (upsertErr) throw upsertErr

      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan ulasan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E1E1E] rounded-xl border border-[#2E2E2E] p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-neutral-100 text-sm">
        {existingReview ? '✏️ Ubah Ulasan Kamu' : '⭐ Tulis Ulasan Produk'}
      </h3>

      {/* Star Selector */}
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Beri Nilai (1 - 5 Bintang)</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="text-2xl transition-transform hover:scale-110 focus:outline-none"
            >
              <span className={(hoverRating ?? rating) >= star ? 'text-yellow-400' : 'text-neutral-600'}>
                ★
              </span>
            </button>
          ))}
          <span className="text-xs text-neutral-300 ml-2 font-medium">
            {rating === 5 ? 'Sangat Puas' : rating === 4 ? 'Puas' : rating === 3 ? 'Cukup' : rating === 2 ? 'Kurang' : 'Kecewa'}
          </span>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Komentar / Pengalaman</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ceritakan kualitas produk, kesesuaian dengan deskripsi, atau kecepatan pengiriman..."
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 bg-[#121212] border border-[#2E2E2E] text-neutral-100 placeholder-neutral-500 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 p-2 rounded-lg">{error}</p>}
      {success && <p className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-2 rounded-lg">✅ Ulasan berhasil disimpan!</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-600/20"
        >
          {loading ? '⏳ Menyimpan...' : existingReview ? 'Simpan Perubahan' : 'Kirim Ulasan'}
        </button>
      </div>
    </form>
  )
}

