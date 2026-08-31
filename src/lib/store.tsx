'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppNotification,
  CreditEntry,
  PersonSummary,
  Profile,
  SessionMode,
  SessionSummary,
  SkillLevel,
  SkillTag,
  TeacherCard,
} from '@/lib/types'
import { getCampusTeachers } from '@/lib/campus'
import { isDemoMode } from '@/lib/env'
import { useToast } from '@/components/feedback/toast'

/**
 * Phase A stand-in for the backend. There is no pre-seeded account: everyone
 * arrives through onboarding with one welcome credit, exactly like production.
 *
 * What makes it feel live is the event queue: every action that would wait on
 * another person schedules a due-timestamped event, and a 1s ticker plays the
 * other side — the teacher accepts your request a few moments later, someone
 * requests a skill you teach, the counterpart confirms attendance. Events are
 * persisted with the rest of the state, so a reply can even "arrive while you
 * were away" after a refresh. Phase B swaps this for Supabase without touching
 * the component-facing shapes.
 */

type PendingEvent =
  | { id: string; dueAt: number; type: 'TEACHER_ACCEPTS'; sessionId: string }
  | { id: string; dueAt: number; type: 'COUNTERPART_CONFIRMS'; sessionId: string }
  | { id: string; dueAt: number; type: 'INCOMING_REQUEST'; excludeIds: string[] }

/** Omit that distributes over a union instead of collapsing it. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

type DemoState = {
  onboarded: boolean
  profile: Profile
  sessions: SessionSummary[]
  ledger: CreditEntry[]
  events: PendingEvent[]
  /** Teacher ids the viewer has saved with the heart button. */
  favorites: string[]
  notifications: AppNotification[]
}

type RequestInput = {
  teacher: TeacherCard
  mode: SessionMode
  message: string
  preferredAt: Date | null
}

type AcceptInput = {
  scheduledAt: Date
  mode: SessionMode
  location: string | null
  meetLink: string | null
}

type OnboardingInput = {
  name: string
  branch: string
  year: number
  bio: string
  teaches: Array<{ skill: SkillTag; level: SkillLevel }>
  wants: SkillTag[]
}

type ActionOutcome = { ok: true } | { ok: false; error: string }

type DemoContextValue = {
  /** False until localStorage has been consulted — render skeletons meanwhile. */
  hydrated: boolean
  /** False until onboarding finishes; the app shell redirects to /login. */
  onboarded: boolean
  profile: Profile
  sessions: SessionSummary[]
  ledger: CreditEntry[]
  favorites: string[]
  notifications: AppNotification[]
  toggleFavorite: (teacherId: string) => void
  markNotificationsRead: () => void
  requestSession: (input: RequestInput) => ActionOutcome
  cancelSession: (id: string) => void
  acceptSession: (id: string, input: AcceptInput) => void
  declineSession: (id: string) => void
  confirmAttendance: (id: string) => void
  rateSession: (id: string, score: number, comment: string) => void
  updateProfile: (patch: Partial<Profile>) => void
  completeOnboarding: (input: OnboardingInput) => void
  resetDemo: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>')
  return ctx
}

const STORAGE_KEY = 'skillswap-demo-v2'

const BLANK_PROFILE: Profile = {
  id: 'u-me',
  name: '',
  email: '',
  avatarUrl: null,
  branch: null,
  year: null,
  bio: null,
  phone: null,
  credits: 0,
  teaches: [],
  wants: [],
  averageRating: null,
  ratingCount: 0,
  sessionsTaught: 0,
  sessionsLearned: 0,
  joinedAt: new Date(0),
}

const FRESH: DemoState = {
  onboarded: false,
  profile: BLANK_PROFILE,
  sessions: [],
  ledger: [],
  events: [],
  favorites: [],
  notifications: [],
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function load(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw, (_key, value) =>
      typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value,
    ) as DemoState
    // Saves from before favorites/notifications existed lack those keys.
    return { ...FRESH, ...parsed }
  } catch {
    return null
  }
}

function eventId() {
  return `e-${Date.now()}-${Math.round(Math.random() * 1e6)}`
}

/** Tomorrow at 17:30 — the fallback slot when a learner left the time flexible. */
function defaultSlot() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(17, 30, 0, 0)
  return date
}

