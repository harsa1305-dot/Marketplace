// src/app/layout.tsx — Root Layout
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'COD-In - Marketplace Belanja & Berjualan Online Khusus COD',
    template: '%s | COD-In',
  },
  description: 'COD-In - Marketplace Belanja & Berjualan Online Khusus COD. Transaksi Cash On Delivery aman dan terpercaya.',
  openGraph: {
    title: 'COD-In - Marketplace Belanja & Berjualan Online Khusus COD',
    description: 'COD-In - Marketplace Belanja & Berjualan Online Khusus COD. Transaksi Cash On Delivery aman dan terpercaya.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
