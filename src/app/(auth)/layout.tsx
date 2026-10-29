// src/app/(auth)/layout.tsx — Layout khusus halaman auth (Obsidian Dark Mode)
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'SkalaShop — Akun' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] text-neutral-100 flex items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-white hover:opacity-95 transition">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              S
            </span>
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Skala<span className="text-blue-500">Shop</span>
            </span>
          </Link>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1.5">
            Marketplace Belanja &amp; Berjualan Online Khusus COD
          </p>
        </div>
        <div className="rounded-2xl border border-[#2E2E2E] bg-[#1E1E1E] p-6 sm:p-8 shadow-2xl shadow-blue-500/5 text-neutral-200">
          {children}
        </div>
      </div>
    </div>
  )
}
