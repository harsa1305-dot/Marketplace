// ============================================================
// lib/supabase/client.ts  —  Browser-side Supabase client
// Dipakai di Client Components (use client)
// ============================================================
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwnphrmqpxdyfdrjlnyt.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_drd33tK4O6w7j-07FIHk4g_9cccRRwv'

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
