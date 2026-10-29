"use client";

import Link from "next/link";
import { Truck } from "lucide-react";

interface ProductProps {
  id: string | number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  store_id?: string | number;
}

export default function ProductCard({ product }: { product: ProductProps }) {
  const isSoldOut = product.stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#2E2E2E] bg-[#1E1E1E] p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#121212]">
        <img
          src={product.image_url || "/placeholder.png"}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isSoldOut ? "opacity-30 grayscale" : ""
          }`}
        />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-neutral-950/80 px-2.5 py-1 text-[10px] font-medium text-emerald-400 backdrop-blur-md border border-emerald-500/20">
          <Truck className="h-3 w-3" />
          <span>Bayar COD</span>
        </div>
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-red-500/20 px-3.5 py-1 text-xs font-bold text-red-400 border border-red-500/30">
              Sold Out / Habis
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-blue-400 uppercase">
            {product.category || "Umum"}
          </span>
          <Link href={`/products/${product.id}`}>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-100 group-hover:text-blue-400 transition">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-3 border-t border-[#2E2E2E] pt-2.5">
          <p className="text-base font-extrabold text-white">
            Rp {product.price.toLocaleString("id-ID")}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={isSoldOut ? "text-neutral-500" : "text-neutral-400"}>
              Stok:{" "}
              <strong className={isSoldOut ? "text-red-400" : "text-emerald-400"}>
                {product.stock}
              </strong>
            </span>
            <Link
              href={`/products/${product.id}`}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all inline-block text-center ${
                isSoldOut
                  ? "bg-[#121212] text-neutral-600 cursor-not-allowed border border-[#2E2E2E] pointer-events-none"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95"
              }`}
            >
              {isSoldOut ? "Habis" : "+ Keranjang"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

