// src/app/auth/callback/route.ts — Supabase Auth Callback Handler
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || origin
    || 'https://codin-lyart.vercel.app'

  if (error) {
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError && sessionData?.user) {
      // Pastikan profil di public.users dibuat jika verifikasi via link email
      try {
        const adminSupabase = await createAdminClient()
        const user = sessionData.user
        const { data: existing } = await adminSupabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle()

        if (!existing && user.email) {
          const meta = user.user_metadata || {}
          await adminSupabase.from('users').insert({
            auth_id: user.id,
            name: meta.name || 'Pengguna COD-In',
            username: (meta.username || `user_${user.id.slice(0, 8)}`).toLowerCase(),
            email: user.email.toLowerCase(),
            phone: meta.phone || '-',
            password: '-',
          })
        }
      } catch (profileErr) {
        console.error('Error auto-creating profile in callback:', profileErr)
      }

      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`)
}

