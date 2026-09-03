'use client'

import { useState, type FormEvent } from 'react'
import { CalendarPlus, CalendarSync, Check, Clock, Hourglass, MapPin, Video, X } from 'lucide-react'
import type { SessionMode, SessionSummary } from '@/lib/types'
import { useDemo } from '@/lib/store'
import { useToast } from '@/components/feedback/toast'
import { formatSessionTime } from '@/lib/format'
import { toLocalInputValue } from '@/lib/availability'
import { downloadIcs, googleCalendarUrl } from '@/lib/calendar'
import { SlotSuggestions } from '@/components/schedule/availability-hint'
import { Button } from '@/components/ui/button'
import { Field, TextArea, TextInput } from '@/components/ui/field'

/**
 * Everything about *when* a confirmed session happens.
 *
 * The rule that makes rescheduling safe: a proposal never moves the booking.
 * The agreed time stands until the other person accepts, so a suggestion sent
 * to someone who is asleep cannot strand them at the old slot.
 */

/** A pending suggestion — either waiting on the viewer, or on the other side. */
export function ProposalBanner({ session }: { session: SessionSummary }) {
  const { respondToProposal } = useDemo()
  const toast = useToast()
  const proposal = session.proposal
  if (!proposal) return null

  const firstName = session.counterpart.name.split(' ')[0]
  const where =
    proposal.mode === 'ONLINE'
      ? (proposal.meetLink ?? 'Online')
      : (proposal.location ?? 'On campus')

  if (proposal.mine) {
    return (
      <div className="rounded-card border border-pending/25 bg-pending-soft/50 p-5">
        <p className="flex items-center gap-2 font-display font-bold text-ink">
          <Hourglass aria-hidden className="size-5 animate-pulse text-pending" />
          Waiting for {firstName} to accept the new time
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          You suggested <strong className="text-ink">{formatSessionTime(proposal.at)}</strong> ·{' '}
          {where}. Until they agree, the session stays at its current time.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-pop rounded-card border border-upcoming/30 bg-upcoming-soft/50 p-5">
      <p className="flex items-center gap-2 font-display font-bold text-ink">
        <CalendarSync aria-hidden className="size-5 text-upcoming" />
        {firstName} suggested a new time
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        <strong className="text-ink">{formatSessionTime(proposal.at)}</strong> · {where}
      </p>
      {proposal.note ? (
        <p className="mt-3 rounded-2xl bg-surface/80 px-4 py-2.5 text-sm text-ink-soft">
          &ldquo;{proposal.note}&rdquo;
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            respondToProposal(session.id, true)
            toast('success', 'New time locked in', formatSessionTime(proposal.at))
          }}
        >
          <Check aria-hidden className="size-4" />
          Accept new time
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            respondToProposal(session.id, false)
            toast('info', 'Kept the original time', `${firstName} has been told.`)
          }}
        >
          <X aria-hidden className="size-4" />
          Keep the current one
        </Button>
      </div>
    </div>
  )
}

/** "Something came up" — put a different time to the other side. */
export function RescheduleCard({ session }: { session: SessionSummary }) {
  const { proposeTime } = useDemo()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [when, setWhen] = useState('')
  const [mode, setMode] = useState<SessionMode>(session.mode)
  const [place, setPlace] = useState(
    (session.mode === 'ONLINE' ? session.meetLink : session.location) ?? '',
  )
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()

  const firstName = session.counterpart.name.split(' ')[0]

  if (!open) {
    return (
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <CalendarSync aria-hidden className="size-4" />
          Suggest a new time
        </Button>
      </div>
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!when) {
      setError('Pick the time you have in mind.')
      return
    }
    const at = new Date(when)
    if (at.getTime() < Date.now()) {
      setError('That time has already passed.')
      return
    }
    proposeTime(session.id, {
      at,
      mode,
      location: mode === 'IN_PERSON' ? place.trim() || null : null,
      meetLink: mode === 'ONLINE' ? place.trim() || null : null,
      note: note.trim() || null,
    })
    setOpen(false)
    setNote('')
    toast('info', 'Suggestion sent', `${firstName} decides — the current time stands until then.`)
  }

  return (
    <form onSubmit={submit} className="animate-fade-up rounded-card border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-bold text-ink">Suggest a new time</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {firstName} has to agree before anything moves — the current slot stays
        put until they do.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {session.counterpartAvailability.length > 0 ? (
          <SlotSuggestions
            slots={session.counterpartAvailability}
            name={firstName}
            durationMin={session.durationMin}
            onPick={(date) => {
              setWhen(toLocalInputValue(date))
              setError(undefined)
            }}
          />
        ) : null}

        <Field label="New time" error={error}>
          {(fieldId) => (
            <TextInput
              id={fieldId}
              type="datetime-local"
              value={when}
              onChange={(e) => {
                setWhen(e.target.value)
                setError(undefined)
              }}
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
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                  mode === value
                    ? 'border-primary bg-primary-faint text-ink'
                    : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                }`}
              >
                <Icon
                  aria-hidden
                  className={`size-4 ${mode === value ? 'text-primary' : 'text-ink-faint'}`}
                />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <Field label={mode === 'ONLINE' ? 'Meeting link' : 'Where on campus?'}>
          {(fieldId) => (
            <TextInput
              id={fieldId}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder={
                mode === 'ONLINE' ? 'https://meet.google.com/…' : 'e.g. Library, 2nd floor'
              }
            />
          )}
        </Field>

        <Field label="Why the change?" hint="Optional, but it saves a round of messages.">
          {(fieldId, describedBy) => (
            <TextArea
              id={fieldId}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Lab got moved to Thursday — could we shift by a day?"
            />
          )}
        </Field>
      </div>

      <div className="mt-6 flex gap-2">
        <Button type="submit" className="flex-1">
          <CalendarSync aria-hidden className="size-4" />
          Send suggestion
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * A session that lives only inside SkillSwap is a session people forget.
 * Both exports are built client-side from what is already on screen.
 */
export function AddToCalendar({ session }: { session: SessionSummary }) {
  const scheduledAt = session.scheduledAt
  if (!scheduledAt) return null

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        href={googleCalendarUrl(session, scheduledAt)}
        external
      >
        <CalendarPlus aria-hidden className="size-4" />
        Google Calendar
      </Button>
      <Button variant="ghost" size="sm" onClick={() => downloadIcs(session, scheduledAt)}>
        <Clock aria-hidden className="size-4" />
        Download .ics
      </Button>
    </div>
  )
}
