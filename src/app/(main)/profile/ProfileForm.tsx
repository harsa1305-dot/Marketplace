'use client'
// src/app/(main)/profile/ProfileForm.tsx — Form Edit Profil & Tombol Logout
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateIndonesianPhone } from '@/lib/validation/auth'
import { LogOut } from 'lucide-react'

interface Profile {
  id: number; name: string; username: string
  email: string; phone: string; avatar: string | null
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router   = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name:  profile.name,
    phone: profile.phone,
  })
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validasi ketat nomor telepon seluler Indonesia
    const phoneVal = validateIndonesianPhone(form.phone)
    if (!phoneVal.valid) {
      setError(phoneVal.error || 'Nomor HP tidak valid.')
      setLoading(false)
      return
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ name: form.name.trim(), phone: phoneVal.normalized })
      .eq('id', profile.id)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setSuccess(true)
      setForm((p) => ({ ...p, name: form.name.trim(), phone: phoneVal.normalized }))
      router.refresh()
    }
    setLoading(false)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inputClass =
    "w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
  const labelClass = "block text-sm font-medium text-neutral-300 mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Nama Lengkap</label>
        <input
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Username</label>
        <input
          value={profile.username}
          disabled
          className={inputClass + ' opacity-60 cursor-not-allowed bg-[#181818]'}
        />
        <p className="text-xs text-neutral-500 mt-1">Username tidak dapat diubah</p>
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input
          value={profile.email}
          disabled
          className={inputClass + ' opacity-60 cursor-not-allowed bg-[#181818]'}
        />
      </div>

      <div>
        <label className={labelClass}>
          Nomor HP / WhatsApp <span className="text-xs text-neutral-500 font-normal">(10-13 digit angka)</span>
        </label>
        <input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          placeholder="08123456789"
          required
          className={inputClass}
        />
      </div>

      {error   && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</p>}
      {success && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">✅ Profil berhasil diperbarui!</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-600/20 active:scale-[0.99] text-sm"
      >
        {loading ? '⏳ Menyimpan...' : 'Simpan Perubahan'}
      </button>

      <div className="pt-4 border-t border-[#2E2E2E]">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-[#121212] hover:bg-red-500/10 text-neutral-400 hover:text-red-400 border border-[#2E2E2E] hover:border-red-500/30 font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? '⏳ Sedang keluar...' : 'Keluar dari Akun'}
        </button>
      </div>
    </form>
  )
}
