// src/app/(main)/store/products/[id]/edit/page.tsx — Edit Produk
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ProductForm from '../../new/ProductForm'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single() as
    { data: { id: number } | null; error: unknown }
  if (!profile) redirect('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('user_id', profile.id).maybeSingle()
  if (!store) redirect('/store')

  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, description, price, stock, category_id, image, is_active')
    .eq('id', Number(id))
    .eq('store_id', store.id) // pastikan produk milik toko ini
    .single()

  if (error || !product) notFound()

  const { data: categories } = await supabase
    .from('categories').select('id, name').order('name')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/store" className="text-neutral-400 hover:text-blue-400 transition-colors">← Dashboard</Link>
        <span className="text-neutral-600">/</span>
        <h1 className="text-xl font-bold text-neutral-100">Edit Produk</h1>
      </div>
      <ProductForm
        storeId={store.id}
        categories={categories as { id: number; name: string }[] ?? []}
        defaultValues={{
          id:          product.id,
          name:        product.name,
          description: product.description ?? '',
          price:       Number(product.price),
          stock:       product.stock,
          category_id: product.category_id,
          image:       product.image,
          is_active:   product.is_active,
        }}
      />
    </div>
  )
}

