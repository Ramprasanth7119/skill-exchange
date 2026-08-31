import Link from 'next/link'
import { GraduationCap, ShieldCheck } from 'lucide-react'
import type { SkillLevel, TeacherCard as TeacherCardModel } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { SkillChip } from '@/components/ui/chip'
import { RatingDisplay } from '@/components/ui/rating'
import { plural } from '@/lib/format'

const LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner-friendly',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

/** One teacher offering one skill — the core unit of discovery. */
export function TeacherCard({ teacher }: { teacher: TeacherCardModel }) {
  const meta = [teacher.branch, teacher.year ? `Year ${teacher.year}` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      href={`/u/${teacher.id}`}
      className="group flex flex-col rounded-card border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg hover:shadow-ink/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar
            name={teacher.name}
            size="lg"
            className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-display font-bold text-ink">
              <span className="truncate">{teacher.name}</span>
              <ShieldCheck
                aria-hidden
                className="size-4 shrink-0 text-primary"
              />
              <span className="sr-only">College verified</span>
            </p>
            {meta ? <p className="text-sm text-ink-faint">{meta}</p> : null}
          </div>
        </div>
        <RatingDisplay average={teacher.averageRating} count={teacher.ratingCount} showCount={false} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
