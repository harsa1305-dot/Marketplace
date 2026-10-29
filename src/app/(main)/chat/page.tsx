// src/app/(main)/chat/page.tsx — Daftar Chat User & Penjual
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ChatListPage({
  searchParams,
}: {
  searchParams: Promise<{ store_id?: string }>
}) {
  const { store_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/chat${store_id ? `?store_id=${store_id}` : ''}`)

  const { data: profile } = await supabase
    .from('users').select('id, name').eq('auth_id', user.id).single() as
    { data: { id: number; name: string } | null; error: unknown }
  if (!profile) redirect('/login')

  // Cek apakah user punya toko
  const { data: myStore } = await supabase
    .from('stores')
    .select('id, name')
    .eq('user_id', profile.id)
    .maybeSingle()

  // Jika URL memiliki store_id, buat atau cari chat lalu redirect langsung ke /chat/[id]
  if (store_id) {
    const targetStoreId = Number(store_id)

    // Jika toko milik sendiri, tidak bisa chat sendiri
    if (myStore && myStore.id === targetStoreId) {
      redirect('/chat')
    }

    // Cari percakapan yang sudah ada
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('buyer_id', profile.id)
      .eq('store_id', targetStoreId)
      .maybeSingle()

    if (existingChat) {
      redirect(`/chat/${existingChat.id}`)
    } else {
      // Buat percakapan baru
      const { data: newChat, error: createChatErr } = await supabase
        .from('chats')
        .insert({
          buyer_id: profile.id,
          store_id: targetStoreId,
        })
        .select('id')
        .single()

      if (newChat && !createChatErr) {
        redirect(`/chat/${newChat.id}`)
      }
    }
  }

  // 1. Chat sebagai buyer (chat ke toko lain)
  const { data: buyerChats } = await supabase
    .from('chats')
    .select(`
      id, created_at,
      stores ( id, name, logo ),
      chat_messages ( message, created_at, is_read, sender_id )
    `)
    .eq('buyer_id', profile.id)
    .order('created_at', { ascending: false })

  // 2. Chat sebagai seller (pembeli yang chat ke toko saya)
  let sellerChats: any[] = []
  if (myStore) {
    const { data: sChats } = await supabase
      .from('chats')
      .select(`
        id, created_at,
        users:buyer_id ( id, name, avatar ),
        chat_messages ( message, created_at, is_read, sender_id )
      `)
      .eq('store_id', myStore.id)
      .order('created_at', { ascending: false })

    sellerChats = sChats ?? []
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">💬 Pesan & Percakapan</h1>
      </div>

      {/* Mode Seller: Pesanan Masuk ke Toko */}
      {myStore && sellerChats.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
            <span>🏪</span> Pesan Masuk Toko ({myStore.name})
          </h2>
          <div className="space-y-2">
            {sellerChats.map((chat: any) => {
              const msgs = chat.chat_messages ?? []
              const last = msgs.sort(
                (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              const unread = msgs.filter((m: any) => !m.is_read && m.sender_id !== profile.id).length

              return (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="flex items-center gap-4 bg-[#1E1E1E] rounded-xl p-4 hover:border-blue-500/50 transition-all border border-[#2E2E2E]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2E2E2E] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {chat.users?.avatar ? (
                      <img src={chat.users.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-100 text-sm">{chat.users?.name ?? 'Pembeli'}</p>
                      <span className="text-[10px] bg-blue-600/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                        Pembeli
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {last?.message ?? 'Belum ada pesan'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {last && (
                      <p className="text-xs text-neutral-400">
                        {new Date(last.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {unread > 0 && (
                      <span className="inline-block mt-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 leading-5 text-center">
                        {unread}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Mode Buyer: Chat ke Toko Lain */}
      <div className="space-y-3">
        {myStore && sellerChats.length > 0 && (
          <h2 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
            <span>🛍️</span> Percakapan Saya ke Penjual Lain
          </h2>
        )}

        {!buyerChats || buyerChats.length === 0 ? (
          sellerChats.length === 0 ? (
            <div className="text-center py-16 bg-[#1E1E1E] rounded-2xl text-neutral-400 border border-[#2E2E2E]">
              <p className="text-5xl mb-3">💬</p>
              <p className="font-medium text-neutral-200">Belum ada percakapan</p>
              <p className="text-xs text-neutral-400 mt-1 mb-4">
                Chat dengan penjual melalui halaman produk atau detail toko.
              </p>
              <Link
                href="/"
                className="inline-block bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
              >
                Jelajahi Produk
              </Link>
            </div>
          ) : null
        ) : (
          <div className="space-y-2">
            {(buyerChats as any[]).map((chat: any) => {
              const msgs = chat.chat_messages ?? []
              const last = msgs.sort(
                (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              const unread = msgs.filter((m: any) => !m.is_read && m.sender_id !== profile.id).length

              return (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="flex items-center gap-4 bg-[#1E1E1E] rounded-xl p-4 hover:border-[#3E3E3E] transition-all border border-[#2E2E2E]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2E2E2E] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {chat.stores?.logo ? (
                      <img src={chat.stores.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      '🏪'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-100 text-sm">{chat.stores?.name ?? 'Toko'}</p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {last?.message ?? 'Belum ada pesan'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {last && (
                      <p className="text-xs text-neutral-400">
                        {new Date(last.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {unread > 0 && (
                      <span className="inline-block mt-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 leading-5 text-center">
                        {unread}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
