'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MessageSquare, SendHorizontal } from 'lucide-react'
import type { SessionSummary } from '@/lib/types'
import { useDemo } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { formatDay } from '@/lib/format'

/**
 * The session thread — the only messaging surface in the app.
 *
 * It opens the moment a request exists, not on acceptance: the question a
 * teacher needs answered ("which topic, and how far have you got?") comes
 * *before* they decide, and without it good requests get declined. Threads are
 * scoped to a session, so nobody can be written to by a stranger who has not
 * asked to learn from them.
 */

const MAX_LENGTH = 1000

function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function SessionChat({ session }: { session: SessionSummary }) {
  const { sendMessage, markMessagesRead } = useDemo()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const count = session.messages.length

  const closed = session.status === 'CANCELLED' || session.status === 'DECLINED'
  const firstName = session.counterpart.name.split(' ')[0]

  // Reading the thread is the act of opening it, so clear the badge on sight.
  // Both stores no-op when nothing is unread, which keeps this from looping.
  const unread = session.unreadCount
  const sessionId = session.id
  useEffect(() => {
    if (unread > 0) markMessagesRead(sessionId)
  }, [unread, sessionId, markMessagesRead])

  // Stick to the newest message the way every chat app does.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [count])

  function send(event?: FormEvent) {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || closed) return
    sendMessage(session.id, text)
    setDraft('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line — the convention everyone knows.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-6 py-4">
        <MessageSquare aria-hidden className="size-5 text-primary" />
        <h2 className="font-display text-lg font-bold text-ink">
          Message {firstName}
        </h2>
        {session.status === 'REQUESTED' ? (
          <span className="ml-auto rounded-chip bg-primary-faint px-2.5 py-1 text-xs font-bold text-primary">
            Ask before you decide
          </span>
        ) : null}
      </div>

      <div
        className="max-h-96 space-y-3 overflow-y-auto px-4 py-5 sm:px-6"
        role="log"
        aria-label={`Conversation with ${session.counterpart.name}`}
      >
        {session.messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-faint">
            No messages yet.{' '}
            {session.status === 'REQUESTED' && session.role === 'teacher'
              ? `Ask ${firstName} what they want to cover before you accept.`
              : `Say hi, or ask ${firstName} what to prepare.`}
          </p>
        ) : (
          session.messages.map((message, index) => {
            const previous = session.messages[index - 1]
            const newDay =
              !previous ||
              previous.createdAt.toDateString() !== message.createdAt.toDateString()

            return (
              <div key={message.id}>
                {newDay ? (
                  <p className="py-2 text-center text-xs font-semibold text-ink-faint">
                    {formatDay(message.createdAt)}
                  </p>
                ) : null}
                <div
                  className={`flex items-end gap-2 ${message.mine ? 'flex-row-reverse' : ''}`}
                >
                  {!message.mine ? (
                    <Avatar name={message.senderName} size="sm" className="mb-4 shrink-0" />
                  ) : null}
                  <div className={`min-w-0 max-w-[85%] ${message.mine ? 'items-end' : ''}`}>
                    <div
                      className={`animate-pop rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                        message.mine
                          ? `bg-primary text-white ${message.pending ? 'opacity-60' : ''}`
                          : 'bg-sunken text-ink'
                      }`}
                    >
                      {message.body}
                    </div>
                    <p
                      className={`mt-1 text-xs text-ink-faint ${message.mine ? 'text-right' : ''}`}
                    >
                      {message.pending ? 'Sending…' : timeLabel(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <p className="border-t border-line px-6 py-4 text-center text-sm text-ink-faint">
          This session is closed — the thread stays here as a record.
        </p>
      ) : (
        <form
          onSubmit={send}
          // The mobile tab bar is fixed over the bottom of the viewport, so a
          // browser scrolling this into view (focus, keyboard) can park the
          // send button underneath it. Reserve the bar's height.
          className="flex scroll-mb-24 items-end gap-2 border-t border-line p-4 sm:px-6 md:scroll-mb-0"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_LENGTH}
            aria-label={`Message ${session.counterpart.name}`}
            placeholder={`Message ${firstName}…`}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          <button
            type="submit"
            disabled={draft.trim().length === 0}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:-translate-y-px hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <SendHorizontal aria-hidden className="size-4" />
          </button>
        </form>
      )}
    </section>
  )
}
