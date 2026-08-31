'use client'

import Link from 'next/link'
import type { FeedbackNote } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { Reveal } from '@/components/effects/reveal'
import { isDemoMode } from '@/lib/env'
import { useDemo } from '@/lib/store'

/**
 * "Hear it from campus" — the shout-out wall. Server passes the published
 * notes; in demo mode the viewer's own note (kept in the local store) is
 * merged in on top, so leaving a note visibly lands on the wall even before
 * a backend exists.
 */
export function VoiceWall({ voices }: { voices: FeedbackNote[] }) {
  const { feedback, profile, hydrated, onboarded } = useDemo()

  const all: FeedbackNote[] =
    isDemoMode() && hydrated && onboarded && feedback
      ? [
          {
            id: 'v-you',
            message: feedback,
            author: {
              id: profile.id,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              branch: profile.branch,
              year: profile.year,
            },
            createdAt: new Date(),
          },
          ...voices,
        ]
      : voices

  if (all.length === 0) return null

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Hear it from campus
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-ink-soft">
            In their own words — every note here was left by a student after
            real sessions.
          </p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((voice, index) => (
            <Reveal
              key={voice.id}
              delay={index * 110}
              className={`flex flex-col rounded-card border p-6 shadow-sm ${
                voice.id === 'v-you'
                  ? 'border-credit/30 bg-credit-soft/40'
                  : 'border-line bg-paper'
              } ${['-rotate-1', 'rotate-1', '-rotate-1'][index % 3]} transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-lg hover:shadow-ink/5`}
            >
              <span aria-hidden className="font-display text-4xl leading-none font-bold text-credit">
                &ldquo;
              </span>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-ink">{voice.message}</p>
              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <Avatar name={voice.author.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {voice.author.name}
                    {voice.id === 'v-you' ? (
                      <span className="ml-1.5 text-xs font-semibold text-credit-strong">you</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {[voice.author.branch, voice.author.year ? `Year ${voice.author.year}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-ink-faint">
          Used SkillSwap? Leave your own note from your{' '}
          <Link href="/profile" className="font-semibold text-primary hover:underline">
            profile page
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
