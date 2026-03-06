"use client"

import { useToast } from "./use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  const visible = toasts.filter((t) => t.open)
  if (visible.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {visible.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2 ${
            t.variant === "destructive"
              ? "bg-red-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          <div className="flex-1 min-w-0">
            {t.title && <div className="font-semibold leading-snug">{t.title}</div>}
            {t.description && (
              <div className="mt-1 opacity-90 leading-snug">{t.description}</div>
            )}
            {t.action}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none mt-0.5"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
