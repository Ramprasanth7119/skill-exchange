'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarCheck2,
  GraduationCap,
  MessageSquareQuote,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { getCampusTeachers, getRichPublicProfile } from '@/lib/campus'
import { useDemo } from '@/lib/store'
import { formatDay, formatMonthYear, plural } from '@/lib/format'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { CreditCost } from '@/components/ui/badge'
import { SkillChip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { RequestModal } from '@/components/sessions/request-modal'
import { FavoriteButton } from '@/components/discover/teacher-card'

const LEVEL_LABELS = {
  BEGINNER: 'Beginner-friendly',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { profile, hydrated } = useDemo()
  const [requestOpen, setRequestOpen] = useState(false)

  const teacher = getCampusTeachers().find((t) => t.id === id)
  // Aditya has the fully-populated public profile fixture (reviews, wants).
  const rich = getRichPublicProfile(id)

  const wantedByViewer = useMemo(
    () => new Set(profile.wants.map(({ skill }) => skill.id)),
    [profile.wants],
  )

  if (!teacher) notFound()

  const reviews = rich?.recentReviews ?? []
  const wants = rich?.wants ?? []
  const canAfford = profile.credits >= 1
  // The swap hook: they teach something you want AND want something you teach.
  const teachesWhatYouWant = wantedByViewer.has(teacher.skill.id)
  const viewerTeachIds = new Set(profile.teaches.map(({ skill }) => skill.id))
  const wantsWhatYouTeach = [...wants.map(({ skill }) => skill), ...teacher.lookingFor].some(
    (skill) => viewerTeachIds.has(skill.id),
  )

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to discover
      </Link>

      {/* ---- identity ---- */}
      <div className="mt-4 rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar name={teacher.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center justify-center gap-2 font-display text-2xl font-bold text-ink sm:justify-start">
              {teacher.name}
              <ShieldCheck aria-hidden className="size-5 shrink-0 text-primary" />
              <FavoriteButton teacherId={teacher.id} name={teacher.name} />
            </h1>
            <p className="mt-0.5 text-ink-faint">
              {[teacher.branch, teacher.year ? `Year ${teacher.year}` : null]
                .filter(Boolean)
                .join(' · ')}
              {rich ? ` · joined ${formatMonthYear(rich.joinedAt)}` : ''}
            </p>
            {teacher.bio ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{teacher.bio}</p>
            ) : null}
          </div>
        </div>

        {/* trust strip */}
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
          <div>
            <dt className="text-xs font-medium text-ink-faint">Rating</dt>
            <dd className="mt-1 flex items-center justify-center gap-1 font-display text-lg font-bold text-ink">
              {teacher.averageRating !== null ? (
                <>
                  <Star aria-hidden className="size-4 fill-star text-star" />
                  {teacher.averageRating.toFixed(1)}
                </>
              ) : (
                <span className="text-primary-deep">New</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-faint">Sessions taught</dt>
            <dd className="mt-1 font-display text-lg font-bold text-ink">
              {teacher.sessionsTaught}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-faint">Reviews</dt>
            <dd className="mt-1 font-display text-lg font-bold text-ink">
              {teacher.ratingCount}
            </dd>
          </div>
        </dl>
      </div>

      {/* ---- swap hook ---- */}
      {teachesWhatYouWant || wantsWhatYouTeach ? (
        <div className="mt-4 flex items-start gap-3 rounded-card border border-primary/20 bg-primary-faint px-5 py-4">
          <ArrowLeftRight aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-primary-deep">
            {teachesWhatYouWant && wantsWhatYouTeach ? (
              <>
                <strong>Perfect swap:</strong> {teacher.name.split(' ')[0]} teaches{' '}
                {teacher.skill.name}, which is on your learning list — and they want to
                learn something you teach.
              </>
            ) : teachesWhatYouWant ? (
              <>
                <strong>On your list:</strong> {teacher.skill.name} is a skill you said
                you want to learn.
              </>
            ) : (
              <>
                <strong>They need you:</strong> {teacher.name.split(' ')[0]} wants to
                learn something you teach — earn a credit back easily.
              </>
            )}
          </p>
        </div>
      ) : null}

      {/* ---- skills ---- */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold text-ink">Teaches</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SkillChip name={teacher.skill.name} category={teacher.skill.category} className="px-4 py-1.5 text-sm" />
          <span className="inline-flex items-center gap-1 rounded-chip bg-sunken px-3 py-1.5 text-xs font-semibold text-ink-soft">
            <GraduationCap aria-hidden className="size-3.5" />
            {LEVEL_LABELS[teacher.level]}
          </span>
        </div>
        {teacher.note ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{teacher.note}</p>
        ) : null}
      </section>

      {wants.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold text-ink">Wants to learn</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {wants.map(({ skill }) => (
              <SkillChip key={skill.id} name={skill.name} category={skill.category} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- reviews ---- */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold text-ink">
          {reviews.length > 0 ? `Reviews (${teacher.ratingCount})` : 'Reviews'}
        </h2>
        <div className="mt-3 space-y-3">
          {reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No reviews yet"
              description={`Be ${teacher.name.split(' ')[0]}'s first learner and leave the first one.`}
            />
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={review.author.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{review.author.name}</p>
                    <p className="text-xs text-ink-faint">
                      {review.skillName} · {formatDay(review.createdAt)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-ink" aria-label={plural(review.score, 'star')}>
                    <Star aria-hidden className="size-4 fill-star text-star" />
                    {review.score}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{review.comment}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      {/* ---- sticky request CTA ---- */}
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">
              Learn {teacher.skill.name} with {teacher.name.split(' ')[0]}
            </p>
            <CreditCost />
          </div>
          <Button
            size="lg"
            onClick={() => setRequestOpen(true)}
            disabled={hydrated && !canAfford}
            className="shrink-0"
          >
            <CalendarCheck2 aria-hidden className="size-4" />
            Request session
          </Button>
        </div>
        {hydrated && !canAfford ? (
          <p className="mx-auto mt-1.5 max-w-3xl text-xs font-medium text-danger">
            You&apos;re out of credits — teach an hour to earn one first.
          </p>
        ) : null}
      </div>
      {/* spacer so content never hides behind the sticky bar */}
      <div className="h-24" />

      <RequestModal teacher={teacher} open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  )
}
