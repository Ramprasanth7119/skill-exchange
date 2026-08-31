'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarClock, Compass, Trophy, UserRound, Wallet } from 'lucide-react'
import { Logo } from '@/components/navigation/logo'
import { NotificationBell } from '@/components/navigation/notification-bell'
import { Avatar } from '@/components/ui/avatar'
import { CreditPill } from '@/components/ui/badge'
import { useDemo } from '@/lib/store'

/** The nav balance celebrates its own changes: a pop, plus a floating ±1. */
function LiveCreditPill({ credits }: { credits: number }) {
  const previous = useRef(credits)
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    const change = credits - previous.current
    previous.current = credits
    if (change === 0) return
    setDelta(change)
    const timer = window.setTimeout(() => setDelta(null), 1100)
    return () => window.clearTimeout(timer)
  }, [credits])

  return (
    <span className="relative inline-flex">
      <span key={credits} className="animate-pop inline-flex">
        <CreditPill credits={credits} />
      </span>
      {delta !== null ? (
        <span
          aria-hidden
          className={`absolute -top-1 right-1 text-sm font-bold ${
            delta > 0 ? 'text-success' : 'text-danger'
          }`}
          style={{ animation: 'float-up 1.1s ease-out both' }}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  )
}

const LINKS = [
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/sessions', label: 'Sessions', icon: CalendarClock },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
] as const

function useNeedsAction() {
  const { sessions } = useDemo()
  // Things waiting on the viewer: requests to answer, completions to confirm,
  // finished sessions still unrated.
  return sessions.filter(
    (s) =>
      (s.status === 'REQUESTED' && s.role === 'teacher') ||
      (s.status === 'ACCEPTED' && !s.viewerConfirmed && s.counterpartConfirmed) ||
      (s.status === 'COMPLETED' && !s.viewerRated),
  ).length
}

/** Sticky top bar: full nav on desktop, logo + credits on mobile. */
export function AppHeader() {
  const pathname = usePathname()
  const { profile, hydrated } = useDemo()
  const needsAction = useNeedsAction()

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href="/discover" />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-primary-soft text-primary-deep' : 'text-ink-soft hover:bg-sunken hover:text-ink'
                }`}
              >
                {label}
                {href === '/sessions' && needsAction > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                    {needsAction}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <NotificationBell />
          {hydrated ? (
            <Link href="/wallet" aria-label={`Wallet — ${profile.credits} credits`}>
              <LiveCreditPill credits={profile.credits} />
            </Link>
          ) : (
            <span className="skeleton h-8 w-14 rounded-chip" />
          )}
          <Link
            href="/profile"
            aria-label="Your profile"
            className="hidden rounded-full transition-transform hover:scale-105 md:block"
          >
            <Avatar name={hydrated ? profile.name : '?'} size="md" />
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Bottom tab bar — the primary navigation on mobile. */
export function MobileTabBar() {
  const pathname = usePathname()
  const needsAction = useNeedsAction()

  // "Leaderboard" doesn't fit an 11px tab — shorten it on mobile only.
  const tabs = [
    ...LINKS.map((l) => (l.href === '/leaderboard' ? { ...l, label: 'Ranks' } : l)),
    { href: '/profile', label: 'Profile', icon: UserRound } as const,
  ]

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active ? 'text-primary-deep' : 'text-ink-faint'
              }`}
            >
              <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
              {label}
              {href === '/sessions' && needsAction > 0 ? (
                <span className="absolute top-1.5 right-1/2 -mr-5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {needsAction}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
