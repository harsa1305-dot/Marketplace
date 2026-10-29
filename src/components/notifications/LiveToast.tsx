'use client'
// src/components/notifications/LiveToast.tsx — Pop-up Notifikasi Realtime Melayang
import Link from 'next/link'

export interface ToastItem {
  id: string
  type: 'order' | 'chat' | 'info'
  title: string
  message: string
  link: string
  time: string
}

interface Props {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export default function LiveToast({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[#1E1E1E]/95 backdrop-blur-md border border-[#2E2E2E] rounded-2xl p-4 shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3"
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
              t.type === 'order'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}
          >
            {t.type === 'order' ? '🛍️' : '💬'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <h4 className="text-xs font-bold text-neutral-100 truncate">{t.title}</h4>
              <span className="text-[10px] text-neutral-400 flex-shrink-0">{t.time}</span>
            </div>
            <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{t.message}</p>

            <div className="mt-2.5 flex items-center gap-2">
              <Link
                href={t.link}
                onClick={() => onDismiss(t.id)}
                className={`text-[11px] font-semibold px-3 py-1 rounded-lg text-white transition-colors ${
                  t.type === 'order'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {t.type === 'order' ? 'Buka Pesanan →' : 'Balas Chat →'}
              </Link>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 px-2 py-1"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

