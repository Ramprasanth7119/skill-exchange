'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, Compass } from 'lucide-react'
import type { SessionSummary } from '@/lib/types'
import { useDemo } from '@/lib/store'
import { SessionCard, actionHint } from '@/components/sessions/session-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs } from '@/components/ui/tabs'
import { SkeletonRows } from '@/components/ui/skeleton'

type Group = 'upcoming' | 'pending' | 'completed' | 'archive'

const GROUPS: Record<Group, (s: SessionSummary) => boolean> = {
  upcoming: (s) => s.status === 'ACCEPTED',
  pending: (s) => s.status === 'REQUESTED',
  completed: (s) => s.status === 'COMPLETED',
  archive: (s) => s.status === 'CANCELLED' || s.status === 'DECLINED',
}

const EMPTY_COPY: Record<Group, { title: string; description: string }> = {
  upcoming: {
    title: 'No upcoming sessions yet',
    description: 'Your next learning experience could start here. Find a teacher and book an hour.',
  },
  pending: {
    title: 'No pending requests',
    description: 'Requests you send — and requests waiting on your reply — will show up here.',
  },
  completed: {
    title: 'Nothing completed yet',
    description: 'Once you finish your first session, it lands here with your rating.',
  },
  archive: {
    title: 'Nothing in the archive',
    description: 'Cancelled and declined sessions end up here. Hopefully it stays empty.',
  },
}

export default function SessionsPage() {
  const { sessions, hydrated } = useDemo()
  const [group, setGroup] = useState<Group>(() => {
    const firstWithItems = (Object.keys(GROUPS) as Group[]).find((g) =>
      sessions.some(GROUPS[g]),
    )
    return firstWithItems ?? 'upcoming'
  })

  const counts = useMemo(() => {
    const result = {} as Record<Group, number>
    for (const g of Object.keys(GROUPS) as Group[]) {
      result[g] = sessions.filter(GROUPS[g]).length
    }
    return result
  }, [sessions])

  const visible = useMemo(() => {
    return sessions
      .filter(GROUPS[group])
      .sort((a, b) => {
        // Things waiting on the viewer first, then soonest scheduled.
        const aHint = actionHint(a) ? 1 : 0
        const bHint = actionHint(b) ? 1 : 0
        if (aHint !== bHint) return bHint - aHint
        const aTime = a.scheduledAt?.getTime() ?? a.createdAt.getTime()
        const bTime = b.scheduledAt?.getTime() ?? b.createdAt.getTime()
        return group === 'upcoming' ? aTime - bTime : bTime - aTime
      })
  }, [sessions, group])

  const needsAction = sessions.filter((s) => actionHint(s)).length

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Your sessions
          </h1>
          {hydrated && needsAction > 0 ? (
            <p className="mt-1 text-sm font-medium text-pending">
              {needsAction} thing{needsAction === 1 ? '' : 's'} waiting on you
            </p>
          ) : null}
        </div>
        <Button variant="secondary" size="sm" href="/discover">
          <CalendarPlus aria-hidden className="size-4" />
          Book a session
        </Button>
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { value: 'pending', label: 'Pending', count: counts.pending },
            { value: 'completed', label: 'Completed', count: counts.completed },
            { value: 'archive', label: 'Archive', count: counts.archive },
          ]}
          active={group}
          onChange={setGroup}
        />
      </div>

      <div className="mt-6 space-y-3">
        {!hydrated ? (
          <SkeletonRows count={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={EMPTY_COPY[group].title}
            description={EMPTY_COPY[group].description}
            action={
              group === 'upcoming' || group === 'pending' ? (
                <Button href="/discover">Discover a skill</Button>
              ) : undefined
            }
          />
        ) : (
          visible.map((session, index) => (
            <div
              key={session.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
            >
              <SessionCard session={session} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
