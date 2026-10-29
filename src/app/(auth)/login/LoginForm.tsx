'use client'
// src/app/(auth)/login/LoginForm.tsx
import { useState } from 'react'
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
          // Normalisasi manual cadangan
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

      // Type-safe access
      const userRow = rows[0] as { email: string }
      emailToUse = userRow.email
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    emailToUse,
      password: password,
    })

    if (authError) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
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
