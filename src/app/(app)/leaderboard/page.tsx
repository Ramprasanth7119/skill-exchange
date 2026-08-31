'use client'

import Link from 'next/link'
import { Crown, Medal, TrendingUp, Trophy } from 'lucide-react'
import { getCampusTeachers } from '@/lib/campus'
import { useDemo } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { RatingDisplay } from '@/components/ui/rating'
import { SkeletonRows } from '@/components/ui/skeleton'
import { plural } from '@/lib/format'

/**
 * The campus leaderboard — the social-proof loop borrowed from the apps that
 * make practice sticky: visible standing, a clear metric (hours actually
 * taught), and the viewer's own rank pinned underneath as the nudge.
 */

const PODIUM_STYLES = [
  // rendered order: 2nd, 1st, 3rd — the classic podium silhouette
  { rank: 2, bar: 'h-24 bg-line-strong', delay: '120ms' },
  { rank: 1, bar: 'h-36 bg-gradient-to-t from-credit to-star', delay: '0ms' },
  { rank: 3, bar: 'h-16 bg-line', delay: '240ms' },
]

export default function LeaderboardPage() {
  const { profile, hydrated } = useDemo()

  const ranked = [...getCampusTeachers()].sort(
    (a, b) => b.sessionsTaught - a.sessionsTaught || (b.averageRating ?? 0) - (a.averageRating ?? 0),
  )
  const podium = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  const yourRank = ranked.filter((t) => t.sessionsTaught > profile.sessionsTaught).length + 1

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-chip bg-credit-soft px-3 py-1.5 text-xs font-bold text-credit-strong">
          <Trophy aria-hidden className="size-3.5" />
          This semester
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Campus leaderboard
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Ranked by hours actually taught — the only stat that earns credits.
        </p>
      </div>

      {!hydrated ? (
        <div className="mt-10">
          <SkeletonRows count={5} />
        </div>
      ) : ranked.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Trophy}
            title="The board is waiting for its first hour"
            description="As soon as sessions complete on campus, the top teachers show up here."
            action={<Button href="/discover">Find a session</Button>}
          />
        </div>
      ) : (
        <>
          {/* ---- podium ---- */}
          <div className="mt-10 flex items-end justify-center gap-3 sm:gap-6">
            {PODIUM_STYLES.map(({ rank, bar, delay }) => {
              const teacher = podium[rank - 1]
              if (!teacher) return null
              return (
                <Link
                  key={teacher.id}
                  href={`/u/${teacher.id}`}
                  className="group flex w-28 flex-col items-center gap-2 sm:w-32"
                >
                  <div
                    className="animate-fade-up flex flex-col items-center gap-2"
                    style={{ animationDelay: delay }}
                  >
                    <div className="relative">
                      {rank === 1 ? (
                        <Crown
                          aria-hidden
                          className="animate-bob-slow absolute -top-6 left-1/2 size-6 -translate-x-1/2 text-star"
                        />
                      ) : null}
                      <Avatar
                        name={teacher.name}
                        size="lg"
                        className="ring-4 ring-surface transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                    <p className="text-center text-sm leading-tight font-bold text-ink">
                      {teacher.name.split(' ')[0]}
                    </p>
                    <p className="text-xs font-semibold text-credit-strong">
                      {plural(teacher.sessionsTaught, 'hr')} taught
                    </p>
                  </div>
                  <div
                    className={`podium-bar w-full rounded-t-xl ${bar}`}
                    style={{ animationDelay: delay }}
                  >
                    <p className="pt-2 text-center font-display text-xl font-bold text-ink/70">
                      {rank}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* ---- the rest ---- */}
          {rest.length > 0 ? (
            <ul className="mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {rest.map((teacher, index) => (
                <li key={teacher.id} className="animate-fade-up" style={{ animationDelay: `${300 + index * 60}ms` }}>
                  <Link
                    href={`/u/${teacher.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sunken"
                  >
                    <span className="w-6 text-center font-display text-lg font-bold text-ink-faint">
                      {index + 4}
                    </span>
                    <Avatar name={teacher.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{teacher.name}</p>
                      <p className="text-xs text-ink-faint">
                        {teacher.skill.name} · {plural(teacher.sessionsTaught, 'hour')} taught
                      </p>
                    </div>
                    <RatingDisplay average={teacher.averageRating} count={teacher.ratingCount} showCount={false} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {/* ---- your standing ---- */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-dashed border-primary/30 bg-primary-faint px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft">
                {profile.sessionsTaught > 0 ? (
                  <Medal aria-hidden className="size-5 text-primary" />
                ) : (
                  <TrendingUp aria-hidden className="size-5 text-primary" />
                )}
              </span>
              <div>
                <p className="text-sm font-bold text-ink">
                  {profile.sessionsTaught > 0
                    ? `You're #${yourRank} with ${plural(profile.sessionsTaught, 'hour')} taught`
                    : 'You are one session away from this board'}
                </p>
                <p className="text-xs text-ink-soft">
                  Every hour you teach moves you up — and earns a credit.
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" href="/profile">
              Add a skill to teach
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
