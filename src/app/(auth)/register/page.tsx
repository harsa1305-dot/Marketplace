// src/app/(auth)/register/page.tsx
import { Metadata } from 'next'
import Link from 'next/link'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = { title: 'Daftar Akun' }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-1">Buat Akun Baru</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Satu akun untuk belanja &amp; berjualan — seperti Shopee/Tokopedia
      </p>

      {params.error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          ❌ {decodeURIComponent(params.error)}
        </div>
      )}

      <RegisterForm />

      <p className="text-center text-sm text-neutral-400 mt-6">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-blue-400 font-semibold hover:text-blue-300 hover:underline transition">
          Masuk di sini
        </Link>
      </p>
    </div>
  )
}
