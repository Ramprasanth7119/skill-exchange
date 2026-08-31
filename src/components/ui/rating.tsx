'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { plural } from '@/lib/format'

/**
 * Read-only rating. A teacher with no ratings shows "New" — never "0.0",
 * which would read as terrible instead of untried.
 */
export function RatingDisplay({
  average,
  count,
  showCount = true,
}: {
  average: number | null
  count: number
  showCount?: boolean
}) {
  if (average === null) {
    return (
      <span className="inline-flex items-center rounded-chip bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-deep">
        New
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
      <Star aria-hidden className="size-4 fill-star text-star" />
      {average.toFixed(1)}
      {showCount ? (
        <span className="font-normal text-ink-faint">({plural(count, 'review')})</span>
      ) : null}
    </span>
  )
}

/** Interactive 5-star input for the post-session rating. */
export function RatingInput({
  value,
  onChange,
}: {
  value: number
  onChange: (score: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div
      role="radiogroup"
      aria-label="Rate this session from 1 to 5 stars"
      className="flex gap-1"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={plural(score, 'star')}
          onClick={() => onChange(score)}
          onMouseEnter={() => setHovered(score)}
          className="rounded-lg p-1.5 transition-transform duration-100 hover:scale-110 active:scale-95"
        >
          <Star
            aria-hidden
            className={`size-8 transition-colors duration-100 ${
              score <= active ? 'animate-star-pop fill-star text-star' : 'text-line-strong'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
