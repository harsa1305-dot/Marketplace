'use client'
// src/app/(auth)/login/LoginForm.tsx — Form Login dengan Proteksi Akun Terverifikasi OTP
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateIndonesianPhone } from '@/lib/validation/auth'

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router   = useRouter()
  const supabase = createClient()

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // State Modal Verifikasi OTP (untuk akun yang belum email_confirmed_at)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSuccess, setOtpSuccess] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Countdown timer untuk tombol kirim ulang OTP
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let emailToUse = identifier.trim()

    // Jika bukan email, cari lewat username / phone
    if (!emailToUse.includes('@')) {
      const isPhone = /^[0-9+]/.test(emailToUse)
      let field = 'username'
      let searchVal = emailToUse.toLowerCase()

      if (isPhone) {
        field = 'phone'
        const phoneVal = validateIndonesianPhone(emailToUse)
        if (phoneVal.valid) {
          searchVal = phoneVal.normalized
        } else {
          let cleaned = emailToUse.replace(/[^0-9]/g, '')
          if (cleaned.startsWith('62')) cleaned = '0' + cleaned.slice(2)
          searchVal = cleaned
        }
      }

      const { data: rows, error: lookupErr } = await supabase
        .from('users')
        .select('email')
        .eq(field, searchVal)
        .limit(1)

      if (lookupErr || !rows || rows.length === 0) {
        setError('Akun tidak ditemukan. Cek kembali username/HP/email kamu.')
        setLoading(false)
        return
      }

      const userRow = rows[0] as { email: string }
      emailToUse = userRow.email
    }

    // Melakukan login dengan email dan password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email:    emailToUse,
      password: password,
    })

    // 1. Cek jika Supabase menolak login karena email belum terkonfirmasi
    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('not verified') || msg.includes('unconfirmed')) {
        await supabase.auth.signOut()
        setUnverifiedEmail(emailToUse)
        setShowOtpModal(true)
        setCooldown(60)
        setLoading(false)
        return
      }

      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    // 2. Cek apakah pengguna berhasil login tetapi email_confirmed_at masih null / belum terverifikasi
    if (authData?.user && !authData.user.email_confirmed_at) {
      // Batalkan sesi langsung sesuai instruksi
      await supabase.auth.signOut()
      setUnverifiedEmail(emailToUse)
      setShowOtpModal(true)
      setCooldown(60)
      setLoading(false)
      return
    }

    // 3. Pastikan data profil pengguna tersinkronisasi ke public.users
    if (authData?.user) {
      try {
        await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            email: authData.user.email || emailToUse,
          }),
        })
      } catch (err) {
        console.error('Profile sync non-blocking error:', err)
      }
    }

    router.push(redirectTo)
    router.refresh()
  }

  // Verifikasi OTP untuk Akun yang Belum Terverifikasi
  async function handleVerifyUnverifiedOtp(e: React.FormEvent) {
    e.preventDefault()
    const cleanToken = otpCode.trim()
    if (!cleanToken || cleanToken.length < 6) {
      setOtpError('Masukkan 6 digit kode OTP verifikasi.')
      return
    }

    setVerifyingOtp(true)
    setOtpError(null)

    try {
      const { data, error: vErr } = await supabase.auth.verifyOtp({
        email: unverifiedEmail,
        token: cleanToken,
        type: 'signup',
      })

      if (vErr) throw vErr

      // Sinkronkan pembuatan profil di database public.users
      if (data?.user) {
        await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            email: unverifiedEmail,
          }),
        })
      }

      setOtpSuccess(true)
      setTimeout(() => {
        router.push(redirectTo)
        router.refresh()
      }, 1200)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setOtpError('Kode OTP tidak valid atau telah kedaluwarsa. Silakan minta kode baru.')
      } else if (msg.toLowerCase().includes('rate limit')) {
        setOtpError('Terlalu banyak percobaan. Silakan tunggu beberapa menit.')
      } else {
        setOtpError(msg || 'Kode OTP salah atau telah kedaluwarsa. Silakan periksa kembali email Anda.')
      }
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Kirim Ulang OTP Verifikasi Akun
  async function handleResendOtp() {
    if (cooldown > 0) return
    setResendingOtp(true)
    setOtpError(null)
    setResendMsg(null)

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://codin-lyart.vercel.app'
      const { error: rErr } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      })

      if (rErr) throw rErr

      setCooldown(60)
      setResendMsg('✅ Kode OTP baru telah dikirimkan ke email Anda. Cek juga folder Spam.')
      setTimeout(() => setResendMsg(null), 7000)
    } catch (err: any) {
      setOtpError(err?.message || 'Gagal mengirim ulang kode OTP.')
    } finally {
      setResendingOtp(false)
    }
  }

  // Tampilan Modal Verifikasi OTP Jika Akun Belum Terverifikasi
  if (showOtpModal) {
    return (
      <div className="bg-[#1E1E1E] rounded-2xl p-6 border border-[#2E2E2E] text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
          🔒
        </div>

        <div>
          <h2 className="text-xl font-bold text-neutral-100">Verifikasi Akun COD-In</h2>
          <p className="text-xs text-amber-400 mt-2 bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-xl font-medium">
            Akun Anda belum terverifikasi. Silakan masukkan kode OTP yang telah dikirim ke email:
          </p>
          <p className="text-sm font-bold text-neutral-200 mt-1">{unverifiedEmail}</p>
        </div>

        <form onSubmit={handleVerifyUnverifiedOtp} className="space-y-3 bg-[#121212] p-4 rounded-xl border border-[#2E2E2E] text-left">
          <label className="block text-xs font-semibold text-neutral-300">
            Masukkan 6-Digit Kode OTP:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Contoh: 123456"
              autoFocus
              className="flex-1 px-4 py-2.5 border border-[#2E2E2E] rounded-xl text-center text-base font-mono font-bold tracking-widest focus:outline-none focus:border-blue-500 bg-[#1E1E1E] text-neutral-100 placeholder-neutral-500"
            />
            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length < 6}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-blue-600/20"
            >
              {verifyingOtp ? '⏳...' : 'Verifikasi & Masuk'}
            </button>
          </div>

          {otpError && (
            <p className="text-xs text-rose-400 font-medium bg-rose-950/30 p-2 rounded-lg border border-rose-800/40">
              ⚠️ {otpError}
            </p>
          )}

          {otpSuccess && (
            <p className="text-xs text-emerald-400 font-bold bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
              ✅ Akun COD-In berhasil diverifikasi! Mengalihkan...
            </p>
          )}

          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Tidak menerima email?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || resendingOtp}
              className="text-blue-400 hover:underline font-semibold disabled:text-neutral-600 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendingOtp
                ? 'Mengirim...'
                : cooldown > 0
                ? `Kirim Ulang (${cooldown} dtk)`
                : 'Kirim Ulang Kode'}
            </button>
          </div>
          {resendMsg && (
            <p className="text-[11px] text-emerald-400 font-medium bg-emerald-950/20 border border-emerald-800/30 p-2 rounded-lg">
              {resendMsg}
            </p>
          )}

          {/* Edukasi Spam Email */}
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-400 text-left space-y-1">
            <p className="font-semibold">
              💡 Kode OTP tidak muncul di Kotak Masuk?
            </p>
            <p className="text-[11px] text-amber-400/90 leading-relaxed">
              Cek folder <strong>Spam</strong> atau <strong>Promosi</strong> di Gmail Anda. Jika ditemukan di Spam, buka pesan lalu klik <em>"Bukan Spam"</em> agar email berikutnya dari COD-In masuk ke Inbox utama.
            </p>
          </div>
        </form>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              setShowOtpModal(false)
              setOtpCode('')
              setOtpError(null)
            }}
            className="text-xs text-neutral-400 hover:text-blue-400 font-medium transition"
          >
            ← Kembali ke Form Masuk
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1.5">
          Email / Username / No. HP
        </label>
        <input
          type="text"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder="cth: user@email.com atau johndoe atau 08123..."
          required
          className="w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-neutral-300">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium transition"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          className="w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] text-sm"
      >
        {loading ? '⏳ Sedang masuk...' : 'Masuk'}
      </button>
    </form>
  )
}
