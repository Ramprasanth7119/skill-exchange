'use client'

import type { ReactNode } from 'react'
import type { ClientState } from '@/lib/types'
import { ToastProvider } from '@/components/feedback/toast'
import { CursorGlow } from '@/components/effects/cursor'
import { DemoProvider } from '@/lib/store'
import { LiveProvider } from '@/lib/live-store'

/**
 * `initial` is non-null exactly when Supabase is configured: the root layout
 * loads the real client state on the server and passes it down, and the app
 * runs against the backend. Without it, the local demo store takes over.
 */
export function Providers({
  initial,
  children,
}: {
  initial: ClientState | null
  children: ReactNode
}) {
  return (
    <ToastProvider>
      {initial ? (
        <LiveProvider initial={initial}>
          {children}
          <CursorGlow />
        </LiveProvider>
      ) : (
        <DemoProvider>
          {children}
          <CursorGlow />
        </DemoProvider>
      )}
    </ToastProvider>
  )
}
