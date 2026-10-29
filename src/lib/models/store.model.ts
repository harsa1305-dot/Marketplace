// ============================================================
// lib/models/store.model.ts
// Pengganti: app/Models/Store.php
// ============================================================
import type { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/server'

export type Store = Database['public']['Tables']['stores']['Row']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']
export type StoreUpdate = Database['public']['Tables']['stores']['Update']

export async function getStoreByUserId(userId: number): Promise<Store | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function getStoreById(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select(`*, products (id, name, price, image, is_active, stock)`)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createStore(payload: StoreInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('stores').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateStore(id: number, payload: StoreUpdate) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('stores').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}
