'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Megaphone, RotateCcw, Save, Star, Trash2 } from 'lucide-react'
import type { Profile, SkillLevel } from '@/lib/types'
import { isDemoMode } from '@/lib/env'
import { useDemo } from '@/lib/store'
import { useToast } from '@/components/feedback/toast'
import { formatMonthYear } from '@/lib/format'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SelectableChip, SkillChip } from '@/components/ui/chip'
import { Field, Select, TextArea, TextInput } from '@/components/ui/field'
import { SkeletonCard } from '@/components/ui/skeleton'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'Other']
const LEVELS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

export default function ProfilePage() {
  const { profile, hydrated } = useDemo()

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl">
        <SkeletonCard />
      </div>
    )
  }

  // Keyed on profile identity so the form re-initializes after onboarding/reset.
  return <ProfileEditor key={`${profile.id}-${profile.joinedAt.getTime()}`} profile={profile} />
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const { updateProfile, resetDemo, skills } = useDemo()
  const toast = useToast()
  const router = useRouter()

  const [name, setName] = useState(profile.name)
  const [branch, setBranch] = useState(profile.branch ?? '')
  const [year, setYear] = useState(profile.year ? String(profile.year) : '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [teach, setTeach] = useState<Map<string, SkillLevel>>(
    () => new Map(profile.teaches.map(({ skill, level }) => [skill.id, level])),
  )
  const [want, setWant] = useState<Set<string>>(
    () => new Set(profile.wants.map(({ skill }) => skill.id)),
  )
  const [confirmReset, setConfirmReset] = useState(false)

  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])

  function toggleTeach(id: string) {
    setTeach((current) => {
      const next = new Map(current)
      if (next.has(id)) next.delete(id)
      else next.set(id, 'INTERMEDIATE')
      return next
    })
  }

  function toggleWant(id: string) {
    setWant((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      toast('error', 'Name is required')
      return
    }
    updateProfile({
      name: name.trim(),
      branch: branch || null,
      year: year ? Number(year) : null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      teaches: [...teach.entries()].flatMap(([id, level]) => {
        const skill = skillById.get(id)
        return skill ? [{ skill, level, note: null }] : []
      }),
      wants: [...want].flatMap((id) => {
        const skill = skillById.get(id)
        return skill ? [{ skill }] : []
      }),
    })
    toast('success', 'Profile saved', 'Your changes are live.')
  }

  return (
    <form onSubmit={save} className="animate-fade-up mx-auto max-w-2xl">
      {/* ---- identity summary ---- */}
      <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface p-6 text-center sm:flex-row sm:text-left">
        <Avatar name={name || profile.name} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">{name || 'Your name'}</h1>
          <p className="mt-0.5 text-sm text-ink-faint">
            Joined {formatMonthYear(profile.joinedAt)} · taught {profile.sessionsTaught} ·
            learned {profile.sessionsLearned}
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink sm:justify-start">
            {profile.averageRating !== null ? (
              <>
                <Star aria-hidden className="size-4 fill-star text-star" />
                {profile.averageRating.toFixed(1)}
                <span className="font-normal text-ink-faint">
                  from {profile.ratingCount} review{profile.ratingCount === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span className="rounded-chip bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-deep">
                New member
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ---- basics ---- */}
      <section className="mt-6 rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">About you</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Name">
            {(id) => <TextInput id={id} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Branch">
              {(id) => (
                <Select id={id} value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="">Not set</option>
                  {BRANCHES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Year">
              {(id) => (
                <Select id={id} value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">Not set</option>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Bio" hint={`${bio.length}/280 — profiles with a bio get more requests.`}>
            {(id, describedBy) => (
              <TextArea
                id={id}
                aria-describedby={describedBy}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
              />
            )}
          </Field>
          <Field
            label="WhatsApp number"
            hint="Only shared with someone after you both have an accepted session."
          >
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
              />
            )}
          </Field>
        </div>
      </section>

      {/* ---- teaches ---- */}
      <section className="mt-6 rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">Skills you teach</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Every skill here is a way to earn credits.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <SelectableChip
              key={skill.id}
              name={skill.name}
              selected={teach.has(skill.id)}
              onToggle={() => toggleTeach(skill.id)}
            />
          ))}
        </div>
        {teach.size > 0 ? (
          <div className="mt-5 flex flex-col gap-3">
            {[...teach.entries()].map(([id, level]) => {
              const skill = skillById.get(id)
              if (!skill) return null
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-3"
                >
                  <SkillChip name={skill.name} category={skill.category} />
                  <div role="radiogroup" aria-label={`Level for ${skill.name}`} className="flex gap-1">
                    {LEVELS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={level === value}
                        onClick={() => setTeach((current) => new Map(current).set(id, value))}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          level === value
                            ? 'bg-ink text-paper'
                            : 'bg-surface text-ink-soft hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>

      {/* ---- wants ---- */}
      <section className="mt-6 rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-ink">Skills you want to learn</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Discover puts these front and center for you.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <SelectableChip
              key={skill.id}
              name={skill.name}
              selected={want.has(skill.id)}
              onToggle={() => toggleWant(skill.id)}
            />
          ))}
        </div>
      </section>

      {/* ---- your note on the landing wall ---- */}
      <FeedbackCard />

      {/* ---- actions ---- */}
      <div className="sticky bottom-14 mt-6 rounded-card border border-line bg-surface/95 p-4 backdrop-blur-sm md:bottom-4">
        <div className="flex items-center justify-between gap-3">
          <Button type="submit">
            <Save aria-hidden className="size-4" />
            Save changes
          </Button>
          {confirmReset ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="font-medium text-ink-soft">
                {isDemoMode() ? 'Reset all demo data?' : 'Sign out of SkillSwap?'}
              </span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  resetDemo()
                  setConfirmReset(false)
                  if (isDemoMode()) {
                    toast('info', 'Demo reset', 'Fresh start — join again from the landing page.')
                    router.push('/')
                  }
                  // Live mode: resetDemo runs the sign-out action, which redirects.
                }}
              >
                {isDemoMode() ? 'Yes, reset' : 'Sign out'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              {isDemoMode() ? (
                <RotateCcw aria-hidden className="size-4" />
              ) : (
                <LogOut aria-hidden className="size-4" />
              )}
              {isDemoMode() ? 'Reset demo' : 'Sign out'}
            </Button>
          )}
        </div>
      </div>

      {/* Live mode only: the account is real, so deleting it must be possible. */}
      {!isDemoMode() ? <DangerZone /> : null}
    </form>
  )
}

/**
 * "Hear it from campus": the wall on the landing page is written right here.
 * One note per student, editable any time; clearing it withdraws the note.
 */
function FeedbackCard() {
  const { feedback, submitFeedback } = useDemo()
  const toast = useToast()
  const [draft, setDraft] = useState(feedback ?? '')
  const hasNote = Boolean(feedback)
  const dirty = draft.trim() !== (feedback ?? '')

  return (
    <section className="mt-8 rounded-card border border-line bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Megaphone aria-hidden className="size-5 text-credit" />
            Say it out loud
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Loved (or endured) a session? Your note goes on the{' '}
            <span className="font-semibold text-ink">landing page wall</span> with
            your name — help the next student take the leap.
          </p>
        </div>
        {hasNote ? (
          <span className="shrink-0 rounded-chip bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
            On the wall
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={280}
          rows={3}
          aria-label="Your note for the landing page wall"
          placeholder="e.g. Traded an hour of DSA for an hour of Figma — best deal on campus."
          className="w-full resize-none rounded-2xl border border-line-strong bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-ink-faint tabular-nums">{draft.length}/280</span>
          <span className="flex gap-2">
            {hasNote ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft('')
                  submitFeedback('')
                  toast('info', 'Note removed', 'Your words are off the wall.')
                }}
              >
                Take it down
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={!dirty || draft.trim().length === 0}
              onClick={() => {
                submitFeedback(draft)
                toast('success', hasNote ? 'Note updated' : 'You’re on the wall!', 'Thanks for the shout-out — it shows on the landing page.')
              }}
            >
              {hasNote ? 'Update my note' : 'Put it on the wall'}
            </Button>
          </span>
        </div>
      </div>
    </section>
  )
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <div className="mt-8 rounded-card border border-danger/20 bg-danger-soft/40 p-5">
      <h2 className="font-display text-sm font-bold text-danger">Danger zone</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Deleting your account wipes your profile, skills and notifications.
        Completed sessions stay in your partners&apos; history, anonymized.
      </p>
      <div className="mt-3">
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-ink-soft">This cannot be undone.</span>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                const { deleteAccountAction } = await import('@/app/actions')
                await deleteAccountAction() // redirects home on success
                setBusy(false)
              }}
            >
              {busy ? 'Deleting…' : 'Yes, delete my account'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Keep my account
            </Button>
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="text-danger! hover:text-danger!" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden className="size-4" />
            Delete account
          </Button>
        )}
      </div>
    </div>
  )
}
