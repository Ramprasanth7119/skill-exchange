'use client'

import { CalendarClock, Sparkles } from 'lucide-react'
import type { AvailabilitySlot } from '@/lib/types'
import { formatSlot, nextOccurrences, sortSlots } from '@/lib/availability'
import { formatSessionTime } from '@/lib/format'

/**
 * Read-only views of someone's weekly availability.
 *
 * Two shapes, one purpose: stop both sides guessing. `AvailabilityHint` says
 * when a person is generally free; `SlotSuggestions` turns that into real
 * dates you can click straight into a time field.
 */

export function AvailabilityHint({
  slots,
  name,
  className = '',
}: {
  slots: AvailabilitySlot[]
  /** First name of the owner; omit for the viewer's own slots. */
  name?: string
  className?: string
}) {
  if (slots.length === 0) return null

  return (
    <div className={`rounded-2xl border border-line bg-sunken px-4 py-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
        <CalendarClock aria-hidden className="size-3.5" />
        {name ? `${name} is usually free` : 'You are usually free'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sortSlots(slots).map((slot) => (
          <span
            key={slot.id}
            className="rounded-chip bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft"
          >
            {formatSlot(slot)}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * The next few real date/times matching someone's weekly windows. Clicking one
 * fills the time field — which is the whole point of collecting availability.
 */
export function SlotSuggestions({
  slots,
  name,
  durationMin = 60,
  onPick,
}: {
  slots: AvailabilitySlot[]
  name: string
  durationMin?: number
  onPick: (date: Date) => void
}) {
  const suggestions = nextOccurrences(slots, 3, durationMin)
  if (suggestions.length === 0) return null

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
        <Sparkles aria-hidden className="size-3.5 text-credit" />
        {name} is usually free then — tap to use one
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((date) => (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onPick(date)}
            className="rounded-chip border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-all hover:-translate-y-px hover:border-primary hover:bg-primary-faint hover:text-primary active:translate-y-0"
          >
            {formatSessionTime(date)}
          </button>
        ))}
      </div>
    </div>
  )
}
