// src/app/api/auth/forgot-password/route.ts — Endpoint Lupa Kata Sandi
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateIndonesianPhone, validateStrictEmail } from '@/lib/validation/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier } = body

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return NextResponse.json(
        { error: 'Masukkan email atau nomor HP yang terdaftar.' },
        { status: 400 }
      )
    }

    const cleanInput = identifier.trim()
    const adminSupabase = await createAdminClient()
    let targetEmail = ''

    // 1. Cek apakah input berupa email
    if (cleanInput.includes('@')) {
      const emailVal = validateStrictEmail(cleanInput)
      if (!emailVal.valid) {
        return NextResponse.json({ error: emailVal.error }, { status: 400 })
      }

      // Verifikasi apakah email terdaftar di database
      const { data: userRow } = await adminSupabase
        .from('users')
        .select('email')
        .eq('email', emailVal.normalized)
        .maybeSingle()

      if (!userRow) {
        return NextResponse.json(
          { error: 'Email ini tidak terdaftar di sistem COD-In.' },
          { status: 404 }
        )
      }

      targetEmail = userRow.email
    } else {
      // 2. Input berupa nomor telepon (HP)
      const phoneVal = validateIndonesianPhone(cleanInput)
      if (!phoneVal.valid) {
        return NextResponse.json(
          { error: phoneVal.error || 'Nomor HP tidak valid. Gunakan format seluler Indonesia (contoh: 08123456789).' },
          { status: 400 }
        )
      }

      // Cari email akun berdasarkan nomor HP yang dinormalisasi
      const { data: userRow } = await adminSupabase
        .from('users')
        .select('email')
        .eq('phone', phoneVal.normalized)
        .maybeSingle()

      if (!userRow) {
        return NextResponse.json(
          { error: 'Nomor HP ini tidak terdaftar di sistem COD-In.' },
          { status: 404 }
        )
      }

      targetEmail = userRow.email
    }

    // 3. Tentukan URL redirect setelah klik link di email
    // Prioritaskan env var NEXT_PUBLIC_SITE_URL untuk menghindari pengalihan ke vercel.com
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      || 'https://marketplace-beta-lyart.vercel.app'
    const redirectUrl = `${siteUrl}/api/auth/callback?next=/reset-password`

    // 4. Minta Supabase Auth untuk mengirimkan token OTP / tautan reset kata sandi
    const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: redirectUrl,
    })

    if (resetError) {
      return NextResponse.json(
        { error: 'Gagal mengirim instruksi reset kata sandi: ' + resetError.message },
        { status: 400 }
      )
    }

    // Masking email untuk ditampilkan ke pengguna di layar (misal: bu***@gmail.com)
    const [userPart, domainPart] = targetEmail.split('@')
    const maskedUser = userPart.length > 2
      ? userPart.slice(0, 2) + '*'.repeat(Math.max(3, userPart.length - 2))
      : userPart + '***'
    const maskedEmail = `${maskedUser}@${domainPart}`

    return NextResponse.json({
      success: true,
      email: targetEmail,
      maskedEmail,
      message: `Instruksi pembaruan kata sandi telah dikirimkan ke email ${maskedEmail}.`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan sistem.' },
      { status: 500 }
    )
  }
}

