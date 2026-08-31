'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Coins, PartyPopper } from 'lucide-react'
import type { SkillLevel } from '@/lib/types'
import { getCampusSkills } from '@/lib/campus'
import { useDemo } from '@/lib/store'
import { useToast } from '@/components/feedback/toast'
import { Logo } from '@/components/navigation/logo'
import { Button } from '@/components/ui/button'
import { SelectableChip, SkillChip } from '@/components/ui/chip'
import { Field, Select, TextArea, TextInput } from '@/components/ui/field'
import { Avatar } from '@/components/ui/avatar'
import { Confetti } from '@/components/effects/confetti'

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'Other']
const LEVELS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

const STEPS = ['About you', 'What you teach', 'What you learn', 'Ready'] as const

export default function OnboardingPage() {
  const router = useRouter()
  const { completeOnboarding } = useDemo()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [year, setYear] = useState('')
  const [bio, setBio] = useState('')
  const [teach, setTeach] = useState<Map<string, SkillLevel>>(new Map())
  const [want, setWant] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | undefined>()

  const skills = useMemo(() => getCampusSkills(), [])
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

  function next() {
    if (step === 0 && (!name.trim() || !branch || !year)) {
      setError('Your name, branch and year help others recognize you.')
      return
    }
    setError(undefined)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function finish() {
    completeOnboarding({
      name: name.trim(),
      branch,
      year: Number(year),
      bio: bio.trim(),
      teaches: [...teach.entries()].flatMap(([id, level]) => {
        const skill = skillById.get(id)
        return skill ? [{ skill, level }] : []
      }),
      wants: [...want].flatMap((id) => {
        const skill = skillById.get(id)
        return skill ? [skill] : []
      }),
    })
    toast('credit', '+1 credit', 'Welcome bonus — your first session is on us.')
    router.push('/discover')
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-2xl items-center justify-between px-4">
        <Logo />
        <p className="text-sm font-semibold text-ink-faint tabular-nums">
          {step + 1} / {STEPS.length} · {STEPS[step]}
        </p>
      </header>

      {/* progress */}
      <div className="mx-auto w-full max-w-2xl px-4">
        <div
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label="Onboarding progress"
          className="h-1.5 overflow-hidden rounded-full bg-sunken"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {step === 0 ? (
          <section className="animate-fade-up">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              First, about you
            </h1>
            <p className="mt-2 text-ink-soft">
              This is how other students will recognize you around campus.
            </p>
            <div className="mt-8 flex flex-col gap-5">
              <Field label="Your name" error={error}>
                {(id) => (
                  <TextInput
                    id={id}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Kumar"
                    autoComplete="name"
                  />
                )}
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Branch">
                  {(id) => (
                    <Select id={id} value={branch} onChange={(e) => setBranch(e.target.value)}>
                      <option value="" disabled>
                        Select…
                      </option>
                      {BRANCHES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Year">
                  {(id) => (
                    <Select id={id} value={year} onChange={(e) => setYear(e.target.value)}>
                      <option value="" disabled>
                        Select…
                      </option>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="A line about you" hint="Optional — but profiles with a bio get more requests.">
                {(id, describedBy) => (
                  <TextArea
                    id={id}
                    aria-describedby={describedBy}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={280}
                    placeholder="What are you into right now?"
                  />
                )}
              </Field>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="animate-fade-up">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              What are you good at?
            </h1>
            <p className="mt-2 text-ink-soft">
              Pick anything you&apos;re one step ahead in — you don&apos;t need to be an
              expert to teach a beginner.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
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
              <div className="animate-fade-up mt-8 flex flex-col gap-3">
                <p className="text-sm font-semibold text-ink">How comfortable are you?</p>
                {[...teach.entries()].map(([id, level]) => {
                  const skill = skillById.get(id)
                  if (!skill) return null
                  return (
                    <div
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                    >
                      <SkillChip name={skill.name} category={skill.category} />
                      <div role="radiogroup" aria-label={`Level for ${skill.name}`} className="flex gap-1">
                        {LEVELS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={level === value}
                            onClick={() =>
                              setTeach((current) => new Map(current).set(id, value))
                            }
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                              level === value
                                ? 'bg-ink text-paper'
                                : 'bg-sunken text-ink-soft hover:text-ink'
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
        ) : null}

        {step === 2 ? (
          <section className="animate-fade-up">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              What would you love to learn?
            </h1>
            <p className="mt-2 text-ink-soft">
              We&apos;ll surface teachers for these first.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
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
        ) : null}

        {step === 3 ? (
          <section className="animate-fade-up relative text-center">
            <Confetti burstKey="onboarding-done" />
            <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-credit-soft">
              <PartyPopper aria-hidden className="size-8 text-credit" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink">
              You&apos;re in, {name.split(' ')[0] || 'friend'}!
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-ink-soft">
              Here&apos;s your starter credit — one hour of anyone&apos;s time, on us.
            </p>

            <div className="mx-auto mt-8 max-w-sm rounded-card border border-line bg-surface p-6 text-left">
              <div className="flex items-center gap-3">
                <Avatar name={name || '?'} size="lg" />
                <div>
                  <p className="font-display font-bold text-ink">{name}</p>
                  <p className="text-sm text-ink-faint">
                    {branch} · Year {year}
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-chip bg-credit-soft px-3 py-1.5 text-sm font-bold text-credit-strong">
                  <Coins aria-hidden className="size-4" /> 1
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">Teaching:</span>{' '}
                  {teach.size > 0
                    ? [...teach.keys()]
                        .map((id) => skillById.get(id)?.name)
                        .filter(Boolean)
                        .join(', ')
                    : 'nothing yet — add skills any time'}
                </p>
                <p className="text-ink-soft">
                  <span className="font-semibold text-ink">Learning:</span>{' '}
                  {want.size > 0
                    ? [...want]
                        .map((id) => skillById.get(id)?.name)
                        .filter(Boolean)
                        .join(', ')
                    : 'browsing for now'}
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {/* actions */}
      <div className="sticky bottom-0 border-t border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft aria-hidden className="size-4" />
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              {step === 1 && teach.size === 0
                ? 'Skip for now'
                : step === 2 && want.size === 0
                  ? 'Skip for now'
                  : 'Continue'}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={finish}>
              Start exploring
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
