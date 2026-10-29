// src/types/database.d.ts
// Declare global Database type agar Supabase client auto-typed
import type { Database } from './supabase'

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from<T extends keyof Database['public']['Tables']>(
      table: T
    ): ReturnType<import('@supabase/supabase-js').SupabaseClient['from']>
  }
}

