'use client'
// src/app/(auth)/reset-password/ResetPasswordForm.tsx — Form Pembaruan Kata Sandi Baru dengan Proteksi Sesi
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  // Cek apakah ada sesi autentikasi pemulihan yang aktif
  useEffect(() => {
    async function checkAuthSession() {
      const { data: { user } } = await supabase.auth.getUser()
      setHasSession(!!user)
    }
    checkAuthSession()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 1. Validasi konfirmasi kecocokan
    if (password !== confirm) {
      setError('Kata sandi baru dan konfirmasi kata sandi tidak cocok.')
      return
    }

    // 2. Validasi panjang minimal 8 karakter
    if (password.length < 8) {
      setError('Kata sandi baru minimal harus terdiri dari 8 karakter.')
      return
    }

    // 3. Validasi ketat kombinasi huruf dan angka
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    if (!hasLetter || !hasNumber) {
      setError('Kata sandi wajib merupakan kombinasi huruf dan angka (contoh: Rahasia123).')
      return
    }

    setLoading(true)

    try {
      // 4. Update kata sandi pengguna di Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) throw updateError

      setSuccess(true)

      // 5. Proteksi Sesi: Logout otomatis di seluruh perangkat (scope: 'global')
      await supabase.auth.signOut({ scope: 'global' })

      // 6. Alihkan ke halaman login dengan parameter reset sukses
      setTimeout(() => {
        router.push('/login?reset=1')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui kata sandi. Silakan minta kode reset baru.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition'
  const labelClass = 'block text-sm font-medium text-neutral-300 mb-1.5'

  // Jika sesi verifikasi belum ditemukan atau kadaluwarsa
  if (hasSession === false) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">
          ⚠️
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Sesi Reset Tidak Ditemukan</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Tautan reset atau kode OTP Anda mungkin telah kadaluwarsa atau belum diverifikasi. Silakan ajukan permintaan reset baru.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-blue-600/20"
        >
          Minta Kode Reset Baru →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasSession === null ? (
        <div className="text-center py-8 text-neutral-400 text-sm">
          ⏳ Memeriksa otentikasi sesi...
        </div>
      ) : (
        <>
          <div>
            <label className={labelClass}>Kata Sandi Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter (huruf & angka)"
              required
              minLength={8}
              className={inputClass}
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Wajib minimal 8 karakter serta mengombinasikan huruf dan angka.
            </p>
          </div>

          <div>
            <label className={labelClass}>Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="text-emerald-400 text-xs bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20 space-y-1 font-medium">
              <p>✅ Kata sandi berhasil diperbarui!</p>
              <p className="text-[11px] text-emerald-400/80">
                Sesi di seluruh perangkat telah ditutup demi keamanan. Mengalihkan ke halaman masuk...
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] text-sm"
          >
            {loading ? '⏳ Memperbarui Kata Sandi...' : 'Simpan Kata Sandi Baru'}
          </button>
        </>
      )}
    </form>
  )
}

