'use client'
// src/app/(auth)/register/RegisterForm.tsx — Form Registrasi Akun dengan Validasi Ketat & Verifikasi OTP
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateIndonesianPhone, validateStrictEmail } from '@/lib/validation/auth'

export default function RegisterForm() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)
  const [emailConfirmedNeeded, setEmailConfirmedNeeded] = useState(false)

  // State untuk Verifikasi OTP
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpSuccess, setOtpSuccess] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))

    // Live validation untuk Nomor HP
    if (name === 'phone') {
      if (/[^0-9+]/.test(value)) {
        setPhoneWarning('⚠️ Peringatan: Nomor HP hanya boleh berisi angka! Karakter huruf/simbol akan ditolak.')
      } else {
        setPhoneWarning(null)
      }
    }

    if (name === 'email') {
      setEmailWarning(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPhoneWarning(null)
    setEmailWarning(null)

    // 1. Validasi kecocokan password
    if (form.password !== form.confirm) {
      setError('Password dan konfirmasi password tidak cocok.')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    // 2. Validasi ketat nomor HP
    const phoneVal = validateIndonesianPhone(form.phone)
    if (!phoneVal.valid) {
      setError(phoneVal.error || 'Nomor HP tidak valid.')
      return
    }

    // 3. Validasi ketat email (RFC 5322 & tolak disposable email)
    const emailVal = validateStrictEmail(form.email)
    if (!emailVal.valid) {
      setError(emailVal.error || 'Email tidak valid.')
      return
    }

    setLoading(true)

    try {
      // 4. Kirim ke backend endpoint dengan proteksi server-side
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          email: emailVal.normalized,
          phone: phoneVal.normalized,
          password: form.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat akun.')
      }

      if (data.requireEmailConfirmation) {
        // Alihkan ke tampilan input OTP & link konfirmasi
        setEmailConfirmedNeeded(true)
      } else {
        router.push('/login?registered=1')
      }
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate limit')) {
        setError('Batas pengiriman email pendaftaran tercapai. Silakan tunggu beberapa menit atau gunakan akun yang sudah ada.')
      } else {
        setError(msg || 'Terjadi kesalahan saat mendaftar.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handler Verifikasi Kode OTP 6-Digit
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    const cleanToken = otpCode.trim()
    if (!cleanToken) {
      setOtpError('Masukkan 6 digit kode OTP yang dikirim ke email kamu.')
      return
    }

    setVerifyingOtp(true)
    setOtpError(null)

    try {
      const { data, error: vErr } = await supabase.auth.verifyOtp({
        email: form.email,
        token: cleanToken,
        type: 'signup',
      })

      if (vErr) throw vErr

      setOtpSuccess(true)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1500)
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

  // Handler Kirim Ulang OTP / Email Konfirmasi
  async function handleResendOtp() {
    setResending(true)
    setResendMsg(null)
    setOtpError(null)

    try {
      const { error: rErr } = await supabase.auth.resend({
        type: 'signup',
        email: form.email,
      })

      if (rErr) throw rErr

      setResendMsg('✅ Kode OTP / tautan baru berhasil dikirimkan ke email kamu!')
      setTimeout(() => setResendMsg(null), 5000)
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate limit')) {
        setOtpError('Batas pengiriman email pendaftaran tercapai. Silakan tunggu beberapa menit atau gunakan akun yang sudah ada.')
      } else {
        setOtpError(msg || 'Gagal mengirim ulang email verifikasi.')
      }
    } finally {
      setResending(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition'
  const labelClass = 'block text-sm font-medium text-neutral-300 mb-1.5'

  // Tampilan Verifikasi OTP / Email Konfirmasi
  if (emailConfirmedNeeded) {
    return (
      <div className="bg-[#1E1E1E] rounded-2xl p-6 border border-[#2E2E2E] text-center space-y-5">
        <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">
          ✉️
        </div>

        <div>
          <h2 className="text-xl font-bold text-neutral-100">Verifikasi Email Anda</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Kode verifikasi OTP atau tautan aktivasi telah dikirimkan ke:
          </p>
          <p className="text-sm font-bold text-neutral-200 mt-0.5">{form.email}</p>
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
              placeholder="Contoh: 123456"
              autoFocus
              className="flex-1 px-4 py-2.5 border border-[#2E2E2E] rounded-xl text-center text-base font-mono font-bold tracking-widest focus:outline-none focus:border-blue-500 bg-[#1E1E1E] text-neutral-100 placeholder-neutral-500"
            />
            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length < 6}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-blue-600/20"
            >
              {verifyingOtp ? '⏳...' : 'Verifikasi'}
            </button>
          </div>

          {otpError && <p className="text-xs text-rose-400 font-medium">{otpError}</p>}
          {otpSuccess && (
            <p className="text-xs text-emerald-400 font-bold bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/40">
              ✅ Pendaftaran akun COD-In berhasil! Mengalihkan ke beranda...
            </p>
          )}

          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Tidak menerima kode?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-blue-400 hover:underline font-semibold"
            >
              {resending ? 'Mengirim...' : 'Kirim Ulang Kode'}
            </button>
          </div>
          {resendMsg && <p className="text-[11px] text-emerald-400 font-medium">{resendMsg}</p>}
        </form>

        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-400 text-left space-y-1">
          <p>
            💡 <strong>Opsi Lain:</strong> Anda juga bisa langsung mengklik tombol/tautan konfirmasi yang ada di dalam pesan email Anda.
          </p>
          <p className="text-[11px] text-amber-400/80">
            Periksa juga folder <em>Spam</em> atau <em>Promotions</em> jika email belum muncul di kotak masuk utama.
          </p>
        </div>

        <div className="pt-1">
          <Link
            href="/login"
            className="text-xs text-neutral-400 hover:text-blue-400 font-medium transition"
          >
            ← Kembali ke Halaman Masuk
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nama Lengkap</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Budi Santoso"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="budisantoso"
            required
            pattern="[a-zA-Z0-9_]{3,30}"
            title="3-30 karakter: hanya huruf, angka, dan underscore"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email Aktif</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="budi@gmail.com"
          required
          className={inputClass}
        />
        {emailWarning && (
          <p className="text-xs text-amber-600 mt-1">{emailWarning}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>
          Nomor HP / WhatsApp <span className="text-xs text-gray-400 font-normal">(10-13 digit angka)</span>
        </label>
        <input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="08123456789"
          required
          className={`${inputClass} ${phoneWarning ? 'border-amber-400 focus:ring-amber-400' : ''}`}
        />
        {phoneWarning && (
          <p className="text-xs text-amber-600 font-medium mt-1">{phoneWarning}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            minLength={6}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Konfirmasi</label>
          <input
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={handleChange}
            placeholder="••••••••"
            required
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm active:scale-[0.99]"
      >
        {loading ? '⏳ Mendaftarkan Akun...' : '🚀 Buat Akun COD-In'}
      </button>
    </form>
  )
}
