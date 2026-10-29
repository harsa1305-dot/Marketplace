// src/app/(auth)/login/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Masuk' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; registered?: string; reset?: string }>
}) {
  const params = await searchParams

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-1">Masuk ke Akun</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Gunakan email, username, atau nomor HP kamu
      </p>

      {params.reset && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
          ✅ Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.
        </div>
      )}

      {params.registered && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
          ✅ Akun berhasil dibuat! Silakan masuk.
        </div>
      )}

      {params.error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          ❌ {decodeURIComponent(params.error)}
        </div>
      )}

      <LoginForm redirectTo={params.redirect ?? '/'} />

      <p className="text-center text-sm text-neutral-400 mt-6">
        Belum punya akun?{' '}
        <Link href="/register" className="text-blue-400 font-semibold hover:text-blue-300 hover:underline transition">
          Daftar sekarang
        </Link>
      </p>
    </div>
  )
}
