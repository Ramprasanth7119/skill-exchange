'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  MapPin,
  Sparkles,
  Video,
} from 'lucide-react'
import type { SessionMode, SkillCategory, TeacherCard } from '@/lib/types'
import { useDemo } from '@/lib/store'
import { useToast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/button'
import { CreditCost } from '@/components/ui/badge'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { SlotSuggestions } from '@/components/schedule/availability-hint'
import { toLocalInputValue } from '@/lib/availability'
import { Modal } from '@/components/ui/modal'
import { SkillChip } from '@/components/ui/chip'
import { formatSessionTime } from '@/lib/format'

/**
 * Not everyone knows what to write to a stranger — the autofill button drafts
 * a friendly opener matched to the skill, and it lands in the textarea as
 * ordinary editable text. Tapping again cycles through different drafts.
 */
const OPENERS = [
  (name: string, skill: string) =>
    `Hi ${name}! I've been wanting to learn ${skill} for a while now. I'm starting from scratch, so could we begin with the fundamentals?`,
  (name: string, skill: string) =>
    `Hey ${name}! I know a little ${skill} but I keep getting stuck going further. Could you walk me through what you'd learn next in my place?`,
  (name: string, skill: string) =>
    `Hi ${name}! ${skill} has been on my list all semester and your profile convinced me to finally start. What should I prepare before we meet?`,
]

const GOALS: Record<SkillCategory, string> = {
  PROGRAMMING: 'My goal is to get comfortable enough to build something small on my own.',
  DESIGN: 'I want to end up able to design a clean page for my own portfolio.',
  MEDIA: 'I have some raw clips of my own we could maybe practice on!',
  LANGUAGE: 'Mostly I want real conversation practice, not grammar drills.',
  MUSIC: 'Honestly, I just want to play one full song confidently.',
  ACADEMIC: 'Exams are coming up, so I want to strengthen my basics fast.',
  CAREER: 'Placements are around the corner, so this feels a bit urgent!',
  LIFESTYLE: 'No big ambitions — I just want to enjoy learning this.',
  OTHER: 'Happy to follow whatever plan you think works best.',
}

function draftMessage(teacher: TeacherCard, variant: number) {
  const opener = OPENERS[variant % OPENERS.length]
  return `${opener(teacher.name.split(' ')[0], teacher.skill.name)} ${GOALS[teacher.skill.category]}`
}

/**
 * Three small steps instead of one form: mode → message & time → review.
 * The cost (1 hour = 1 credit) stays visible before anything is sent.
 */
export function RequestModal({
  teacher,
  open,
  onClose,
}: {
  teacher: TeacherCard
  open: boolean
  onClose: () => void
}) {
  const { requestSession } = useDemo()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<SessionMode>('IN_PERSON')
  const [message, setMessage] = useState('')
  const [preferred, setPreferred] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [sent, setSent] = useState(false)
  const [draftVariant, setDraftVariant] = useState(0)

  function autofill() {
    setMessage(draftMessage(teacher, draftVariant))
    setDraftVariant((v) => v + 1)
  }

  function close() {
    onClose()
    // Reset after the exit transition so a reopened modal starts fresh.
    window.setTimeout(() => {
      setStep(0)
      setMode('IN_PERSON')
      setMessage('')
      setPreferred('')
      setError(undefined)
      setSent(false)
      setDraftVariant(0)
    }, 250)
  }

  function send() {
    const preferredAt = preferred ? new Date(preferred) : null
    const result = requestSession({ teacher, mode, message: message.trim(), preferredAt })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSent(true)
    toast(
      'success',
      'Request sent',
      `${teacher.name.split(' ')[0]} will get back to you soon.`,
    )
  }

  const firstName = teacher.name.split(' ')[0]

  return (
    <Modal open={open} onClose={close} title={sent ? 'Request sent' : `Learn with ${firstName}`}>
      {sent ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success-soft">
            <CalendarCheck2 aria-hidden className="size-7 text-success" />
          </span>
          <h3 className="mt-4 font-display text-xl font-bold text-ink">
            Sent to {firstName}!
          </h3>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-soft">
            You&apos;ll see their reply under Sessions. Your credit only moves after
            you both confirm the session happened.
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={close}>
              Keep browsing
            </Button>
            <Button href="/sessions">View sessions</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* persistent cost summary */}
          <div className="flex items-center justify-between rounded-2xl bg-sunken px-4 py-3">
            <SkillChip name={teacher.skill.name} category={teacher.skill.category} />
            <CreditCost />
          </div>

          {step === 0 ? (
            <fieldset>
              <legend className="text-sm font-semibold text-ink">
                How do you want to meet?
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(
                  [
                    { value: 'IN_PERSON', label: 'In person', hint: 'On campus', icon: MapPin },
                    { value: 'ONLINE', label: 'Online', hint: 'Google Meet', icon: Video },
                  ] as const
                ).map(({ value, label, hint, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-4 py-5 transition-all ${
                      mode === value
                        ? 'border-primary bg-primary-faint'
                        : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <Icon
                      aria-hidden
                      className={`size-6 ${mode === value ? 'text-primary' : 'text-ink-faint'}`}
                    />
                    <span className="text-sm font-bold text-ink">{label}</span>
                    <span className="text-xs text-ink-faint">{hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 1 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="request-message" className="text-sm font-semibold text-ink">
                    What should {firstName} know?
                  </label>
                  <button
                    type="button"
                    onClick={autofill}
                    className="inline-flex items-center gap-1.5 rounded-chip border border-credit/25 bg-credit-soft px-3 py-1.5 text-xs font-bold text-credit-strong transition-all duration-150 hover:bg-credit hover:text-white active:scale-95"
                  >
                    <Sparkles aria-hidden className="size-3.5" />
                    {draftVariant === 0 ? 'Write it for me' : 'Try another draft'}
                  </button>
                </div>
                <TextArea
                  id="request-message"
                  aria-describedby="request-message-hint"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  placeholder={`Hi ${firstName}! I'd love help with…`}
                />
                <p id="request-message-hint" className="text-xs text-ink-faint">
                  {draftVariant > 0
                    ? 'Drafted for you — edit anything before sending.'
                    : "What you want to cover, and where you're starting from."}
                </p>
              </div>
              {teacher.availability.length > 0 ? (
                <SlotSuggestions
                  slots={teacher.availability}
                  name={firstName}
                  onPick={(date) => setPreferred(toLocalInputValue(date))}
                />
              ) : null}
              <Field label="Preferred time" hint="Optional — you'll agree on the final time together.">
                {(id, describedBy) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    type="datetime-local"
                    value={preferred}
                    onChange={(e) => setPreferred(e.target.value)}
                  />
                )}
              </Field>
            </>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-ink">Ready to send?</p>
              <dl className="space-y-2 rounded-2xl border border-line px-4 py-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-faint">Teacher</dt>
                  <dd className="font-semibold text-ink">{teacher.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-faint">Skill</dt>
                  <dd className="font-semibold text-ink">{teacher.skill.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-faint">Mode</dt>
                  <dd className="font-semibold text-ink">
                    {mode === 'IN_PERSON' ? 'In person' : 'Online'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-faint">Preferred time</dt>
                  <dd className="font-semibold text-ink">
                    {preferred ? formatSessionTime(new Date(preferred)) : 'Flexible'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-2">
                  <dt className="text-ink-faint">Cost when completed</dt>
                  <dd className="font-bold text-credit-strong">1 credit · 1 hour</dd>
                </div>
              </dl>
              {message.trim() ? (
                <p className="rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-soft">
                  “{message.trim()}”
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-1">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft aria-hidden className="size-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Continue
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <Button onClick={send}>Send request</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
