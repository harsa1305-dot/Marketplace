// ============================================================
// lib/models/order.model.ts
// Pengganti: app/Models/Order.php + app/Models/OrderItem.php
// ============================================================
import type { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/server'

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
export type OrderStatus = Order['status']

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { products: { id: number; name: string; image: string | null } })[]
  stores: { id: number; name: string }
}

export async function getOrdersByBuyer(buyerId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, stores (id, name), order_items (*, products (id, name, image))`)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as OrderWithItems[]
}

export async function getOrdersByStore(storeId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items (*, products (id, name, image))`)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function getOrderById(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`*, stores (id, name, address), order_items (*, products (id, name, image, price))`)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/** Buat order sekaligus order_items — dalam satu transaksi (RPC) */
export async function createOrder(
  order: Omit<OrderInsert, 'id'>,
  items: Omit<OrderItemInsert, 'order_id'>[]
) {
  const supabase = await createClient()

  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single()

  if (orderErr) throw new Error(orderErr.message)

  const itemsWithOrderId = items.map(item => ({ ...item, order_id: newOrder.id }))
  const { error: itemsErr } = await supabase.from('order_items').insert(itemsWithOrderId)
  if (itemsErr) throw new Error(itemsErr.message)

  return newOrder
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
