// ============================================================
// types/supabase.ts
// TypeScript types yang di-generate dari skema Supabase SkalaShop
// Mencerminkan seluruh tabel di supabase_migration.sql
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          auth_id: string | null        // UUID dari Supabase Auth
          name: string
          username: string
          email: string
          password: string
          avatar: string | null
          phone: string
          recovery_question: string | null
          recovery_answer: string | null
          remember_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          auth_id?: string | null       // UUID dari Supabase Auth
          name: string
          username: string
          email: string
          password: string
          avatar?: string | null
          phone: string
          recovery_question?: string | null
          recovery_answer?: string | null
          remember_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          auth_id?: string | null
          name?: string
          username?: string
          email?: string
          password?: string
          avatar?: string | null
          phone?: string
          recovery_question?: string | null
          recovery_answer?: string | null
          remember_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: number
          user_id: number
          name: string
          description: string | null
          logo: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: number
          name: string
          description?: string | null
          logo?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: number
          name?: string
          description?: string | null
          logo?: string | null
          address?: string | null
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      products: {
        Row: {
          id: number
          store_id: number
          category_id: number | null
          name: string
          description: string | null
          price: number
          stock: number
          image: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          store_id: number
          category_id?: number | null
          name: string
          description?: string | null
          price?: number
          stock?: number
          image?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          store_id?: number
          category_id?: number | null
          name?: string
          description?: string | null
          price?: number
          stock?: number
          image?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      cart: {
        Row: {
          id: number
          user_id: number
          product_id: number
          quantity: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: number
          product_id: number
          quantity?: number
          created_at?: string
        }
        Update: {
          quantity?: number
        }
      }
      orders: {
        Row: {
          id: number
          buyer_id: number
          store_id: number
          total_price: number
          status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
          shipping_address: string
          payment_method: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          buyer_id: number
          store_id: number
          total_price?: number
          status?: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
          shipping_address: string
          payment_method?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          total_price?: number
          status?: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'
          shipping_address?: string
          notes?: string | null
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: number
          order_id: number
          product_id: number
          quantity: number
          price: number
        }
        Insert: {
          id?: number
          order_id: number
          product_id: number
          quantity?: number
          price: number
        }
        Update: {
          quantity?: number
          price?: number
        }
      }
      reviews: {
        Row: {
          id: number
          product_id: number
          user_id: number
          rating: 1 | 2 | 3 | 4 | 5
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: number
          product_id: number
          user_id: number
          rating: 1 | 2 | 3 | 4 | 5
          comment?: string | null
          created_at?: string
        }
        Update: {
          rating?: 1 | 2 | 3 | 4 | 5
          comment?: string | null
        }
      }
      chats: {
        Row: {
          id: number
          buyer_id: number
          store_id: number
          created_at: string
        }
        Insert: {
          id?: number
          buyer_id: number
          store_id: number
          created_at?: string
        }
        Update: Record<string, never>
      }
      chat_messages: {
        Row: {
          id: number
          chat_id: number
          sender_id: number
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: number
          chat_id: number
          sender_id: number
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ── Convenience type aliases ──────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type User      = Tables<'users'>
export type Store     = Tables<'stores'>
export type Category  = Tables<'categories'>
export type Product   = Tables<'products'>
export type Cart      = Tables<'cart'>
export type Order     = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type Review    = Tables<'reviews'>
export type Chat      = Tables<'chats'>
export type ChatMessage = Tables<'chat_messages'>

// ── Order status enum ─────────────────────────────────────────
export type OrderStatus = Order['status']
