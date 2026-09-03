import type { AvailabilitySlot } from '@/lib/types'

/**
 * Weekly-availability helpers, shared by the profile editor, the request
 * modal and every time picker.
 *
 * Slots are stored as (weekday, startMin, endMin) rather than as concrete
 * dates: a student's Tuesday evening is free every Tuesday, and storing dates
 * would mean regenerating them forever. `nextOccurrences` projects them onto
 * the coming fortnight at the moment somebody actually needs to pick a time.
 */

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/** 990 → "4:30 PM". Minutes from midnight is the storage unit everywhere. */
export function minutesToLabel(minutes: number) {
  const h24 = Math.floor(minutes / 60)
  const mins = minutes % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(mins).padStart(2, '0')} ${suffix}`
}

/** 990 → "16:30", the value shape an `<input type="time">` wants. */
export function minutesToTimeValue(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "16:30" → 990. Returns null for anything that isn't a valid clock time. */
export function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** "Tue · 4:30 PM – 6:30 PM" */
export function formatSlot(slot: AvailabilitySlot) {
  return `${WEEKDAYS[slot.weekday]} · ${minutesToLabel(slot.startMin)} – ${minutesToLabel(slot.endMin)}`
}

/** Chronological by weekday then start — the order humans read a week in. */
export function sortSlots(slots: AvailabilitySlot[]) {
  return [...slots].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
}

/**
 * The next real date/times matching these slots, starting from `from`.
 * Sessions are booked at the *start* of a window, and a window is only
 * offered if the whole hour still fits inside it.
 */
export function nextOccurrences(
  slots: AvailabilitySlot[],
  count = 3,
  durationMin = 60,
  from = new Date(),
): Date[] {
  if (slots.length === 0) return []
  const results: Date[] = []

  for (let dayOffset = 0; dayOffset < 14 && results.length < count; dayOffset++) {
    const day = new Date(from)
    day.setDate(day.getDate() + dayOffset)
    const weekday = day.getDay()

    for (const slot of sortSlots(slots.filter((s) => s.weekday === weekday))) {
      if (slot.endMin - slot.startMin < durationMin) continue
      const at = new Date(day)
      at.setHours(Math.floor(slot.startMin / 60), slot.startMin % 60, 0, 0)
      // Today's earlier windows have already passed; skip to next week's.
      if (at.getTime() <= from.getTime()) continue
      results.push(at)
      if (results.length >= count) break
    }
  }
  return results
}

/** A Date as the local-time string `<input type="datetime-local">` expects. */
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Ready-made weeks, so setting availability is two clicks and not twelve. */
export const AVAILABILITY_PRESETS: Array<{
  label: string
  slots: Array<Omit<AvailabilitySlot, 'id'>>
}> = [
  {
    label: 'Weekday evenings',
    slots: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 17 * 60, endMin: 20 * 60 })),
  },
  {
    label: 'Weekday lunch',
    slots: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 13 * 60, endMin: 14 * 60 })),
  },
  {
    label: 'Weekends',
    slots: [0, 6].map((weekday) => ({ weekday, startMin: 10 * 60, endMin: 18 * 60 })),
  },
]

/** A window has to end after it starts — the only rule worth enforcing. */
export function isSlotValid(slot: Pick<AvailabilitySlot, 'startMin' | 'endMin'>) {
  return slot.endMin > slot.startMin
}
