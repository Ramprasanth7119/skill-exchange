'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Coins, Info, XCircle } from 'lucide-react'

type ToastKind = 'success' | 'credit' | 'info' | 'error'

type Toast = {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

type ToastContextValue = {
  toast: (kind: ToastKind, title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx.toast
}

const KIND_STYLES: Record<ToastKind, { icon: typeof Info; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-success' },
  credit: { icon: Coins, accent: 'text-credit' },
  info: { icon: Info, accent: 'text-upcoming' },
  error: { icon: XCircle, accent: 'text-danger' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const toast = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = nextId.current++
    setToasts((current) => [...current.slice(-2), { id, kind, title, description }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 3800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Above the mobile tab bar; bottom-right on desktop. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map(({ id, kind, title, description }) => {
          const { icon: Icon, accent } = KIND_STYLES[kind]
          return (
            <div
              key={id}
              role="status"
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg shadow-ink/5"
            >
              <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${accent}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{title}</p>
                {description ? (
                  <p className="mt-0.5 text-sm text-ink-soft">{description}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
