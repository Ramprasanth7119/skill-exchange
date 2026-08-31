import type { ReactNode } from 'react'
import { AppHeader, MobileTabBar } from '@/components/navigation/app-nav'
import { RequireOnboarding } from '@/components/navigation/require-onboarding'

/** Shell for the signed-in app: sticky header, mobile tab bar, page container. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">
        <RequireOnboarding>{children}</RequireOnboarding>
      </main>
      <MobileTabBar />
    </div>
  )
}
