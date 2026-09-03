'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  BellRing,
  CalendarCheck,
  CalendarSync,
  Coins,
  Inbox,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import type { AppNotification } from '@/lib/types'
import { useDemo } from '@/lib/store'

const KIND_ICONS: Record<AppNotification['kind'], typeof Bell> = {
  request: Inbox,
  accepted: CalendarCheck,
  credit: Coins,
  reminder: Sparkles,
  message: MessageSquare,
  reschedule: CalendarSync,
}

function timeAgo(date: Date) {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** The header bell: rings when something arrives, opens the notification centre. */
export function NotificationBell() {
  const { notifications, markNotificationsRead, hydrated } = useDemo()
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  // Ring visibly while something unread waits and the panel is closed.
  const ringing = unread > 0 && !open

  function close() {
    setOpen(false)
    markNotificationsRead()
  }

  if (!hydrated) return null

  return (
    <div className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={
          unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'
        }
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
      >
        {ringing ? (
          <BellRing aria-hidden className="animate-bell-ring size-5 text-primary" />
        ) : (
          <Bell aria-hidden className="size-5" />
        )}
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          {/* click-away layer */}
          <button
            aria-label="Close notifications"
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
            tabIndex={-1}
          />
          <div className="animate-pop absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-surface shadow-xl shadow-ink/10">
            <p className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">
              Notifications
            </p>
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-faint">
                Quiet for now. Book a session and this fills up fast.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                {notifications.map((n) => {
                  const Icon = KIND_ICONS[n.kind]
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={close}
                        className="flex gap-3 px-4 py-3 transition-colors hover:bg-sunken"
                      >
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                            n.read ? 'bg-sunken text-ink-faint' : 'bg-primary-soft text-primary'
                          }`}
                        >
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            <span className="truncate">{n.title}</span>
                            {!n.read ? (
                              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                            {n.body}
                          </span>
                          <span className="mt-1 block text-[11px] text-ink-faint">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
