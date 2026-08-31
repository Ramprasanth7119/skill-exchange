import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  Award,
  BellRing,
  CalendarCheck2,
  Coins,
  HandCoins,
  Repeat,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkillChip } from '@/components/ui/chip'
import { Logo } from '@/components/navigation/logo'
import { CreditLoop } from '@/components/landing/credit-loop'
import { TeacherCard } from '@/components/discover/teacher-card'
import { Reveal } from '@/components/effects/reveal'
import { Tilt } from '@/components/effects/tilt'
import { VoiceWall } from '@/components/landing/voice-wall'
import { getCampusSkills, getCampusTeachers, getCampusVoices } from '@/lib/campus'
import { getFeedbackWall, getSkillCatalog, getTeachers } from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/env'

const HOOKS = [
  {
    icon: Repeat,
    title: 'Perfect swaps',
    body: 'We spot when a teacher wants exactly what you teach — one relationship, two credits.',
  },
  {
    icon: Trophy,
    title: 'Campus leaderboard',
    body: 'Hours taught are public glory. Climb the semester board one session at a time.',
  },
  {
    icon: Award,
    title: 'Achievements',
    body: 'First hour taught, full loop closed, five hours swapped — every milestone gets its badge.',
  },
  {
    icon: BellRing,
    title: 'Live from campus',
    body: 'Requests, acceptances and credits land in your notification bell the moment they happen.',
  },
]

const HOW_IT_WORKS = [
  {
    icon: UsersRound,
    title: 'Show what you know',
    body: 'Sign in with your college email, pick the skills you can teach and the ones you want to learn.',
  },
  {
    icon: CalendarCheck2,
    title: 'Book an hour',
    body: 'Find a student who teaches what you want. Request a session — meet on campus or online.',
  },
  {
    icon: HandCoins,
    title: 'Both confirm, the credit moves',
    body: 'After the session, you both confirm it happened. The teacher earns a credit; the learner spends one.',
  },
]

