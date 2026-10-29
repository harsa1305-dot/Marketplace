// src/app/(main)/profile/page.tsx — Halaman Profil User (Obsidian Dark Mode)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/profile')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, username, email, phone, avatar, created_at')
    .eq('auth_id', user.id)
    .single() as { data: {
      id: number; name: string; username: string; email: string;
      phone: string; avatar: string | null; created_at: string
    } | null; error: unknown }

  if (!profile) redirect('/login')

  // Cek apakah punya toko
  const { data: store } = await supabase
    .from('stores').select('id, name').eq('user_id', profile.id).maybeSingle()

  // Statistik: jumlah pesanan
  const { count: orderCount } = await supabase
    .from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', profile.id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header profil */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#2563EB] border border-blue-900/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden shadow-inner backdrop-blur-md">
            {profile.avatar
              ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              : profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">{profile.name}</h1>
            <p className="text-blue-100 text-sm font-medium">@{profile.username}</p>
            <p className="text-blue-200/80 text-xs mt-1">
              Bergabung {new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: '📦', label: 'Total Pesanan', value: orderCount ?? 0 },
          { icon: '🏪', label: 'Status Toko', value: store ? 'Aktif' : 'Belum Ada' },
          { icon: '⭐', label: 'Member', value: 'Regular' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-4 text-center">
            <p className="text-xl mb-1">{stat.icon}</p>
            <p className="font-extrabold text-white text-base">{stat.value}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Link toko */}
      {store ? (
        <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 text-xl font-bold">
              🏪
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{store.name}</p>
              <p className="text-xs text-neutral-400">Toko kamu aktif dan siap berjualan</p>
            </div>
          </div>
          <Link href="/store" className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/20">
            Kelola Toko →
          </Link>
        </div>
      ) : (
        <div className="bg-[#1E1E1E] border border-blue-500/30 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Mulai berjualan di SkalaShop!</p>
            <p className="text-xs text-neutral-400">Buka tokomu sekarang — 100% gratis.</p>
          </div>
          <Link href="/store" className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-600/20">
            Buka Toko
          </Link>
        </div>
      )}

      {/* Form edit profil */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-white text-base">Pengaturan Akun &amp; Profil</h2>
        <ProfileForm profile={profile} />
      </div>
    </div>
  )
}
