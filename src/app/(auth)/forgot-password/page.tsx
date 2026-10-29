// src/app/(auth)/forgot-password/page.tsx — Halaman Lupa Kata Sandi
import { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi — SkalaShop',
  description: 'Pembaruan kata sandi akun marketplace SkalaShop',
}

export default function ForgotPasswordPage() {
  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-1">Lupa Kata Sandi?</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Jangan khawatir, kami akan membantu memulihkan akses ke akun Anda.
      </p>

      <ForgotPasswordForm />
    </div>
  )
}

