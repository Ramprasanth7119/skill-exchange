'use client'

import { use, useMemo, useState } from 'react'
import { Heart, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import type { SkillLevel } from '@/lib/types'
import { getCampusSkills, getCampusTeachers } from '@/lib/campus'
import { useDemo } from '@/lib/store'
import { TeacherCard } from '@/components/discover/teacher-card'
import { Tilt } from '@/components/effects/tilt'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { SkeletonList } from '@/components/ui/skeleton'

type Sort = 'recommended' | 'rating' | 'sessions'

const LEVEL_OPTIONS: Array<{ value: SkillLevel | ''; label: string }> = [
  { value: '', label: 'Any level' },
  { value: 'BEGINNER', label: 'Beginner-friendly' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

export default function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>
}) {
  const { skill: initialSkill } = use(searchParams)
  const { profile, favorites, hydrated } = useDemo()

  const [query, setQuery] = useState('')
  const [skillSlug, setSkillSlug] = useState(initialSkill ?? '')
  const [level, setLevel] = useState<SkillLevel | ''>('')
  const [minRating, setMinRating] = useState('')
  const [sort, setSort] = useState<Sort>('recommended')
  const [savedOnly, setSavedOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const wantedSkillIds = useMemo(
    () => new Set(profile.wants.map(({ skill }) => skill.id)),
    [profile.wants],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    const filtered = getCampusTeachers().filter((t) => {
      if (savedOnly && !favorites.includes(t.id)) return false
      if (skillSlug && t.skill.slug !== skillSlug) return false
      if (level && t.level !== level) return false
      if (minRating && (t.averageRating ?? 0) < Number(minRating)) return false
      if (q && !`${t.name} ${t.skill.name} ${t.bio ?? ''}`.toLowerCase().includes(q))
        return false
      return true
    })

    return filtered.sort((a, b) => {
      if (sort === 'rating') return (b.averageRating ?? 0) - (a.averageRating ?? 0)
      if (sort === 'sessions') return b.sessionsTaught - a.sessionsTaught
      // Recommended: skills the viewer wants to learn float to the top.
      const aWanted = wantedSkillIds.has(a.skill.id) ? 1 : 0
      const bWanted = wantedSkillIds.has(b.skill.id) ? 1 : 0
      if (aWanted !== bWanted) return bWanted - aWanted
      return (b.averageRating ?? 0) - (a.averageRating ?? 0)
    })
  }, [query, skillSlug, level, minRating, sort, savedOnly, favorites, wantedSkillIds])

  const activeFilterCount = [level, minRating].filter(Boolean).length
  const hasWants =
    wantedSkillIds.size > 0 && !query && !skillSlug && !savedOnly && sort === 'recommended'

  function resetAll() {
    setQuery('')
    setSkillSlug('')
    setLevel('')
    setMinRating('')
    setSort('recommended')
    setSavedOnly(false)
  }

  const filterControls = (
    <>
      <Field label="Teaching level">
        {(id) => (
          <Select id={id} value={level} onChange={(e) => setLevel(e.target.value as SkillLevel | '')}>
            {LEVEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Minimum rating">
        {(id) => (
          <Select id={id} value={minRating} onChange={(e) => setMinRating(e.target.value)}>
            <option value="">Any rating</option>
            <option value="4">4.0 and up</option>
            <option value="4.5">4.5 and up</option>
          </Select>
        )}
      </Field>
      <Field label="Sort by">
        {(id) => (
          <Select id={id} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recommended">Recommended for you</option>
            <option value="rating">Highest rated</option>
            <option value="sessions">Most sessions taught</option>
          </Select>
        )}
      </Field>
    </>
  )

  return (
    <div className="animate-fade-up relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-24 -z-10 size-72 rounded-full bg-primary-soft opacity-50 blur-3xl"
      />
      {/* ---- heading + search ---- */}
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        {hydrated ? (
          <>What do you want to learn, {profile.name.split(' ')[0]}?</>
        ) : (
          <>What do you want to learn?</>
        )}
      </h1>

      <div className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            aria-label="Search skills and people"
            placeholder="Search skills, people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-full border border-line-strong bg-surface pr-4 pl-11 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        {/* mobile: filters live in a sheet */}
        <button
          onClick={() => setFiltersOpen(true)}
          aria-label="Open filters"
          className="relative flex size-12 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-soft transition-colors hover:text-ink lg:hidden"
        >
          <SlidersHorizontal aria-hidden className="size-5" />
          {activeFilterCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* ---- skill rail ---- */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          onClick={() => setSkillSlug('')}
          aria-pressed={skillSlug === ''}
          className={`shrink-0 rounded-chip px-4 py-2 text-sm font-semibold transition-colors ${
            skillSlug === '' ? 'bg-ink text-paper' : 'bg-surface text-ink-soft border border-line hover:text-ink'
          }`}
        >
          All skills
        </button>
        {favorites.length > 0 ? (
          <button
            onClick={() => setSavedOnly((v) => !v)}
            aria-pressed={savedOnly}
            className={`flex shrink-0 items-center gap-1.5 rounded-chip px-4 py-2 text-sm font-semibold transition-colors ${
              savedOnly
                ? 'bg-danger text-white'
                : 'border border-line bg-surface text-ink-soft hover:text-ink'
            }`}
          >
            <Heart aria-hidden className={`size-3.5 ${savedOnly ? 'fill-current' : ''}`} />
            Saved
          </button>
        ) : null}
        {getCampusSkills().map((skill) => (
          <button
            key={skill.id}
            onClick={() => setSkillSlug(skillSlug === skill.slug ? '' : skill.slug)}
            aria-pressed={skillSlug === skill.slug}
            className={`shrink-0 rounded-chip px-4 py-2 text-sm font-semibold transition-colors ${
              skillSlug === skill.slug
                ? 'bg-ink text-paper'
                : 'border border-line bg-surface text-ink-soft hover:text-ink'
            }`}
          >
            {skill.name}
          </button>
        ))}
      </div>

      {/* ---- desktop filters ---- */}
      <div className="mt-5 hidden max-w-2xl grid-cols-3 gap-4 lg:grid">{filterControls}</div>

      {/* ---- results ---- */}
      <div className="mt-8">
        {!hydrated ? (
          <SkeletonList count={6} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No teachers for that combination yet"
            description="Try widening the filters — or be the first to teach it and start earning credits."
            action={
              <Button variant="secondary" onClick={resetAll}>
                Clear search & filters
              </Button>
            }
          />
        ) : (
          <>
            {hasWants ? (
              <p className="mb-4 text-sm font-semibold text-ink-faint">
                Sorted for you — skills on your learning list come first.
              </p>
            ) : (
              <p key={results.length} className="animate-fade-in mb-4 text-sm font-semibold text-ink-faint">
                {results.length} teacher{results.length === 1 ? '' : 's'} found
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((teacher, index) => (
                <div
                  key={`${teacher.id}-${teacher.skill.id}`}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <Tilt className="h-full">
                    <TeacherCard teacher={teacher} />
                  </Tilt>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---- mobile filter sheet ---- */}
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="flex flex-col gap-4">
          {filterControls}
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetAll}>
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {results.length} result{results.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
