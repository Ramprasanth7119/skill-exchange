'use client'

import { CalendarClock, Plus, X } from 'lucide-react'
import type { AvailabilitySlot } from '@/lib/types'
import {
  AVAILABILITY_PRESETS,
  WEEKDAYS_LONG,
  isSlotValid,
  minutesToTimeValue,
  sortSlots,
  timeValueToMinutes,
} from '@/lib/availability'

/**
 * The weekly windows a student is usually free.
 *
 * Controlled by the profile form so one Save button persists everything.
 * Presets exist because a week of slots is twelve fiddly inputs otherwise, and
 * nobody fills in twelve inputs to be findable.
 */

let counter = 0
function slotId() {
  counter += 1
  return `av-new-${Date.now()}-${counter}`
}

export function AvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilitySlot[]
  onChange: (slots: AvailabilitySlot[]) => void
}) {
  const slots = sortSlots(value)

  const update = (id: string, patch: Partial<AvailabilitySlot>) =>
    onChange(value.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)))

  const applyPreset = (preset: (typeof AVAILABILITY_PRESETS)[number]) => {
    // Merge rather than replace: two presets together are a real week, and a
    // preset should never quietly delete a window somebody typed by hand.
    const merged = [...value]
    for (const slot of preset.slots) {
      const clash = merged.some(
        (existing) => existing.weekday === slot.weekday && existing.startMin === slot.startMin,
      )
      if (!clash) merged.push({ ...slot, id: slotId() })
    }
    onChange(merged)
  }

  return (
    <section className="mt-6 rounded-card border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <CalendarClock aria-hidden className="size-5 text-upcoming" />
        When are you usually free?
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Shown on your profile and used to suggest times, so nobody has to play
        message tennis to find an hour. Nothing here blocks a booking.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {AVAILABILITY_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded-chip border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft transition-all hover:-translate-y-px hover:border-primary hover:bg-primary-faint hover:text-primary"
          >
            + {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {slots.length === 0 ? (
          <p className="rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-faint">
            No windows yet — add one, or start from a preset above.
          </p>
        ) : (
          slots.map((slot) => {
            const valid = isSlotValid(slot)
            return (
              <div key={slot.id}>
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-sunken px-3 py-2">
                  {/* A plain <select>, not the shared `Select`: that one bakes
                      in w-full, which wins the cascade over any width passed
                      through className and wraps every row in two. */}
                  <select
                    aria-label="Day of the week"
                    value={slot.weekday}
                    onChange={(e) => update(slot.id, { weekday: Number(e.target.value) })}
                    className="h-11 w-36 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  >
                    {WEEKDAYS_LONG.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <TimeBox
                    label={`Start time on ${WEEKDAYS_LONG[slot.weekday]}`}
                    minutes={slot.startMin}
                    onChange={(startMin) => update(slot.id, { startMin })}
                  />
                  <span className="text-sm text-ink-faint">to</span>
                  <TimeBox
                    label={`End time on ${WEEKDAYS_LONG[slot.weekday]}`}
                    minutes={slot.endMin}
                    onChange={(endMin) => update(slot.id, { endMin })}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${WEEKDAYS_LONG[slot.weekday]} window`}
                    onClick={() => onChange(value.filter((s) => s.id !== slot.id))}
                    className="ml-auto flex size-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                {!valid ? (
                  <p className="mt-1 text-xs font-medium text-danger">
                    This window has to end after it starts.
                  </p>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          onChange([
            ...value,
            { id: slotId(), weekday: 1, startMin: 17 * 60, endMin: 19 * 60 },
          ])
        }
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-opacity hover:opacity-80"
      >
        <Plus aria-hidden className="size-4" />
        Add a window
      </button>
    </section>
  )
}

function TimeBox({
  label,
  minutes,
  onChange,
}: {
  label: string
  minutes: number
  onChange: (minutes: number) => void
}) {
  return (
    <input
      type="time"
      step={900}
      aria-label={label}
      value={minutesToTimeValue(minutes)}
      onChange={(e) => {
        const parsed = timeValueToMinutes(e.target.value)
        // A half-typed or cleared time is not a change worth committing.
        if (parsed !== null) onChange(parsed)
      }}
      className="h-11 w-32 rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
    />
  )
}
