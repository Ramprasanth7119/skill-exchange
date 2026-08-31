'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/feedback/toast'
import { CursorGlow } from '@/components/effects/cursor'
import { DemoProvider } from '@/lib/store'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DemoProvider>
        {children}
        <CursorGlow />
      </DemoProvider>
    </ToastProvider>
  )
}
