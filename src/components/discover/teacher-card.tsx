'use client'

import Link from 'next/link'
import { GraduationCap, Heart, Repeat, ShieldCheck } from 'lucide-react'
import type { SkillLevel, TeacherCard as TeacherCardModel } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { SkillChip } from '@/components/ui/chip'
import { RatingDisplay } from '@/components/ui/rating'
import { useDemo } from '@/lib/store'
import { plural } from '@/lib/format'

const LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner-friendly',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

/** The heart lives inside the card link, so it must swallow the navigation. */
export function FavoriteButton({
  teacherId,
  name,
  className = '',
}: {
  teacherId: string
  name: string
  className?: string
}) {
  const { favorites, toggleFavorite } = useDemo()
  const saved = favorites.includes(teacherId)

  return (
    <button
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleFavorite(teacherId)
      }}
      aria-label={saved ? `Remove ${name} from saved teachers` : `Save ${name} for later`}
      aria-pressed={saved}
      className={`flex size-9 items-center justify-center rounded-full transition-colors ${
        saved ? 'text-danger' : 'text-ink-faint hover:bg-sunken hover:text-danger'
      } ${className}`}
    >
      <Heart
        key={String(saved)}
        aria-hidden
        className={`size-[18px] ${saved ? 'animate-heart-pop fill-current' : ''}`}
      />
    </button>
  )
}

/**
 * The "perfect swap" chip — the retention hook every exchange platform lives
 * on: this teacher wants a skill the viewer teaches, so both of them can earn
 * a credit off the same relationship.
 */
export function SwapMatchChip({ teacher }: { teacher: TeacherCardModel }) {
  const { profile } = useDemo()
  const match = teacher.lookingFor.find((wanted) =>
    profile.teaches.some(({ skill }) => skill.id === wanted.id),
  )
  if (!match) return null

  return (
    <span className="animate-pop inline-flex items-center gap-1 rounded-chip bg-gradient-to-r from-primary to-credit px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      <Repeat aria-hidden className="size-3.5" />
      Perfect swap — wants your {match.name}
    </span>
  )
}

/** One teacher offering one skill — the core unit of discovery. */
export function TeacherCard({ teacher }: { teacher: TeacherCardModel }) {
  const meta = [teacher.branch, teacher.year ? `Year ${teacher.year}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      href={`/u/${teacher.id}`}
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg hover:shadow-ink/5"
    >
      <div className="flex items-start justify-between gap-3">
        {/* min-w-0 on every flex level, or the name's truncate can never
            engage and long names push the card wider than the viewport */}
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={teacher.name}
            size="lg"
            className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-display font-bold text-ink">
              <span className="min-w-0 truncate">{teacher.name}</span>
              <ShieldCheck
                aria-hidden
                className="size-4 shrink-0 text-primary"
              />
              <span className="sr-only">College verified</span>
            </p>
            {meta ? <p className="text-sm text-ink-faint">{meta}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <RatingDisplay average={teacher.averageRating} count={teacher.ratingCount} showCount={false} />
          <FavoriteButton teacherId={teacher.id} name={teacher.name} className="-mt-1.5 -mr-1.5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SwapMatchChip teacher={teacher} />
        <SkillChip name={teacher.skill.name} category={teacher.skill.category} />
        <span className="inline-flex items-center gap-1 rounded-chip bg-sunken px-2.5 py-1 text-xs font-semibold text-ink-soft">
          <GraduationCap aria-hidden className="size-3.5" />
          {LEVEL_LABELS[teacher.level]}
        </span>
      </div>

      {teacher.note ?? teacher.bio ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
          {teacher.note ?? teacher.bio}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-xs font-medium text-ink-faint">
          {teacher.sessionsTaught > 0
            ? `${plural(teacher.sessionsTaught, 'session')} taught`
            : 'Ready for their first session'}
        </span>
        <span className="text-sm font-semibold text-primary transition-transform duration-200 group-hover:translate-x-0.5">
          View profile →
        </span>
      </div>
    </Link>
  )
}
