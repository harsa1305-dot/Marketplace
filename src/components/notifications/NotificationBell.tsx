'use client'
// src/components/notifications/NotificationBell.tsx — Komponen Lonceng Notifikasi Navbar
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { ToastItem } from './LiveToast'

interface Props {
  notifications: ToastItem[]
  onClear: () => void
  onItemClick: (id: string) => void
}

export default function NotificationBell({ notifications, onClear, onItemClick }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Klik di luar menutup dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const count = notifications.length

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 text-neutral-400 hover:text-blue-400 rounded-lg hover:bg-[#2E2E2E] transition-colors flex items-center justify-center"
        title="Notifikasi Langsung"
        aria-label="Notifikasi Langsung"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#1E1E1E] shadow-2xl border border-[#2E2E2E] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between p-3.5 bg-[#121212] border-b border-[#2E2E2E]">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="text-xs font-bold text-neutral-100">Notifikasi Terbaru</h3>
              {count > 0 && (
                <span className="text-[10px] bg-rose-950/40 text-rose-400 border border-rose-800/40 font-bold px-1.5 py-0.5 rounded-full">
                  {count} Baru
                </span>
              )}
            </div>

            {count > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#2E2E2E] p-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-neutral-400">
                <p className="text-2xl mb-1">📭</p>
                <p className="text-xs font-medium text-neutral-300">Belum ada notifikasi baru</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Notifikasi pesanan &amp; chat akan muncul di sini secara realtime.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => {
                    onItemClick(n.id)
                    setOpen(false)
                  }}
                  className="p-3 hover:bg-[#2E2E2E] rounded-xl transition-colors flex items-start gap-3 group block"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                      n.type === 'order' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {n.type === 'order' ? '🛍️' : '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-neutral-100 group-hover:text-blue-400 truncate">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-neutral-400 flex-shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

