'use client'

import { Check } from 'lucide-react'
import type { SkillCategory } from '@/lib/types'

/** Soft per-category tints so a wall of chips still reads as organized. */
export const CATEGORY_TINTS: Record<SkillCategory, string> = {
  PROGRAMMING: 'bg-upcoming-soft text-upcoming',
  DESIGN: 'bg-[#ede9fe] text-[#5b21b6]',
  MEDIA: 'bg-[#fce7f3] text-[#9d174d]',
  LANGUAGE: 'bg-[#e0f2fe] text-[#075985]',
  MUSIC: 'bg-danger-soft text-danger',
  ACADEMIC: 'bg-[#f1f5dc] text-[#4d5d0d]',
  CAREER: 'bg-credit-soft text-credit-strong',
  LIFESTYLE: 'bg-success-soft text-success',
  OTHER: 'bg-neutral-soft text-neutral',
}

export function SkillChip({
  name,
  category = 'OTHER',
  className = '',
}: {
  name: string
  category?: SkillCategory
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-chip px-3 py-1 text-xs font-semibold ${CATEGORY_TINTS[category]} ${className}`}
    >
      {name}
    </span>
  )
}

/** Toggleable chip used in onboarding and profile editing. */
export function SelectableChip({
  name,
  selected,
  onToggle,
}: {
  name: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-chip border px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-95 ${
        selected
          ? 'border-primary bg-primary-soft text-primary-deep shadow-sm'
          : 'border-line-strong bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
      }`}
    >
      {selected ? <Check aria-hidden className="size-4 animate-star-pop" /> : null}
      {name}
    </button>
  )
}
