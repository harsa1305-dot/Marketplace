'use client'
// src/app/(auth)/forgot-password/ForgotPasswordForm.tsx — Form Permintaan Reset Kata Sandi & Verifikasi OTP
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordForm() {
  const router = useRouter()
  const supabase = createClient()

  // State Step 1 (Input Identifier)
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State Step 2 (Verifikasi OTP)
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSuccess, setOtpSuccess] = useState(false)

  // State Rate Limiting & Cooldown Timer (Anti-Spam)
  const [cooldown, setCooldown] = useState(0)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  // Timer cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Kirim Permintaan Reset Kata Sandi
  async function handleRequestReset(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!identifier.trim()) {
      setError('Masukkan email atau nomor HP yang terdaftar.')
      return
    }

    setLoading(true)
    setError(null)
    setOtpError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses permintaan reset kata sandi.')
      }

      setTargetEmail(data.email)
      setMaskedEmail(data.maskedEmail)
      setIsOtpSent(true)
      setCooldown(60) // Aktifkan cooldown 60 detik pencegah spam
      setResendMsg('✅ Kode OTP dan tautan reset kata sandi baru telah dikirimkan ke email Anda.')
      setTimeout(() => setResendMsg(null), 5000)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate limit')) {
        setError('Batas pengiriman email tercapai. Silakan tunggu beberapa menit sebelum mencoba lagi, atau gunakan akun yang sudah ada.')
      } else {
        setError(msg || 'Terjadi kesalahan sistem.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Verifikasi Kode OTP 6-Digit (Supabase Auth Recovery)
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const cleanToken = otpCode.trim()

    if (!cleanToken || cleanToken.length < 6) {
      setOtpError('Masukkan 6 digit kode OTP verifikasi.')
      return
    }

    setVerifyingOtp(true)
    setOtpError(null)

    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: cleanToken,
        type: 'recovery',
      })

      if (vErr) throw vErr

      setOtpSuccess(true)
      setTimeout(() => {
        router.push('/reset-password')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setOtpError(err?.message || 'Kode OTP salah atau telah kadaluwarsa (berlaku 5-10 menit). Silakan coba lagi.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition'
  const labelClass = 'block text-sm font-medium text-neutral-300 mb-1.5'

  // STEP 2: Tampilan Input 6-Digit Kode OTP & Konfirmasi Tautan
  if (isOtpSent) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
          🔑
        </div>

        <div>
          <h2 className="text-xl font-bold text-neutral-100">Verifikasi Kode Reset</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Kode verifikasi 6 digit telah dikirimkan ke email terdaftar:
          </p>
          <p className="text-sm font-bold text-blue-400 mt-0.5 tracking-wide">{maskedEmail}</p>
          <span className="inline-block mt-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full font-medium">
            ⏱️ Berlaku 5–10 menit
          </span>
        </div>

        {/* Form Verifikasi 6-Digit OTP */}
        <form onSubmit={handleVerifyOtp} className="space-y-3 bg-[#121212] p-4 rounded-xl border border-[#2E2E2E] text-left">
          <label className="block text-xs font-semibold text-neutral-300">
            Masukkan 6-Digit Kode OTP:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              autoFocus
              className="flex-1 px-4 py-2.5 border border-[#2E2E2E] rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:border-blue-500 bg-[#1E1E1E] text-neutral-100 placeholder-neutral-500"
            />
            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length < 6}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-blue-600/20"
            >
              {verifyingOtp ? '⏳...' : 'Verifikasi'}
            </button>
          </div>

          {otpError && (
            <p className="text-xs text-rose-400 font-medium bg-rose-950/30 p-2 rounded-lg border border-rose-800/40">
              ⚠️ {otpError}
            </p>
          )}

          {otpSuccess && (
            <p className="text-xs text-emerald-400 font-bold bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
              ✅ Kode OTP terverifikasi! Mengalihkan ke form kata sandi baru...
            </p>
          )}

          {/* Kirim Ulang OTP dengan Rate Limiting Cooldown */}
          <div className="pt-2 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Tidak menerima email?</span>
            <button
              type="button"
              onClick={() => handleRequestReset()}
              disabled={cooldown > 0 || loading}
              className="text-blue-400 hover:underline font-semibold disabled:text-neutral-600 disabled:no-underline"
            >
              {cooldown > 0 ? `Kirim Ulang (${cooldown}d)` : 'Kirim Ulang Kode'}
            </button>
          </div>
          {resendMsg && <p className="text-[11px] text-emerald-400 font-medium">{resendMsg}</p>}
        </form>

        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-400 text-left space-y-1">
          <p>
            💡 <strong>Opsi Lain:</strong> Anda juga bisa langsung mengklik tombol tautan pembaruan kata sandi di dalam pesan email yang Anda terima.
          </p>
          <p className="text-[11px] text-amber-400/80">
            Cek juga folder <em>Spam</em> atau <em>Promotions</em> jika pesan belum terlihat di kotak masuk utama.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setIsOtpSent(false)
              setOtpCode('')
              setOtpError(null)
            }}
            className="text-neutral-400 hover:text-blue-400 transition"
          >
            ← Ubah Email / No HP
          </button>
          <Link href="/login" className="text-neutral-400 hover:text-blue-400 transition">
            Halaman Masuk
          </Link>
        </div>
      </div>
    )
  }

  // STEP 1: Form Input Email / No HP
  return (
    <form onSubmit={handleRequestReset} className="space-y-4">
      <div>
        <label className={labelClass}>Email atau Nomor HP Terdaftar</label>
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="cth: budi@gmail.com atau 08123456789"
          required
          className={inputClass}
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          Masukkan email atau nomor HP yang Anda daftarkan di akun COD-In.
        </p>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] text-sm"
      >
        {loading ? '⏳ Memeriksa Akun...' : 'Kirim Kode Verifikasi'}
      </button>

      <div className="text-center pt-2">
        <Link href="/login" className="text-xs text-neutral-400 hover:text-blue-400 font-medium transition">
          ← Ingat kata sandi? Masuk ke akun
        </Link>
      </div>
    </form>
  )
}

