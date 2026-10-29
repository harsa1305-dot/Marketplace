// src/app/(main)/chat/[id]/page.tsx — Halaman Chat Realtime
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ChatRoom from './ChatRoom'

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('id, name, avatar').eq('auth_id', user.id).single() as
    { data: { id: number; name: string; avatar: string | null } | null; error: unknown }
  if (!profile) redirect('/login')

  const { data: chat, error } = await supabase
    .from('chats')
    .select(`
      id, buyer_id, store_id,
      stores ( id, user_id, name, logo ),
      buyer:buyer_id ( id, name, avatar )
    `)
    .eq('id', Number(id))
    .single()

  if (error || !chat) notFound()

  // Pastikan user adalah buyer atau seller dari toko ini
  const isParticipant = chat.buyer_id === profile.id
  if (!isParticipant) {
    // Cek apakah seller
    const { data: store } = await supabase
      .from('stores').select('id').eq('id', chat.store_id).eq('user_id', profile.id).maybeSingle()
    if (!store) redirect('/chat')
  }

  // Ambil pesan awal
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, message, is_read, created_at, sender_id, users:sender_id(name, avatar)')
    .eq('chat_id', chat.id)
    .order('created_at', { ascending: true })

  // Mark as read
  await supabase.from('chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chat.id)
    .neq('sender_id', profile.id)

  return (
    <div className="max-w-2xl mx-auto">
      <ChatRoom
        chatId={chat.id}
        buyerId={chat.buyer_id}
        currentUser={{ id: profile.id, name: profile.name, avatar: profile.avatar }}
        store={chat.stores as { id: number; name: string; logo: string | null }}
        buyer={(chat as any).buyer as { id: number; name: string; avatar: string | null } | null}
        initialMessages={messages as any[] ?? []}
      />
    </div>
  )
}

