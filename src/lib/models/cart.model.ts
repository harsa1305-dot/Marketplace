// ============================================================
// lib/models/cart.model.ts
// Pengganti: app/Models/Cart.php
// ============================================================
import type { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/server'

export type Cart = Database['public']['Tables']['cart']['Row']

export interface CartWithProduct extends Cart {
  products: {
    id: number
    name: string
    price: number
    image: string | null
    stock: number
    is_active: boolean
    stores: { id: number; name: string }
  }
}

export async function getCartByUser(userId: number): Promise<CartWithProduct[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cart')
    .select(`*, products (id, name, price, image, stock, is_active, stores (id, name))`)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return data as CartWithProduct[]
}

/** Tambah atau update quantity (UPSERT — unique: user_id + product_id) */
export async function upsertCart(userId: number, productId: number, quantity: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cart')
    .upsert({ user_id: userId, product_id: productId, quantity },
             { onConflict: 'user_id,product_id' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function removeFromCart(userId: number, productId: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cart')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  if (error) throw new Error(error.message)
}

export async function clearCart(userId: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('cart').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}
