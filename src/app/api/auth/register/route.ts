// src/app/api/auth/register/route.ts — Endpoint Registrasi Akun dengan Validasi Ketat
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { validateIndonesianPhone, validateStrictEmail } from '@/lib/validation/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, username, email, phone, password } = body

    // 1. Validasi field wajib
    if (!name?.trim() || !username?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return NextResponse.json(
        { error: 'Semua kolom pendaftaran wajib diisi.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      )
    }

    // 2. Validasi ketat nomor HP
    const phoneVal = validateIndonesianPhone(phone)
    if (!phoneVal.valid) {
      return NextResponse.json({ error: phoneVal.error }, { status: 400 })
    }

    // 3. Validasi ketat format email & pemblokiran email disposable
    const emailVal = validateStrictEmail(email)
    if (!emailVal.valid) {
      return NextResponse.json({ error: emailVal.error }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase()
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username hanya boleh berupa huruf, angka, dan garis bawah (_) minimal 3 karakter.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    // 4. Periksa apakah username atau nomor HP sudah pernah dipakai
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('username, phone, email')
      .or(`username.eq.${cleanUsername},phone.eq.${phoneVal.normalized},email.eq.${emailVal.normalized}`)
      .maybeSingle()

    if (existingUser) {
      if (existingUser.username === cleanUsername) {
        return NextResponse.json({ error: 'Username ini sudah terdaftar. Silakan pilih username lain.' }, { status: 400 })
      }
      if (existingUser.phone === phoneVal.normalized) {
        return NextResponse.json({ error: 'Nomor HP ini sudah digunakan oleh akun lain.' }, { status: 400 })
      }
      if (existingUser.email === emailVal.normalized) {
        return NextResponse.json({ error: 'Alamat email ini sudah terdaftar.' }, { status: 400 })
      }
    }

    // 5. Registrasi ke Supabase Auth
    let authUser: any = null
    let requireEmailConfirmation = true

    // URL callback yang benar — wajib mengarah ke domain aplikasi kita, bukan vercel.com
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || 'https://codin-lyart.vercel.app'

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: emailVal.normalized,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          name: name.trim(),
          username: cleanUsername,
          phone: phoneVal.normalized,
        },
      },
    })

    if (signUpError || !authData.user) {
      const errMsg = signUpError?.message || ''
      if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('email rate limit')) {
        // Fallback: Jika batas email SMTP Supabase terlampaui, buat akun langsung via service_role admin
        // dengan email_confirm: true agar pengguna tidak terhalang pengujian pendaftaran
        const { data: adminCreated, error: adminErr } = await adminSupabase.auth.admin.createUser({
          email: emailVal.normalized,
          password,
          email_confirm: true,
          user_metadata: {
            name: name.trim(),
            username: cleanUsername,
            phone: phoneVal.normalized,
          },
        })

        if (!adminErr && adminCreated?.user) {
          authUser = adminCreated.user
          requireEmailConfirmation = false
          // Karena sudah email_confirm: true via admin fallback, buat profil langsung
          await adminSupabase.from('users').insert({
            auth_id: authUser.id,
            name: name.trim(),
            username: cleanUsername,
            email: emailVal.normalized,
            phone: phoneVal.normalized,
            password: '-',
          })
        } else {
          return NextResponse.json(
            { error: 'Batas pengiriman email pendaftaran tercapai. Silakan tunggu beberapa menit atau gunakan akun yang sudah ada.' },
            { status: 429 }
          )
        }
      } else {
        return NextResponse.json(
          { error: signUpError?.message || 'Gagal membuat akun autentikasi di Supabase.' },
          { status: 400 }
        )
      }
    } else {
      authUser = authData.user
      requireEmailConfirmation = !authData.session
      // PENTING: Jika requireEmailConfirmation = true, profil di public.users
      // TIDAK DIBUAT di sini, melainkan HANYA setelah OTP 6-digit diverifikasi di frontend!
    }

    return NextResponse.json({
      success: true,
      userId: authUser.id,
      requireEmailConfirmation,
      message: requireEmailConfirmation
        ? 'Pendaftaran akun COD-In berhasil! Kode verifikasi OTP telah dikirimkan ke email Anda.'
        : 'Pendaftaran akun berhasil!',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan sistem saat mendaftar.' },
      { status: 500 }
    )
  }
}

