// ============================================================
// lib/models/chat.model.ts
// Pengganti: app/Models/Chat.php + ChatMessage.php
// ============================================================
import type { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/server'

export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']

export interface ChatWithLastMessage extends Chat {
  stores: { id: number; name: string; logo: string | null }
  chat_messages: { message: string; created_at: string; is_read: boolean }[]
}

/** Ambil semua chat milik seorang buyer */
export async function getChatsByBuyer(buyerId: number): Promise<ChatWithLastMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chats')
    .select(`*, stores (id, name, logo), chat_messages (message, created_at, is_read)`)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as ChatWithLastMessage[]
}

/** Ambil semua pesan dalam satu chat */
export async function getMessagesByChat(chatId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`*, users:sender_id (id, name, avatar)`)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

/** Buat chat baru atau ambil yang sudah ada (upsert) */
export async function getOrCreateChat(buyerId: number, storeId: number) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('chats')
    .select('*')
    .eq('buyer_id', buyerId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('chats')
    .insert({ buyer_id: buyerId, store_id: storeId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function sendMessage(chatId: number, senderId: number, message: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ chat_id: chatId, sender_id: senderId, message })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function markMessagesAsRead(chatId: number, senderId: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', senderId) // mark semua pesan dari lawan bicara sebagai read
  if (error) throw new Error(error.message)
}
