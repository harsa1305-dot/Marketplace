// src/app/(main)/store/products/new/page.tsx — Tambah Produk Baru
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProductForm from './ProductForm'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single() as
    { data: { id: number } | null; error: unknown }
  if (!profile) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id, name').eq('user_id', profile.id).maybeSingle()
  if (!store) redirect('/store')

  const { data: categories } = await supabase
    .from('categories').select('id, name').order('name')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/store" className="text-neutral-400 hover:text-blue-400 transition-colors">← Dashboard</Link>
        <span className="text-neutral-600">/</span>
        <h1 className="text-xl font-bold text-neutral-100">Tambah Produk Baru</h1>
      </div>
      <ProductForm storeId={store.id} categories={categories as { id: number; name: string }[] ?? []} />
    </div>
  )
}

