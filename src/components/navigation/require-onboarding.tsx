'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { isDemoMode } from '@/lib/env'
import { useDemo } from '@/lib/store'
import { SkeletonList } from '@/components/ui/skeleton'

/**
 * The app shell is only for members. Until the store has hydrated we show
 * skeletons; once we know there's no account, the visitor goes to /login in
 * demo mode — but to /onboarding in live mode, where the proxy has already
 * guaranteed they're signed in and only the profile row is missing. (Sending
 * them to /login there would ping-pong: the proxy bounces signed-in users
 * straight back off /login.)
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { hydrated, onboarded } = useDemo()
  const router = useRouter()

  useEffect(() => {
    if (hydrated && !onboarded) {
      router.replace(isDemoMode() ? '/login' : '/onboarding')
    }
  }, [hydrated, onboarded, router])

  if (!hydrated || !onboarded) {
    return (
      <div className="pt-2">
        <SkeletonList count={6} />
      </div>
    )
  }

  return <>{children}</>
}
