// src/app/(main)/layout.tsx — Layout halaman utama (dengan Navbar & Realtime State)
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { id: number; name: string } | null = null
  let store: { id: number; name: string } | null = null
  let cartCount = 0
  let initialUnreadChats = 0
  let initialPendingOrders = 0

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('id, name')
      .eq('auth_id', user.id)
      .maybeSingle()
    profile = p

    if (profile) {
      // 1. Jumlah item keranjang
      const { count: cCount } = await supabase
        .from('cart')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      cartCount = cCount ?? 0

      // 2. Cek apakah user memiliki toko
      const { data: st } = await supabase
        .from('stores')
        .select('id, name')
        .eq('user_id', profile.id)
        .maybeSingle()
      store = st

      // 3. Jumlah pesanan baru masuk untuk toko (status = pending)
      if (store) {
        const { count: oCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('status', 'pending')
        initialPendingOrders = oCount ?? 0
      }

      // 4. Jumlah pesan chat yang belum dibaca (is_read = false)
      const { data: myChats } = await supabase
        .from('chats')
        .select('id')
        .or(store ? `buyer_id.eq.${profile.id},store_id.eq.${store.id}` : `buyer_id.eq.${profile.id}`)

      if (myChats && myChats.length > 0) {
        const chatIds = myChats.map((c: any) => c.id)
        const { count: mCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .neq('sender_id', profile.id)
          .eq('is_read', false)
        initialUnreadChats = mCount ?? 0
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-neutral-100 flex flex-col justify-between">
      <div>
        <Navbar
          user={user}
          profile={profile}
          store={store}
          cartCount={cartCount}
          initialUnreadChats={initialUnreadChats}
          initialPendingOrders={initialPendingOrders}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
      <footer className="bg-[#121212] border-t border-[#2E2E2E] py-8 text-center text-sm text-neutral-500 mt-12">
        © 2026 SkalaShop — Belanja &amp; Berjualan Online (Sistem Khusus COD)
      </footer>
    </div>
  )
}
