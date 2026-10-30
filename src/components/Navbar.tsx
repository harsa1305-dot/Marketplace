"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, MessageSquare, LogIn, LogOut, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  user?: any;
  profile?: any;
  store?: any;
  unreadChatCount?: number;
  initialUnreadChats?: number;
  cartCount?: number;
  initialPendingOrders?: number;
}

export default function Navbar({
  user,
  profile,
  store,
  unreadChatCount = 0,
  initialUnreadChats,
  cartCount = 0,
  initialPendingOrders,
}: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const effectiveChatCount = initialUnreadChats !== undefined ? initialUnreadChats : unreadChatCount;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2E2E2E] bg-[#121212]/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 font-black text-xs tracking-tighter">
            COD
          </span>
          <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent font-black tracking-tight">
            COD<span className="text-blue-500">-In</span>
          </span>
        </Link>

        <div className="hidden max-w-md flex-1 sm:block">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = (form.elements.namedItem("search") as HTMLInputElement)?.value;
              if (input !== undefined) {
                router.push(`/?search=${encodeURIComponent(input.trim())}`);
              }
            }}
            className="relative"
          >
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              name="search"
              type="text"
              placeholder="Cari produk atau toko murah..."
              className="w-full rounded-full border border-[#2E2E2E] bg-[#1E1E1E] py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#2E2E2E] bg-[#1E1E1E] text-neutral-300 hover:border-blue-500/50 hover:text-white transition"
            title="Pesan / Chat"
          >
            <MessageSquare className="h-5 w-5" />
            {effectiveChatCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-[#121212] shadow-sm shadow-blue-500/30">
                {effectiveChatCount > 99 ? "99+" : effectiveChatCount}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#2E2E2E] bg-[#1E1E1E] text-neutral-300 hover:border-blue-500/50 hover:text-white transition"
            title="Keranjang"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-[#121212] shadow-sm shadow-blue-500/30">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              {store && (
                <Link
                  href="/store"
                  className="relative flex items-center gap-1.5 rounded-full border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-blue-500/50 hover:text-white transition"
                  title="Toko Saya"
                >
                  <Store className="h-3.5 w-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Toko Saya</span>
                  {initialPendingOrders !== undefined && initialPendingOrders > 0 && (
                    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white ring-1 ring-[#121212]">
                      {initialPendingOrders}
                    </span>
                  )}
                </Link>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-[#2E2E2E] bg-[#1E1E1E] p-1.5 pr-3 text-sm font-medium text-neutral-200 hover:border-blue-500/50 transition"
                title="Profil Pengguna"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-xs">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden md:inline max-w-[100px] truncate">{profile?.name || user.user_metadata?.username || user.email?.split('@')[0] || "Profil"}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-full border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition"
                title="Keluar dari Akun"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 transition active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

