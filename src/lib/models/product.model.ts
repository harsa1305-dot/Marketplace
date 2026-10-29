// ============================================================
// lib/models/product.model.ts
// Pengganti: app/Models/Product.php (Eloquent)
// ============================================================
import type { Database } from '@/types/supabase'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

/** Product dengan relasi store & category (JOIN) */
export interface ProductWithRelations extends Product {
  stores?: { id: number; name: string; logo: string | null }
  categories?: { id: number; name: string } | null
}

// ── Query helpers ─────────────────────────────────────────────
// Dipakai di Server Actions / Route Handlers
import { createClient } from '@/lib/supabase/server'

export async function getProducts(filters?: {
  categoryId?: number
  storeId?: number
  search?: string
  isActive?: boolean
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(`
      *,
      stores (id, name, logo),
      categories (id, name)
    `)

  if (filters?.categoryId)        query = query.eq('category_id', filters.categoryId)
  if (filters?.storeId)           query = query.eq('store_id', filters.storeId)
  if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive)
  if (filters?.search)            query = query.ilike('name', `%${filters.search}%`)
  if (filters?.limit)             query = query.limit(filters.limit)
  if (filters?.offset)            query = query.range(filters.offset, (filters.offset + (filters.limit ?? 20)) - 1)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as ProductWithRelations[]
}

export async function getProductById(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`*, stores (id, name, logo, address), categories (id, name), reviews (rating)`)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createProduct(payload: ProductInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProduct(id: number, payload: ProductUpdate) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProduct(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
