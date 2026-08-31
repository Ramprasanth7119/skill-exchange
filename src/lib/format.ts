import { format, isToday, isTomorrow, isYesterday } from 'date-fns'

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/* Deterministic avatar colors so the same person always looks the same. */
const AVATAR_PALETTE = [
  { bg: '#E2F2EA', fg: '#0A5C48' },
  { bg: '#FDEED3', fg: '#92400E' },
  { bg: '#E3EBFD', fg: '#1E40AF' },
  { bg: '#FFE4E9', fg: '#9F1239' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#E0F2FE', fg: '#075985' },
  { bg: '#F1F5DC', fg: '#4D5D0D' },
] as const

export function avatarColor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

/** "Today · 6:00 PM", "Tomorrow · 3:30 PM", "Sat 12 Sep · 5:00 PM" */
export function formatSessionTime(date: Date) {
  const time = format(date, 'h:mm a')
  if (isToday(date)) return `Today · ${time}`
  if (isTomorrow(date)) return `Tomorrow · ${time}`
  return `${format(date, 'EEE d MMM')} · ${time}`
}

/** "Today", "Yesterday", "12 Aug" — for ledger rows and reviews. */
export function formatDay(date: Date) {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'd MMM')
}

export function formatMonthYear(date: Date) {
  return format(date, 'MMMM yyyy')
}

export function plural(count: number, singular: string, pluralWord?: string) {
  return `${count} ${count === 1 ? singular : (pluralWord ?? `${singular}s`)}`
}
