// ============================================================
// lib/models/review.model.ts
// Pengganti: app/Models/Review.php
// ============================================================
import type { Database } from '@/types/supabase'
import { createClient } from '@/lib/supabase/server'

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']

export interface ReviewWithUser extends Review {
  users: { id: number; name: string; avatar: string | null }
}

export async function getReviewsByProduct(productId: number): Promise<ReviewWithUser[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, users (id, name, avatar)`)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as ReviewWithUser[]
}

export async function createReview(payload: ReviewInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('reviews').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function getAverageRating(productId: number): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return 0
  return data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length
}