export default async function LandingPage() {
  // Live mode markets the real campus; demo mode shows the fixture roster.
  const live = isSupabaseConfigured()
  const teachers = live ? await getTeachers() : getCampusTeachers()
  const skills = live ? await getSkillCatalog() : getCampusSkills()
  const voices = live ? await getFeedbackWall() : getCampusVoices()
  const featured = [teachers[0], teachers[1], teachers[3] ?? teachers[2]].filter(Boolean)

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---- header ---- */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" href="/login">
              Sign in
            </Button>
            <Button size="sm" href="/login">
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---- hero ---- */}
        <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 overflow-x-clip px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pt-20">
          {/* soft color washes behind the hero */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-32 -z-10 size-96 rounded-full bg-primary-soft opacity-70 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-44 -right-28 -z-10 size-80 rounded-full bg-credit-soft opacity-60 blur-3xl"
          />
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-1.5 rounded-chip bg-primary-soft px-3 py-1 text-xs font-bold text-primary-deep">
              <Sparkles aria-hidden className="size-3.5" />
              Peer learning for your campus
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Learn from your campus.
              <br />
              <span className="relative inline-block">
                <span className="gradient-text">Pay in time.</span>
                <svg
                  aria-hidden
                  viewBox="0 0 220 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2.5 left-0 h-3 w-full"
                >
                  <path
                    d="M4 9 C 45 2, 85 3, 112 7 S 175 11, 216 4"
                    fill="none"
                    stroke="var(--color-credit)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
              The best teacher for the skill you want is probably two classrooms
              away. Teach an hour of what you know, earn a credit, spend it
              learning anything — no money involved.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" href="/login">
                Find a skill
                <ArrowRight aria-hidden className="size-4" />
              </Button>
              <Button size="lg" variant="secondary" href="/login">
                Teach a skill
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-sm text-ink-faint">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              College-email sign-in — every member is a verified student.
            </p>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <CreditLoop />
            <p className="mx-auto mt-6 max-w-sm text-center text-sm leading-relaxed text-ink-faint">
              Credits keep every exchange fair — even when the person you want
              to learn from wants nothing you teach.
            </p>
          </div>
        </section>

        {/* ---- skill marquee ---- */}
        {skills.length > 0 ? (
          <div aria-hidden className="overflow-hidden border-y border-line bg-ink py-3.5">
            <div className="marquee">
              {[...skills, ...skills].map((skill, index) => (
                <span
                  key={`${skill.id}-${index}`}
                  className="mx-2 inline-flex shrink-0 items-center gap-2 text-sm font-semibold whitespace-nowrap text-paper/80"
                >
                  <Sparkles className="size-3.5 text-star" />
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* ---- the equation ---- */}
        <section className="border-y border-line bg-surface">
          <Reveal className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:gap-8">
              <div className="flex flex-col items-center gap-1">
                <p className="font-display text-2xl font-bold text-ink">Teach 1 hour</p>
                <p className="text-sm text-ink-faint">any skill, any student</p>
              </div>
              <ArrowDown aria-hidden className="size-6 text-line-strong sm:-rotate-90" />
              <div className="flex items-center gap-2 rounded-2xl bg-credit-soft px-6 py-4">
                <Coins aria-hidden className="size-7 text-credit" />
                <p className="font-display text-3xl font-bold text-credit-strong">+1 credit</p>
              </div>
              <ArrowDown aria-hidden className="size-6 text-line-strong sm:-rotate-90" />
              <div className="flex flex-col items-center gap-1">
                <p className="font-display text-2xl font-bold text-ink">Learn 1 hour</p>
                <p className="text-sm text-ink-faint">from anyone on campus</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ---- how it works ---- */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              How it works
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }, index) => (
              <Reveal
                key={title}
                delay={index * 120}
                className="rounded-card border border-line bg-surface p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft">
                    <Icon aria-hidden className="size-5 text-primary" />
                  </span>
                  <span className="font-display text-sm font-bold text-ink-faint">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- the hooks ---- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Made to keep the loop spinning
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-ink-soft">
              Everything is designed so your first session is never your last.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOOKS.map(({ icon: Icon, title, body }, index) => (
              <Reveal
                key={title}
                delay={index * 100}
                className="group rounded-card border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg hover:shadow-ink/5"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-credit-soft transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon aria-hidden className="size-5 text-credit-strong" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---- skills ---- */}
        {skills.length > 0 ? (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
                  What will you pick up this semester?
                </h2>
                <p className="mt-2 text-ink-soft">
                  From placement prep to guitar — taught by people who just learned it themselves.
                </p>
              </div>
              <Button variant="secondary" size="sm" href="/discover">
                Browse all
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {skills.map((skill) => (
                <Link key={skill.id} href={`/discover?skill=${skill.slug}`}>
                  <SkillChip
                    name={skill.name}
                    category={skill.category}
                    className="px-4 py-2 text-sm transition-transform hover:scale-105"
                  />
                </Link>
              ))}
              <span className="inline-flex items-center rounded-chip border border-dashed border-line-strong px-4 py-2 text-sm font-semibold text-ink-faint">
                + yours?
              </span>
            </div>
          </div>
        </section>
        ) : null}

        {/* ---- example teachers ---- */}
        {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Meet a few of the teachers
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-ink-soft">
            Regular students with something worth sharing — rated by the people
            they taught.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((teacher, index) => (
              <Reveal key={teacher.id} delay={index * 120}>
                <Tilt>
                  <TeacherCard teacher={teacher} />
                </Tilt>
              </Reveal>
            ))}
          </div>
        </section>
        ) : null}

        {/* ---- hear it from campus ---- */}
        <VoiceWall voices={voices} />

        {/* ---- final CTA ---- */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal className="rounded-card bg-ink px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-xl font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              Your first credit is free.
              <br />
              What will you spend it on?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-paper/70">
              Sign up with your college email, tell us what you know, and book
              your first hour today.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" variant="inverse" href="/login">
                Get started — it&apos;s free
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---- footer ---- */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-ink-faint">
            Built by students, for students · 1 credit = 1 hour
          </p>
          <div className="flex gap-5 text-sm font-medium text-ink-soft">
            <Link href="/discover" className="hover:text-ink">
              Discover
            </Link>
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
