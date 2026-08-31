import type {
  SessionMode,
  SessionStatus,
  SkillCategory,
  SkillLevel,
} from '@/generated/prisma/enums'

/**
 * View models — the contract between the UI and the data layer.
 *
 * The UI imports ONLY from this file, never from Prisma directly. That keeps
 * the two build phases independent: screens can be finished against the mock
 * fixtures in `mock-data.ts`, and the API phase only has to return these exact
 * shapes for the whole app to light up. Change a shape here and both sides see
 * it as a type error, which is the point.
 */

export type { SessionMode, SessionStatus, SkillCategory, SkillLevel }

export type SkillTag = {
  id: string
  name: string
  slug: string
  category: SkillCategory
}

/** A person as shown in a list or on a card. */
export type PersonSummary = {
  id: string
  name: string
  avatarUrl: string | null
  branch: string | null
  year: number | null
}

/** A teacher as shown on the Discover page. */
export type TeacherCard = PersonSummary & {
  bio: string | null
  /** The skill this card is surfacing them for. */
  skill: SkillTag
  level: SkillLevel
  note: string | null
  /** null when they have not been rated yet — render "New", not a zero. */
  averageRating: number | null
  ratingCount: number
  sessionsTaught: number
  /**
   * What this teacher wants to learn in return. When it overlaps with the
   * viewer's `teaches`, discovery surfaces a "perfect swap" — the feature that
   * makes exchange platforms sticky: both sides earn while both sides learn.
   */
  lookingFor: SkillTag[]
}

/** The signed-in user's own profile. */
export type Profile = PersonSummary & {
  email: string
  bio: string | null
  phone: string | null
  credits: number
  teaches: Array<{ skill: SkillTag; level: SkillLevel; note: string | null }>
  wants: Array<{ skill: SkillTag }>
  averageRating: number | null
  ratingCount: number
  sessionsTaught: number
  sessionsLearned: number
  joinedAt: Date
}

/** Someone else's public profile. */
export type PublicProfile = Omit<Profile, 'email' | 'phone' | 'credits' | 'wants'> & {
  wants: Array<{ skill: SkillTag }>
  recentReviews: Review[]
}

export type Review = {
  id: string
  score: number
  comment: string | null
  createdAt: Date
  author: PersonSummary
  skillName: string
}

/**
 * A swap session in a list. `role` says which side the viewer is on, which is
 * what decides the wording and the available actions on every session card.
 */
export type SessionSummary = {
  id: string
  status: SessionStatus
  role: 'learner' | 'teacher'
  /** The other person — the viewer is always the implicit "you". */
  counterpart: PersonSummary
  skill: SkillTag
  message: string | null
  scheduledAt: Date | null
  durationMin: number
  mode: SessionMode
  location: string | null
  meetLink: string | null
  /**
   * WhatsApp handoff number. Domain rule: only present once the session is
   * ACCEPTED — never in REQUESTED payloads, never in discovery.
   */
  counterpartPhone: string | null
  /** Has the viewer already pressed "mark complete"? */
  viewerConfirmed: boolean
  /** Has the other person? Both true means the credit has moved. */
  counterpartConfirmed: boolean
  /** True once the viewer has left a rating for this session. */
  viewerRated: boolean
  createdAt: Date
}

/** One row of the credit ledger, as shown on the wallet screen. */
export type CreditEntry = {
  id: string
  /** Positive means earned, negative means spent — already signed for display. */
  delta: number
  reason: 'SIGNUP_BONUS' | 'SESSION_COMPLETED' | 'ADJUSTMENT'
  description: string
  createdAt: Date
}

/** An item in the in-app notification centre (the bell in the header). */
export type AppNotification = {
  id: string
  kind: 'request' | 'accepted' | 'credit' | 'reminder'
  title: string
  body: string
  /** Where tapping the notification should land. */
  href: string
  read: boolean
  createdAt: Date
}

/** Standard result shape for every Server Action, so forms handle them uniformly. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
