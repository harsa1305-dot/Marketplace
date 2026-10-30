// src/app/(auth)/reset-password/page.tsx — Halaman Buat Kata Sandi Baru
import { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Atur Ulang Kata Sandi — COD-In',
  description: 'Buat kata sandi baru untuk akun marketplace COD-In',
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-1">Buat Kata Sandi Baru</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Silakan masukkan kata sandi baru yang kuat untuk mengamankan akun Anda.
      </p>

      <ResetPasswordForm />
    </div>
  )
}

