'use client'
// src/app/(main)/store/products/new/ProductForm.tsx — Form tambah/edit produk
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Category { id: number; name: string }

interface Props {
  storeId: number
  categories: Category[]
  // Jika dipakai untuk edit, isi defaultValues
  defaultValues?: {
    id: number
    name: string
    description: string
    price: number
    stock: number
    category_id: number | null
    image: string | null
    is_active: boolean
  }
}

export default function ProductForm({ storeId, categories, defaultValues }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const isEdit   = !!defaultValues

  const [form, setForm] = useState({
    name:        defaultValues?.name        ?? '',
    description: defaultValues?.description ?? '',
    price:       defaultValues?.price       ?? '',
    stock:       defaultValues?.stock       ?? '',
    category_id: defaultValues?.category_id ?? '',
    is_active:   defaultValues?.is_active   ?? true,
  })
  const [imageUrl,  setImageUrl]  = useState(defaultValues?.image ?? '')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : value,
    }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Batas ukuran berkas maksimal 100MB
    const MAX_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setError('Ukuran gambar melebihi batas maksimal 100MB. Silakan pilih gambar yang lebih kecil.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // 1. Pastikan sesi login aktif sebelum upload
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || !session) {
        throw new Error('Sesi login tidak ditemukan. Silakan login ulang untuk mengunggah gambar produk.')
      }

      const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      // 2. Direct Client Upload langsung dari browser ke Supabase Storage (Bypass limit 4.5MB Serverless)
      const { data, error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        })

      if (uploadErr) {
        if (uploadErr.message?.toLowerCase().includes('row-level security') || uploadErr.message?.toLowerCase().includes('violates')) {
          throw new Error('Gagal upload gambar: Izin penyimpanan ditolak (Storage RLS). Silakan jalankan script SQL RLS storage di Supabase SQL Editor.')
        }
        if (uploadErr.message?.toLowerCase().includes('entity too large') || (uploadErr as any).statusCode === '413') {
          throw new Error('Gagal upload gambar: Ukuran berkas melebihi batas maksimal bucket (100MB).')
        }
        throw new Error('Gagal upload gambar: ' + uploadErr.message)
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path)
      setImageUrl(urlData.publicUrl)
    } catch (err: any) {
      console.error('Image upload error:', err)
      if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
        setError('Gagal upload gambar: Koneksi internet terputus atau batas ukuran upload terlampaui. Pastikan koneksi stabil dan coba lagi.')
      } else {
        setError(err?.message || 'Gagal mengunggah gambar produk.')
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      store_id:    storeId,
      name:        form.name,
      description: form.description || null,
      price:       Number(form.price),
      stock:       Number(form.stock),
      category_id: form.category_id ? Number(form.category_id) : null,
      image:       imageUrl || null,
      is_active:   form.is_active,
    }

    let err = null
    if (isEdit && defaultValues) {
      const { error } = await supabase.from('products').update(payload).eq('id', defaultValues.id)
      err = error
    } else {
      const { error } = await supabase.from('products').insert(payload)
      err = error
    }

    if (err) { setError(err.message); setLoading(false); return }
    router.push('/store')
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Apakah kamu yakin ingin menghapus produk ini secara permanen?')) return
    setLoading(true)
    setError(null)
    const { error: delErr } = await supabase.from('products').delete().eq('id', defaultValues!.id)
    if (delErr) {
      setError('Gagal menghapus produk: ' + delErr.message)
      setLoading(false)
      return
    }
    router.push('/store')
    router.refresh()
  }

  const inputClass = "w-full px-4 py-3 bg-[#121212] border border-[#2E2E2E] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
  const labelClass = "block text-sm font-medium text-neutral-300 mb-1"

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-6 space-y-5">

      {/* Gambar Produk */}
      <div>
        <label className={labelClass}>Gambar Produk</label>
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-xl bg-[#121212] flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-dashed border-[#2E2E2E]">
            {imageUrl
              ? <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              : <span className="text-3xl text-neutral-600">📷</span>}
          </div>
          <div className="flex-1">
            <input type="file" accept="image/*" onChange={handleImageUpload}
              disabled={uploading}
              className="text-sm text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer" />
            <p className="text-xs text-neutral-400 mt-2">
              {uploading ? '⏳ Mengupload gambar...' : 'Format: JPG, PNG, WEBP. Maks 100MB.'}
            </p>
          </div>
        </div>
      </div>

      {/* Nama */}
      <div>
        <label className={labelClass}>Nama Produk <span className="text-red-500">*</span></label>
        <input name="name" value={form.name} onChange={handleChange}
          placeholder="cth: Sepatu Nike Air Max 2024" required className={inputClass} />
      </div>

      {/* Deskripsi */}
      <div>
        <label className={labelClass}>Deskripsi</label>
        <textarea name="description" value={form.description} onChange={handleChange}
          placeholder="Deskripsikan produkmu secara detail..."
          rows={4} className={inputClass + ' resize-none'} />
      </div>

      {/* Harga & Stok */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Harga (Rp) <span className="text-red-500">*</span></label>
          <input name="price" type="number" value={form.price} onChange={handleChange}
            placeholder="0" required min="0" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Stok <span className="text-red-500">*</span></label>
          <input name="stock" type="number" value={form.stock} onChange={handleChange}
            placeholder="0" required min="0" className={inputClass} />
        </div>
      </div>

      {/* Kategori */}
      <div>
        <label className={labelClass}>Kategori</label>
        <select name="category_id" value={form.category_id} onChange={handleChange} className={inputClass}>
          <option value="" className="bg-[#121212] text-neutral-400">-- Pilih Kategori --</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id} className="bg-[#121212] text-neutral-100">{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Status aktif */}
      <div className="flex items-center gap-3">
        <input type="checkbox" id="is_active" name="is_active"
          checked={form.is_active}
          onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
          className="w-4 h-4 accent-blue-600" />
        <label htmlFor="is_active" className="text-sm text-neutral-300">
          Produk aktif (tampil di toko &amp; bisa dibeli)
        </label>
      </div>

      {error && <p className="text-rose-400 text-sm bg-rose-950/30 border border-rose-800/40 p-3 rounded-lg">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || uploading}
            className="sm:w-auto px-4 py-3 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 font-semibold rounded-xl text-sm transition-colors"
          >
            🗑️ Hapus Produk
          </button>
        )}
        <Link href="/store" className="flex-1 text-center py-3 border border-[#2E2E2E] text-neutral-300 rounded-xl text-sm hover:bg-[#2E2E2E] transition-colors">
          Batal
        </Link>
        <button type="submit" disabled={loading || uploading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-md shadow-blue-600/20">
          {loading ? '⏳ Menyimpan...' : isEdit ? '✏️ Simpan Perubahan' : '✅ Tambah Produk'}
        </button>
      </div>
    </form>
  )
}

