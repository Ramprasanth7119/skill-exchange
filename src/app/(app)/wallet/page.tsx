'use client'

import { Coins, GraduationCap, Info, Sparkles } from 'lucide-react'
import { useDemo } from '@/lib/store'
import { useCountUp } from '@/components/effects/use-count-up'
import { formatDay, plural } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton, SkeletonRows } from '@/components/ui/skeleton'

const REASON_ICONS = {
  SIGNUP_BONUS: Sparkles,
  SESSION_COMPLETED: GraduationCap,
  ADJUSTMENT: Info,
} as const

export default function WalletPage() {
  const { profile, ledger, hydrated } = useDemo()
  const animatedCredits = useCountUp(profile.credits)

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      {/* ---- hero: time, not money ---- */}
      <div className="relative overflow-hidden rounded-card bg-ink px-6 py-10 text-center">
        <Coins
          aria-hidden
          className="absolute -right-8 -bottom-10 size-44 rotate-12 text-star opacity-10"
        />
        <p className="text-xs font-bold tracking-[0.2em] text-paper/60 uppercase">
          Your time
        </p>
        {hydrated ? (
          <p className="mt-3 flex items-baseline justify-center gap-2 font-display text-paper">
            <Coins aria-hidden className="size-8 translate-y-1 text-star" />
            <span className="text-7xl font-bold tabular-nums">{animatedCredits}</span>
            <span className="text-xl font-semibold text-paper/70">
              {profile.credits === 1 ? 'credit' : 'credits'}
            </span>
          </p>
        ) : (
          <Skeleton className="mx-auto mt-3 h-16 w-40 bg-paper/10" />
        )}
        {hydrated ? (
          <p className="mt-3 text-sm text-paper/70">
            You&apos;ve taught {plural(profile.sessionsTaught, 'hour')} and learned{' '}
            {plural(profile.sessionsLearned, 'hour')}.
          </p>
        ) : null}
        <p className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-chip bg-paper/10 px-3 py-1.5 text-xs font-semibold text-paper/80">
          <Info aria-hidden className="size-3.5" />1 credit = 1 hour of someone&apos;s time
        </p>
      </div>

      {/* ---- zero-balance nudge ---- */}
      {hydrated && profile.credits === 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-credit/20 bg-credit-soft px-5 py-4">
          <p className="text-sm font-medium text-credit-strong">
            Out of credits — teach an hour of anything to earn one back.
          </p>
          <Button size="sm" variant="secondary" href="/profile">
            Add a skill you teach
          </Button>
        </div>
      ) : null}

      {/* ---- ledger ---- */}
      <h2 className="mt-8 font-display text-lg font-bold text-ink">History</h2>
      <div className="mt-3">
        {!hydrated ? (
          <SkeletonRows count={4} />
        ) : ledger.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="Your first credit is waiting"
            description="Teach someone for one hour and start your learning journey."
            action={<Button href="/profile">Add skills you can teach</Button>}
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {ledger.map((entry) => {
              const Icon = REASON_ICONS[entry.reason]
              const earned = entry.delta > 0
              return (
                <li key={entry.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      earned ? 'bg-success-soft' : 'bg-sunken'
                    }`}
                  >
                    <Icon
                      aria-hidden
                      className={`size-5 ${earned ? 'text-success' : 'text-ink-faint'}`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {entry.description}
                    </p>
                    <p className="text-xs text-ink-faint">{formatDay(entry.createdAt)}</p>
                  </div>
                  <span
                    className={`font-display text-lg font-bold tabular-nums ${
                      earned ? 'text-success' : 'text-ink-soft'
                    }`}
                  >
                    {earned ? '+' : ''}
                    {entry.delta}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-ink-faint">
        Credits never expire, and every entry above is an hour two students spent
        together. That&apos;s the whole economy.
      </p>
    </div>
  )
}
