'use client'
// src/app/(main)/store/CreateStoreForm.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CreateStoreForm({ userId }: { userId: number }) {
  const router   = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({ name: '', description: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: storeError } = await supabase.from('stores').insert({
      user_id:     userId,
      name:        form.name,
      description: form.description || null,
      address:     form.address || null,
    })

    if (storeError) {
      setError(storeError.message)
      setLoading(false)
      return
    }

    router.push('/store')
    router.refresh()
  }

  const inputClass =
    "w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
  const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <label className={labelClass}>Nama Toko <span className="text-red-400">*</span></label>
        <input name="name" value={form.name} onChange={handleChange}
          placeholder="cth: Toko Elektronik Jaya" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Deskripsi Toko</label>
        <textarea name="description" value={form.description} onChange={handleChange}
          placeholder="Ceritakan tentang tokomu..." rows={3}
          className={inputClass + ' resize-none'} />
      </div>
      <div>
        <label className={labelClass}>Alamat Toko</label>
        <input name="address" value={form.address} onChange={handleChange}
          placeholder="cth: Jl. Merdeka No. 1, Jakarta" className={inputClass} />
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/20 active:scale-[0.99] text-sm">
        {loading ? '⏳ Membuat toko...' : '🏪 Buka Toko Sekarang'}
      </button>
    </form>
  )
}

