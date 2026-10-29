// src/app/layout.tsx — Root Layout
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'SkalaShop', template: '%s | SkalaShop' },
  description: 'Marketplace belanja & berjualan online SkalaShop',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
