'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDemo } from '@/lib/store'
import { SkeletonList } from '@/components/ui/skeleton'

/**
 * The app shell is only for members. Until the store has hydrated we show
 * skeletons; once we know there's no account, we hand the visitor to /login —
 * the same shape the real auth check will have in Phase B.
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { hydrated, onboarded } = useDemo()
  const router = useRouter()

  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/login')
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
