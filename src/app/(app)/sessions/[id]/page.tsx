'use client'

import { use, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CircleSlash,
  Clock,
  Coins,
  Compass,
  Hourglass,
  MapPin,
  MessageCircle,
  PartyPopper,
  Video,
} from 'lucide-react'
import type { SessionMode, SessionStatus } from '@/lib/types'
import { useDemo } from '@/lib/store'
import { Confetti } from '@/components/effects/confetti'
import { useToast } from '@/components/feedback/toast'
import { formatSessionTime } from '@/lib/format'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { SkillChip } from '@/components/ui/chip'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { RatingInput } from '@/components/ui/rating'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonRows } from '@/components/ui/skeleton'

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    sessions,
    hydrated,
    acceptSession,
    declineSession,
    cancelSession,
    confirmAttendance,
    rateSession,
  } = useDemo()
  const toast = useToast()

  // Accept-form state (teacher answering a request)
  const [when, setWhen] = useState('')
  const [mode, setMode] = useState<SessionMode | null>(null)
  const [place, setPlace] = useState('')
  const [formError, setFormError] = useState<string | undefined>()

  // Rating state
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')

  const session = sessions.find((s) => s.id === id)

  // Fire confetti at the exact moment the session settles while being watched.
  const prevStatus = useRef<SessionStatus | null>(null)
  const [burst, setBurst] = useState<number | null>(null)
  const status = session?.status ?? null
  useEffect(() => {
    if (!status) return
    if (prevStatus.current && prevStatus.current !== 'COMPLETED' && status === 'COMPLETED') {
      setBurst((b) => (b ?? 0) + 1)
    }
    prevStatus.current = status
  }, [status])

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl">
        <SkeletonRows count={3} />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={CircleSlash}
          title="Session not found"
          description="It may belong to a different account, or the link is stale."
          action={<Button href="/sessions">Back to sessions</Button>}
        />
      </div>
    )
  }

  const firstName = session.counterpart.name.split(' ')[0]
  const effectiveMode = mode ?? session.mode

  function accept(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    if (!when) {
      setFormError('Pick a date and time — you can still coordinate details on WhatsApp.')
      return
    }
    acceptSession(session.id, {
      scheduledAt: new Date(when),
      mode: effectiveMode,
      location: effectiveMode === 'IN_PERSON' ? place.trim() || null : null,
      meetLink: effectiveMode === 'ONLINE' ? place.trim() || null : null,
    })
    toast('success', 'Session confirmed', `${firstName} has been notified.`)
  }

  function decline() {
    if (!session) return
    declineSession(session.id)
    toast('info', 'Request declined', 'No credit was involved.')
  }

  function cancel() {
    if (!session) return
    cancelSession(session.id)
    toast('info', 'Session cancelled', 'No credit moved.')
  }

  function confirm() {
    if (!session) return
    confirmAttendance(session.id)
    if (!session.counterpartConfirmed) {
      toast('info', 'Marked as attended', `Waiting for ${firstName} to confirm too.`)
    }
  }

  function submitRating() {
    if (!session || score === 0) return
    rateSession(session.id, score, comment.trim())
    toast('success', 'Rating submitted', `Thanks — this helps others find ${firstName}.`)
  }

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All sessions
      </Link>

      {/* ---- header ---- */}
      <div className="mt-4 rounded-card border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <Avatar name={session.counterpart.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold text-ink">
              {session.role === 'teacher' ? 'Teaching' : 'Learning'} {session.skill.name}
            </h1>
            <p className="text-sm text-ink-soft">
              {session.role === 'teacher' ? 'for' : 'with'} {session.counterpart.name}
            </p>
          </div>
          <StatusBadge status={session.status} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs font-medium text-ink-faint">
          <SkillChip name={session.skill.name} category={session.skill.category} />
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" />
            {session.durationMin} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Coins aria-hidden className="size-3.5 text-credit" />1 credit
          </span>
        </div>
        {session.message ? (
          <p className="mt-4 rounded-2xl bg-sunken px-4 py-3 text-sm leading-relaxed text-ink-soft">
            “{session.message}”
          </p>
        ) : null}
      </div>

      {/* ---- state panel ---- */}
      <div className="mt-4">
        {session.status === 'REQUESTED' && session.role === 'teacher' ? (
          <form onSubmit={accept} className="rounded-card border border-line bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-ink">
              {firstName} wants to learn from you
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Accept to lock in a time — you&apos;ll earn{' '}
              <strong className="text-credit-strong">+1 credit</strong> when the hour is done.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <Field label="When works for you?" error={formError}>
                {(fieldId) => (
                  <TextInput
                    id={fieldId}
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                )}
              </Field>

              <fieldset>
                <legend className="text-sm font-semibold text-ink">Where?</legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: 'IN_PERSON', label: 'In person', icon: MapPin },
                      { value: 'ONLINE', label: 'Online', icon: Video },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={effectiveMode === value}
                      onClick={() => setMode(value)}
                      className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                        effectiveMode === value
                          ? 'border-primary bg-primary-faint text-ink'
                          : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      <Icon
                        aria-hidden
                        className={`size-4 ${effectiveMode === value ? 'text-primary' : 'text-ink-faint'}`}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Field
                label={effectiveMode === 'ONLINE' ? 'Meeting link' : 'Where on campus?'}
                hint="Optional — you can settle this on WhatsApp after accepting."
              >
                {(fieldId, describedBy) => (
                  <TextInput
                    id={fieldId}
                    aria-describedby={describedBy}
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder={
                      effectiveMode === 'ONLINE'
                        ? 'https://meet.google.com/…'
                        : 'e.g. Library, 2nd floor'
                    }
                  />
                )}
              </Field>
            </div>

            <div className="mt-6 flex gap-2">
              <Button type="submit" className="flex-1">
                <Check aria-hidden className="size-4" />
                Accept request
              </Button>
              <Button type="button" variant="danger" onClick={decline}>
                Decline
              </Button>
            </div>
          </form>
        ) : null}

        {session.status === 'REQUESTED' && session.role === 'learner' ? (
          <div className="rounded-card border border-line bg-surface p-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-pending-soft">
              <Hourglass aria-hidden className="size-6 text-pending" />
            </span>
            <h2 className="mt-3 font-display text-lg font-bold text-ink">
              Waiting for {firstName} to respond
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              You&apos;ll see it here the moment they accept. Your credit is only spent
              after the session actually happens.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-success" />
              {firstName} is active — usually replies fast
            </p>
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={cancel} className="text-danger">
                Cancel request
              </Button>
            </div>
          </div>
        ) : null}

        {session.status === 'ACCEPTED' ? (
          <div className="flex flex-col gap-4">
            {/* schedule card */}
            <div className="rounded-card border border-upcoming/20 bg-upcoming-soft/40 p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <CalendarClock aria-hidden className="size-5 text-upcoming" />
                {session.scheduledAt
                  ? formatSessionTime(session.scheduledAt)
                  : 'Time to be agreed'}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                {session.mode === 'ONLINE' ? (
                  <>
                    <Video aria-hidden className="size-4" /> Online
                    {session.meetLink ? '' : ' — link coming'}
                  </>
                ) : (
                  <>
                    <MapPin aria-hidden className="size-4" />
                    {session.location ?? 'On campus — agree on a spot'}
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {session.meetLink ? (
                  <Button href={session.meetLink} size="sm">
                    <Video aria-hidden className="size-4" />
                    Join meeting
                  </Button>
                ) : null}
                {session.counterpartPhone ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    href={`https://wa.me/${session.counterpartPhone.replace(/\D/g, '')}`}
                  >
                    <MessageCircle aria-hidden className="size-4" />
                    WhatsApp {firstName}
                  </Button>
                ) : null}
              </div>
            </div>

            {/* completion */}
            <div className="rounded-card border border-line bg-surface p-6">
              <h2 className="font-display text-lg font-bold text-ink">Did the session happen?</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Both of you need to confirm — then the credit moves.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'You', done: session.viewerConfirmed },
                  { label: firstName, done: session.counterpartConfirmed },
                ].map(({ label, done }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                      done
                        ? 'border-success/20 bg-success-soft text-success'
                        : 'border-line bg-sunken text-ink-faint'
                    }`}
                  >
                    {done ? (
                      <Check aria-hidden className="size-4" />
                    ) : (
                      <Hourglass aria-hidden className="size-4 animate-pulse" />
                    )}
                    {label} {done ? 'confirmed' : 'pending'}
                  </div>
                ))}
              </div>
              {!session.viewerConfirmed ? (
                <Button onClick={confirm} className="mt-4 w-full">
                  <Check aria-hidden className="size-4" />I attended this session
                </Button>
              ) : !session.counterpartConfirmed ? (
                <p className="mt-4 text-center text-sm font-medium text-ink-faint">
                  Waiting for {firstName}…
                </p>
              ) : null}
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" onClick={cancel} className="text-danger">
                  Cancel session
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {session.status === 'COMPLETED' ? (
          <div className="relative flex flex-col gap-4">
            <Confetti burstKey={burst} />
            <div className="animate-pop flex items-center gap-3 rounded-card border border-success/20 bg-success-soft/60 px-6 py-5">
              <PartyPopper aria-hidden className="size-6 shrink-0 text-success" />
              <div>
                <p className="font-display font-bold text-ink">
                  Session complete —{' '}
                  {session.role === 'teacher' ? (
                    <span className="text-credit-strong">+1 credit earned</span>
                  ) : (
                    <span className="text-credit-strong">1 credit well spent</span>
                  )}
                </p>
                <p className="text-sm text-ink-soft">
                  {session.role === 'teacher'
                    ? 'Spend it learning anything on campus.'
                    : `An hour of ${session.skill.name} with ${firstName}.`}
                </p>
              </div>
            </div>

            {!session.viewerRated ? (
              <div className="rounded-card border border-line bg-surface p-6">
                <h2 className="font-display text-lg font-bold text-ink">
                  How was it with {firstName}?
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Ratings are what make SkillSwap trustworthy for the next student.
                </p>
                <div className="mt-4 flex justify-center">
                  <RatingInput value={score} onChange={setScore} />
                </div>
                <TextArea
                  aria-label="Tell them what you thought"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={400}
                  placeholder="Tell them what you thought… (optional)"
                  className="mt-4"
                />
                <Button onClick={submitRating} disabled={score === 0} className="mt-4 w-full">
                  Submit rating
                </Button>
              </div>
            ) : (
              <div className="rounded-card border border-line bg-surface p-6 text-center">
                <p className="font-semibold text-ink">You rated this session ⭐</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Keep the streak going — book your next hour.
                </p>
                <Button href="/discover" variant="secondary" size="sm" className="mt-4">
                  <Compass aria-hidden className="size-4" />
                  Discover skills
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {session.status === 'CANCELLED' || session.status === 'DECLINED' ? (
          <EmptyState
            icon={CircleSlash}
            title={
              session.status === 'CANCELLED' ? 'This session was cancelled' : `${firstName} couldn't take this one`
            }
            description="No credit moved. There are plenty of other teachers ready to help."
            action={<Button href="/discover">Find another teacher</Button>}
          />
        ) : null}
      </div>
    </div>
  )
}
