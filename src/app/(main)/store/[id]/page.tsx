// src/app/(main)/store/[id]/page.tsx — Halaman Toko Publik
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, description, logo, address')
    .eq('id', Number(id))
    .single()

  if (error || !store) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, image, stock')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div>
      {/* Header toko */}
      <div className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#2E2E2E] flex items-center justify-center text-4xl overflow-hidden flex-shrink-0">
              {store.logo
                ? <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                : '🏪'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-100">{store.name}</h1>
              {store.address && <p className="text-sm text-neutral-400 mt-0.5">📍 {store.address}</p>}
              {store.description && <p className="text-sm text-neutral-300 mt-2">{store.description}</p>}
            </div>
          </div>
          <Link
            href={`/chat?store_id=${store.id}`}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-600/20 self-start sm:self-center"
          >
            💬 Chat Penjual
          </Link>
        </div>
      </div>

      {/* Produk toko */}
      <h2 className="text-lg font-bold text-neutral-100 mb-4">
        Produk ({products?.length ?? 0})
      </h2>

      {!products || products.length === 0 ? (
        <div className="text-center py-16 bg-[#1E1E1E] border border-[#2E2E2E] rounded-2xl text-neutral-400">
          <p className="text-4xl mb-3">📦</p>
          <p>Toko ini belum memiliki produk.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product: any) => {
            const isSoldOut = Number(product.stock) <= 0

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-[#1E1E1E] border border-[#2E2E2E] rounded-xl hover:border-blue-500/50 transition-all overflow-hidden group flex flex-col justify-between"
              >
                <div className="aspect-square bg-[#121212] overflow-hidden relative">
                  {isSoldOut && (
                    <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider flex items-center gap-1">
                      <span>🚫</span>
                      <span>Sold Out</span>
                    </div>
                  )}

                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                        isSoldOut ? 'opacity-70 grayscale-[25%]' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-neutral-600">
                      📦
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-neutral-100 line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  <p className="text-blue-400 font-bold text-sm">
                    Rp {Number(product.price).toLocaleString('id-ID')}
                  </p>
                  <div className="mt-2 pt-2 border-t border-[#2E2E2E] flex items-center justify-between text-xs">
                    {isSoldOut ? (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded">
                        Stok Habis
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Sisa {product.stock}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