const INCOMING_MESSAGES = [
  'Hey! Saw you teach %SKILL% — could you help me get started this week?',
  'Hi! I have a test coming up and %SKILL% is killing me. One hour of your time?',
  'Hello! Been meaning to pick up %SKILL% forever. Free sometime soon?',
]

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(FRESH)
  const [hydrated, setHydrated] = useState(false)
  const toast = useToast()

  // Callbacks and the ticker read the freshest state through this ref instead
  // of re-creating themselves every render. Synced post-commit, read later.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    // One-time hydration from localStorage. It must happen after mount — the
    // server render has no storage, so reading earlier would cause a mismatch.
    const saved = load()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time storage hydration
    if (saved) setState(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable (private mode etc.) — the demo just won't persist.
    }
  }, [state, hydrated])

  const schedule = useCallback((event: DistributiveOmit<PendingEvent, 'id'>) => {
    // Simulated counterparts exist only in demo mode. In production the other
    // side is a real student, delivered by the Phase B backend.
    if (!isDemoMode()) return
    setState((current) => ({
      ...current,
      events: [...current.events, { ...event, id: eventId() } as PendingEvent],
    }))
  }, [])

  const notify = useCallback(
    (input: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
      setState((current) => ({
        ...current,
        notifications: [
          { ...input, id: eventId(), read: false, createdAt: new Date() },
          ...current.notifications,
        ].slice(0, 30),
      }))
    },
    [],
  )

  /** The one place a credit ever moves. Mirrors invariants 1-4 in CLAUDE.md. */
  const settleCompletion = useCallback(
    (sessionId: string) => {
      const session = stateRef.current.sessions.find((s) => s.id === sessionId)
      if (!session || session.status === 'COMPLETED') return

      setState((current) => {
        const target = current.sessions.find((s) => s.id === sessionId)
        if (!target || target.status === 'COMPLETED') return current

        const earned = target.role === 'teacher'
        const entry: CreditEntry = {
          id: `c-${Date.now()}`,
          delta: earned ? 1 : -1,
          reason: 'SESSION_COMPLETED',
          description: `${earned ? 'Taught' : 'Learned'} ${target.skill.name} ${
            earned ? 'to' : 'from'
          } ${target.counterpart.name}`,
          createdAt: new Date(),
        }

        return {
          ...current,
          profile: {
            ...current.profile,
            credits: current.profile.credits + entry.delta,
            sessionsTaught: current.profile.sessionsTaught + (earned ? 1 : 0),
            sessionsLearned: current.profile.sessionsLearned + (earned ? 0 : 1),
          },
          ledger: [entry, ...current.ledger],
          sessions: current.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  status: 'COMPLETED' as const,
                  viewerConfirmed: true,
                  counterpartConfirmed: true,
                }
              : s,
          ),
        }
      })

      if (session.role === 'teacher') {
        toast('credit', '+1 credit earned', `You taught ${session.skill.name} for an hour.`)
        notify({
          kind: 'credit',
          title: '+1 credit earned',
          body: `You taught ${session.skill.name} to ${session.counterpart.name.split(' ')[0]}.`,
          href: '/wallet',
        })
      } else {
        toast('credit', '1 credit spent', `An hour of ${session.skill.name} well spent.`)
        notify({
          kind: 'credit',
          title: 'Session completed',
          body: `1 credit went to ${session.counterpart.name.split(' ')[0]} — rate the session?`,
          href: `/sessions/${sessionId}`,
        })
      }
    },
    [toast, notify],
  )

  /* ------------------------------------------------------------------ */
  /* The other side of the marketplace                                   */
  /* ------------------------------------------------------------------ */

  const handleEvent = useCallback(
    (event: PendingEvent) => {
      const current = stateRef.current

      if (event.type === 'TEACHER_ACCEPTS') {
        const session = current.sessions.find((s) => s.id === event.sessionId)
        if (!session || session.status !== 'REQUESTED' || session.role !== 'learner') return

        const scheduledAt =
          session.scheduledAt && session.scheduledAt.getTime() > Date.now()
            ? session.scheduledAt
            : defaultSlot()

        setState((prev) => ({
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id === event.sessionId
              ? {
                  ...s,
                  status: 'ACCEPTED' as const,
                  scheduledAt,
                  location:
                    s.mode === 'IN_PERSON' ? 'Library, 2nd floor discussion room' : null,
                  meetLink: s.mode === 'ONLINE' ? 'https://meet.google.com/kqx-mvpz-dwe' : null,
                  counterpartPhone: '+919000000021',
                }
              : s,
          ),
        }))
        toast(
          'success',
          `${session.counterpart.name.split(' ')[0]} accepted your request!`,
          'The time and place are waiting in Sessions.',
        )
        notify({
          kind: 'accepted',
          title: `${session.counterpart.name.split(' ')[0]} said yes!`,
          body: `Your ${session.skill.name} session is on the calendar.`,
          href: `/sessions/${session.id}`,
        })
        return
      }

      if (event.type === 'COUNTERPART_CONFIRMS') {
        settleCompletion(event.sessionId)
        return
      }

      if (event.type === 'INCOMING_REQUEST') {
        const { profile } = current
        if (profile.teaches.length === 0) return

        // A student from the campus roster we haven't already met.
        const requester = getCampusTeachers().find(
          (t) =>
            !event.excludeIds.includes(t.id) &&
            !current.sessions.some((s) => s.counterpart.id === t.id),
        )
        if (!requester) return

        const teachable = profile.teaches[Math.floor(Math.random() * profile.teaches.length)]
        const message = INCOMING_MESSAGES[
          Math.floor(Math.random() * INCOMING_MESSAGES.length)
        ].replace('%SKILL%', teachable.skill.name)

        const counterpart: PersonSummary = {
          id: requester.id,
          name: requester.name,
          avatarUrl: requester.avatarUrl,
          branch: requester.branch,
          year: requester.year,
        }

        const session: SessionSummary = {
          id: `s-${Date.now()}`,
          status: 'REQUESTED',
          role: 'teacher',
          counterpart,
          skill: teachable.skill,
          message,
          scheduledAt: null,
          durationMin: 60,
          mode: 'IN_PERSON',
          location: null,
          meetLink: null,
          counterpartPhone: null,
          viewerConfirmed: false,
          counterpartConfirmed: false,
          viewerRated: false,
          createdAt: new Date(),
        }

        setState((prev) => ({ ...prev, sessions: [session, ...prev.sessions] }))
        toast(
          'info',
          `${requester.name.split(' ')[0]} wants to learn ${teachable.skill.name}`,
          'Accept it in Sessions to earn a credit.',
        )
        notify({
          kind: 'request',
          title: `New request from ${requester.name.split(' ')[0]}`,
          body: `They want to learn ${teachable.skill.name}. Accept to earn a credit.`,
          href: `/sessions/${session.id}`,
        })
      }
    },
    [settleCompletion, toast, notify],
  )

  // The ticker: once a second, fire whatever has come due. Overdue events fire
  // on the first tick after a reload — replies "arrive while you were away".
  useEffect(() => {
    if (!hydrated || !isDemoMode()) return
    const interval = window.setInterval(() => {
      const now = Date.now()
      const due = stateRef.current.events.filter((e) => e.dueAt <= now)
      if (due.length === 0) return
      setState((current) => ({
        ...current,
        events: current.events.filter((e) => e.dueAt > now),
      }))
      for (const event of due) handleEvent(event)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [hydrated, handleEvent])

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  const requestSession = useCallback(
    (input: RequestInput): ActionOutcome => {
      const { profile } = stateRef.current
      if (profile.credits < 1) {
        return {
          ok: false,
          error: 'You need at least 1 credit to request a session. Teach an hour to earn one.',
        }
      }
      if (input.teacher.id === profile.id) {
        return { ok: false, error: 'You cannot book a session with yourself.' }
      }

      const id = `s-${Date.now()}`
      const session: SessionSummary = {
        id,
        status: 'REQUESTED',
        role: 'learner',
        counterpart: {
          id: input.teacher.id,
          name: input.teacher.name,
          avatarUrl: input.teacher.avatarUrl,
          branch: input.teacher.branch,
          year: input.teacher.year,
        },
        skill: input.teacher.skill,
        message: input.message || null,
        scheduledAt: input.preferredAt,
        durationMin: 60,
        mode: input.mode,
        location: null,
        meetLink: null,
        counterpartPhone: null,
        viewerConfirmed: false,
        counterpartConfirmed: false,
        viewerRated: false,
        createdAt: new Date(),
      }

      setState((current) => ({ ...current, sessions: [session, ...current.sessions] }))
      // The teacher picks the request up a few moments later.
      schedule({
        dueAt: Date.now() + 8000 + Math.round(Math.random() * 7000),
        type: 'TEACHER_ACCEPTS',
        sessionId: id,
      })
      return { ok: true }
    },
    [schedule],
  )

  const cancelSession = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      sessions: current.sessions.map((s) =>
        s.id === id ? { ...s, status: 'CANCELLED' as const } : s,
      ),
      events: current.events.filter((e) => !('sessionId' in e) || e.sessionId !== id),
    }))
  }, [])

  const acceptSession = useCallback((id: string, input: AcceptInput) => {
    setState((current) => ({
      ...current,
      sessions: current.sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'ACCEPTED' as const,
              scheduledAt: input.scheduledAt,
              mode: input.mode,
              location: input.location,
              meetLink: input.meetLink,
              // Phone is revealed to both sides only now, on acceptance.
              counterpartPhone: '+919000000021',
            }
          : s,
      ),
    }))
  }, [])

  const declineSession = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      sessions: current.sessions.map((s) =>
        s.id === id ? { ...s, status: 'DECLINED' as const } : s,
      ),
    }))
  }, [])

  const confirmAttendance = useCallback(
    (id: string) => {
      const session = stateRef.current.sessions.find((s) => s.id === id)
      if (!session || session.viewerConfirmed) return

      if (session.counterpartConfirmed) {
        settleCompletion(id)
        return
      }

      setState((current) => ({
        ...current,
        sessions: current.sessions.map((s) =>
          s.id === id ? { ...s, viewerConfirmed: true } : s,
        ),
      }))
      // The other person confirms a moment later, completing the settlement.
      schedule({ dueAt: Date.now() + 2600, type: 'COUNTERPART_CONFIRMS', sessionId: id })
    },
    [schedule, settleCompletion],
  )

  const rateSession = useCallback((id: string, score: number, comment: string) => {
    // Phase B persists the rating itself; Phase A only flips the viewer's flag.
    void score
    void comment
    setState((current) => ({
      ...current,
      sessions: current.sessions.map((s) =>
        s.id === id ? { ...s, viewerRated: true } : s,
      ),
    }))
  }, [])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
  }, [])

  const toggleFavorite = useCallback((teacherId: string) => {
    setState((current) => ({
      ...current,
      favorites: current.favorites.includes(teacherId)
        ? current.favorites.filter((id) => id !== teacherId)
        : [...current.favorites, teacherId],
    }))
  }, [])

  const markNotificationsRead = useCallback(() => {
    setState((current) =>
      current.notifications.some((n) => !n.read)
        ? {
            ...current,
            notifications: current.notifications.map((n) =>
              n.read ? n : { ...n, read: true },
            ),
          }
        : current,
    )
  }, [])

  const completeOnboarding = useCallback((input: OnboardingInput) => {
    const teachesSomething = input.teaches.length > 0
    const now = Date.now()

    setState({
      onboarded: true,
      profile: {
        ...BLANK_PROFILE,
        name: input.name,
        branch: input.branch,
        year: input.year,
        bio: input.bio || null,
        teaches: input.teaches.map(({ skill, level }) => ({ skill, level, note: null })),
        wants: input.wants.map((skill) => ({ skill })),
        credits: 1,
        joinedAt: new Date(),
      },
      sessions: [],
      ledger: [
        {
          id: 'c-signup',
          delta: 1,
          reason: 'SIGNUP_BONUS',
          description: 'Welcome credit — your first session is on us',
          createdAt: new Date(),
        },
      ],
      favorites: [],
      notifications: [
        {
          id: eventId(),
          kind: 'reminder',
          title: `Welcome, ${input.name.split(' ')[0]}!`,
          body: 'You start with 1 credit. Spend it learning, earn more by teaching.',
          href: '/wallet',
          read: false,
          createdAt: new Date(),
        },
      ],
      // Teachers get discovered: requests start arriving shortly after joining.
      // Demo mode only — in production, requests come from real students.
      events: isDemoMode() && teachesSomething
        ? [
            {
              id: eventId(),
              dueAt: now + 15000,
              type: 'INCOMING_REQUEST',
              excludeIds: [],
            },
            {
              id: eventId(),
              dueAt: now + 80000,
              type: 'INCOMING_REQUEST',
              excludeIds: [],
            },
          ]
        : [],
    })
  }, [])

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setState(FRESH)
  }, [])

  const value = useMemo(
    () => ({
      hydrated,
      onboarded: state.onboarded,
      profile: state.profile,
      sessions: state.sessions,
      ledger: state.ledger,
      favorites: state.favorites,
      notifications: state.notifications,
      toggleFavorite,
      markNotificationsRead,
      requestSession,
      cancelSession,
      acceptSession,
      declineSession,
      confirmAttendance,
      rateSession,
      updateProfile,
      completeOnboarding,
      resetDemo,
    }),
    [
      hydrated,
      state,
      toggleFavorite,
      markNotificationsRead,
      requestSession,
      cancelSession,
      acceptSession,
      declineSession,
      confirmAttendance,
      rateSession,
      updateProfile,
      completeOnboarding,
      resetDemo,
    ],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
