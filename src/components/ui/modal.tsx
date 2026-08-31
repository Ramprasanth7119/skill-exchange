'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Dialog that renders as a centered modal on desktop and a bottom sheet on
 * mobile — one component, so flows behave consistently. Handles Escape,
 * overlay click, initial focus, focus return and body scroll locking.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  // Parents recreate onClose on every render (toasts and live demo events
  // re-render them constantly). Route it through a ref so the effects below
  // depend ONLY on `open` — otherwise the focus effect re-fires mid-typing and
  // yanks the cursor out of whatever field the student is writing in.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    previousFocus.current = document.activeElement as HTMLElement | null
    // Focus the panel only on open — never steal focus after that.
    panelRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previousFocus.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        aria-label="Close dialog"
        onClick={() => onCloseRef.current()}
        className="animate-fade-in absolute inset-0 cursor-default bg-ink/40"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`animate-pop relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl shadow-ink/20 outline-none sm:rounded-3xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
