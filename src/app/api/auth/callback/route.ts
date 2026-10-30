// src/app/api/auth/callback/route.ts
// Supabase Auth OAuth & magic-link callback handler
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')

  // Gunakan NEXT_PUBLIC_SITE_URL untuk redirect agar tidak pernah mengarah ke vercel.com
  // Fallback ke `origin` dari URL request hanya jika env var tidak ada
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || origin

  if (error) {
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`)
}

