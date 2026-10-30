// src/app/api/auth/create-profile/route.ts — Membuat profil di public.users HANYA setelah OTP valid
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, name, username, phone } = body

    if (!userId || !email) {
      return NextResponse.json({ error: 'Data userId dan email wajib disertakan.' }, { status: 400 })
    }

    const adminSupabase = await createAdminClient()

    // 1. Cek apakah profil sudah ada untuk auth_id ini
    const { data: existingProfile } = await adminSupabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({ success: true, message: 'Profil sudah terdaftar.' })
    }

    // 2. Ambil metadata dari user Supabase jika parameter tidak lengkap
    let finalName = name
    let finalUsername = username
    let finalPhone = phone

    if (!finalName || !finalUsername || !finalPhone) {
      const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId)
      if (!userError && userData?.user?.user_metadata) {
        const meta = userData.user.user_metadata
        finalName = finalName || meta.name || 'Pengguna COD-In'
        finalUsername = finalUsername || meta.username || `user_${userId.slice(0, 8)}`
        finalPhone = finalPhone || meta.phone || '-'
      }
    }

    // 3. Simpan profil ke public.users
    const { error: insertError } = await adminSupabase.from('users').insert({
      auth_id: userId,
      name: finalName || 'Pengguna COD-In',
      username: (finalUsername || `user_${userId.slice(0, 8)}`).toLowerCase(),
      email: email.toLowerCase(),
      phone: finalPhone || '-',
      password: '-',
    })

    if (insertError) {
      console.error('Error creating profile after OTP verification:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profil database COD-In berhasil dibuat setelah verifikasi OTP.',
    })
  } catch (err: any) {
    console.error('create-profile exception:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

