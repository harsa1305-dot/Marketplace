'use client'
// src/app/(main)/chat/[id]/ChatRoom.tsx — Realtime Chat (Obsidian Dark Mode)
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Send, Check, CheckCheck } from 'lucide-react'

interface Message {
  id: number
  message: string
  is_read: boolean
  created_at: string
  sender_id: number
  users: { name: string; avatar: string | null }
}

interface Props {
  chatId: number
  buyerId?: number
  currentUser: { id: number; name: string; avatar: string | null }
  store: { id: number; name: string; logo: string | null }
  buyer?: { id: number; name: string; avatar: string | null } | null
  initialMessages: Message[]
}

export default function ChatRoom({ chatId, buyerId, currentUser, store, buyer, initialMessages }: Props) {
  const supabase   = createClient()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMsg,   setNewMsg]   = useState('')
  const [sending,  setSending]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)

  // Tentukan identitas lawan bicara secara dinamis (Pembeli vs Penjual)
  const isBuyer = buyerId ? currentUser.id === buyerId : true
  const partnerName = isBuyer ? store.name : `${buyer?.name ?? 'Pembeli'}`
  const partnerAvatar = isBuyer ? store.logo : buyer?.avatar
  const partnerFallbackIcon = isBuyer ? '🏪' : '👤'

  // Auto scroll ke bawah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Subscribe ke Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          // Ambil detail sender
          const { data: senderData } = await supabase
            .from('users')
            .select('name, avatar')
            .eq('id', payload.new.sender_id)
            .single() as { data: { name: string; avatar: string | null } | null; error: unknown }

          const newMessage: Message = {
            id:         payload.new.id,
            message:    payload.new.message,
            is_read:    payload.new.is_read,
            created_at: payload.new.created_at,
            sender_id:  payload.new.sender_id,
            users: {
              name:   senderData?.name   ?? 'Pengguna',
              avatar: senderData?.avatar ?? null,
            },
          }
          setMessages(prev => [...prev, newMessage])

          // Tandai sudah dibaca jika bukan pengirim
          if (payload.new.sender_id !== currentUser.id) {
            await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', payload.new.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, currentUser.id, supabase])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || sending) return

    setSending(true)
    const text = newMsg.trim()
    setNewMsg('')

    await supabase.from('chat_messages').insert({
      chat_id:   chatId,
      sender_id: currentUser.id,
      message:   text,
    })

    setSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-[#1E1E1E] border border-[#2E2E2E] rounded-3xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2E2E2E] bg-[#1E1E1E]">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-neutral-400 hover:text-blue-400 mr-1 text-lg transition">←</Link>
          <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
            {partnerAvatar
              ? <img src={partnerAvatar} alt="" className="w-full h-full object-cover" />
              : partnerFallbackIcon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-white text-sm">{partnerName}</p>
              {!isBuyer && (
                <span className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  Pembeli
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Realtime Chat Aktif
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 bg-neutral-900 border border-[#2E2E2E] text-neutral-300 px-3 py-1.5 rounded-full text-xs font-semibold">
          <span>💵</span>
          <span>Sistem Pembayaran COD</span>
        </div>
      </div>

      {/* COD Notification Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-[11px] text-amber-300 flex items-center gap-2">
        <span className="text-base flex-shrink-0">ℹ️</span>
        <span className="leading-tight">
          <strong>Mode Transaksi COD:</strong> Gunakan chat ini untuk konfirmasi pesanan, patokan alamat kurir, dan kepastian uang pas saat paket tiba.
        </span>
      </div>

      {/* Pesan */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#121212]">
        {messages.length === 0 && (
          <div className="text-center text-neutral-500 text-sm py-12">
            Mulai percakapan dengan {partnerName} 👋
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUser.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden border border-blue-500/30">
                  {msg.users.avatar
                    ? <img src={msg.users.avatar} alt="" className="w-full h-full object-cover" />
                    : msg.users.name.charAt(0)}
                </div>
              )}
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-600/20'
                    : 'bg-[#1E1E1E] text-neutral-100 border border-[#2E2E2E] shadow-sm rounded-tl-sm'
                }`}>
                  {msg.message}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-1 px-1">
                  <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    <span>
                      {msg.is_read ? (
                        <CheckCheck className="h-3 w-3 text-blue-400 inline" />
                      ) : (
                        <Check className="h-3 w-3 text-neutral-500 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick COD Templates */}
      <div className="px-3 py-2 bg-[#181818] border-t border-[#2E2E2E] flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap scrollbar-none">
        <span className="text-neutral-500 font-medium">Template COD:</span>
        {[
          '📦 Apakah pesanan COD saya siap dikirim?',
          '📍 Alamat pengiriman saya sudah lengkap ya.',
          '💵 Uang pas COD sudah saya siapkan.',
          '🚚 Kapan estimasi kurir sampai di lokasi?',
        ].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setNewMsg(t)}
            className="px-3 py-1 bg-[#1E1E1E] hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/40 border border-[#2E2E2E] rounded-full text-neutral-300 transition"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3.5 border-t border-[#2E2E2E] bg-[#1E1E1E] flex gap-2">
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="Ketik pesan..."
          disabled={sending}
          className="flex-1 px-4 py-2.5 border border-[#2E2E2E] bg-[#121212] text-neutral-100 placeholder-neutral-500 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />
        <button
          type="submit"
          disabled={!newMsg.trim() || sending}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-600/20 text-sm font-semibold flex items-center gap-1.5 active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Kirim</span>
        </button>
      </form>
    </div>
  )
}
