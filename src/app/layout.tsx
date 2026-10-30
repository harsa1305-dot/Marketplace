// src/app/layout.tsx — Root Layout
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://codin.web.id'),
  title: {
    default: 'COD-In - Marketplace Lokal & Transaksi COD Direct',
    template: '%s | COD-In',
  },
  description:
    'Platform marketplace lokal untuk jual beli dan transaksi COD langsung (ketemuan) antara penjual dan pembeli.',
  alternates: {
    canonical: 'https://codin.web.id',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: 'COD-In - Marketplace Lokal & Transaksi COD Direct',
    description:
      'Platform marketplace lokal untuk jual beli dan transaksi COD langsung (ketemuan) antara penjual dan pembeli.',
    url: 'https://codin.web.id',
    siteName: 'COD-In',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'COD-In - Marketplace Lokal & Transaksi COD Direct',
    description:
      'Platform marketplace lokal untuk jual beli dan transaksi COD langsung (ketemuan) antara penjual dan pembeli.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="canonical" href="https://codin.web.id" />
      </head>
      <body>{children}</body>
    </html>
  )
}
