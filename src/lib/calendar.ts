import type { SessionSummary } from '@/lib/types'

/**
 * Calendar handoff for a confirmed session.
 *
 * A session that only exists inside SkillSwap is a session people forget. Both
 * exports are built client-side from data already on screen — no API, no
 * OAuth scope, and nothing to keep in sync when a time changes.
 */

/** 2026-09-04T17:30 → "20260904T120000Z" (UTC, the only form both accept). */
function toUtcStamp(date: Date) {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

function sessionTitle(session: SessionSummary) {
  return session.role === 'teacher'
    ? `Teaching ${session.skill.name} — ${session.counterpart.name}`
    : `Learning ${session.skill.name} — ${session.counterpart.name}`
}

function sessionWhere(session: SessionSummary) {
  if (session.mode === 'ONLINE') return session.meetLink ?? 'Online'
  return session.location ?? 'On campus'
}

function sessionDetails(session: SessionSummary) {
  return session.role === 'teacher'
    ? `You are teaching ${session.counterpart.name} for an hour. Confirm it in SkillSwap afterwards to earn your credit.`
    : `${session.counterpart.name} is teaching you ${session.skill.name}. Confirm it in SkillSwap afterwards — that is when the credit moves.`
}

function endOf(session: SessionSummary, start: Date) {
  return new Date(start.getTime() + session.durationMin * 60_000)
}

/** A "save to Google Calendar" link — the one-click path for most students. */
export function googleCalendarUrl(session: SessionSummary, start: Date) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: sessionTitle(session),
    dates: `${toUtcStamp(start)}/${toUtcStamp(endOf(session, start))}`,
    details: sessionDetails(session),
    location: sessionWhere(session),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** RFC 5545 escaping: commas, semicolons and newlines are field separators. */
function escapeIcs(value: string) {
  return value.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

/** An .ics file body — covers Apple Calendar, Outlook and everything else. */
export function buildIcs(session: SessionSummary, start: Date) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SkillSwap//Campus skill exchange//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${session.id}@skillswap`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(endOf(session, start))}`,
    `SUMMARY:${escapeIcs(sessionTitle(session))}`,
    `DESCRIPTION:${escapeIcs(sessionDetails(session))}`,
    `LOCATION:${escapeIcs(sessionWhere(session))}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(sessionTitle(session))}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Hands the .ics to the browser as a download. Client-side only. */
export function downloadIcs(session: SessionSummary, start: Date) {
  const blob = new Blob([buildIcs(session, start)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `skillswap-${session.skill.slug}.ics`
  link.click()
  URL.revokeObjectURL(url)
}
