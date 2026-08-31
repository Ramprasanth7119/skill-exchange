'use client'

import Link from 'next/link'
import { CalendarClock, ChevronRight, MapPin, Video } from 'lucide-react'
import type { SessionSummary } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/badge'
import { formatSessionTime } from '@/lib/format'

/** What, if anything, is waiting on the viewer for this session. */
export function actionHint(session: SessionSummary): string | null {
  if (session.status === 'REQUESTED' && session.role === 'teacher') return 'Respond to request'
  if (session.status === 'ACCEPTED' && !session.viewerConfirmed && session.counterpartConfirmed)
    return 'Confirm it happened'
  if (session.status === 'COMPLETED' && !session.viewerRated) return 'Leave a rating'
  return null
}

export function SessionCard({ session }: { session: SessionSummary }) {
  const hint = actionHint(session)
  const ModeIcon = session.mode === 'ONLINE' ? Video : MapPin

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 transition-all duration-200 hover:border-line-strong hover:shadow-md hover:shadow-ink/5 sm:p-5"
    >
      <Avatar name={session.counterpart.name} size="lg" className="hidden sm:inline-flex" />
      <Avatar name={session.counterpart.name} size="md" className="sm:hidden" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display font-bold text-ink">
            {session.role === 'teacher' ? 'Teaching' : 'Learning'} {session.skill.name}
          </p>
          <StatusBadge status={session.status} />
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-soft">
          {session.role === 'teacher' ? 'for' : 'with'} {session.counterpart.name}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <CalendarClock aria-hidden className="size-3.5" />
            {session.scheduledAt ? formatSessionTime(session.scheduledAt) : 'Time not set'}
          </span>
          <span className="inline-flex items-center gap-1">
            <ModeIcon aria-hidden className="size-3.5" />
            {session.mode === 'ONLINE' ? 'Online' : session.location ?? 'In person'}
          </span>
        </p>
        {hint ? (
          <p className="mt-2 inline-flex rounded-chip bg-pending-soft px-2.5 py-1 text-xs font-bold text-pending">
            {hint} →
          </p>
        ) : null}
      </div>

      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  )
}
