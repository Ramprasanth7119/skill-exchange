import 'server-only'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type {
  AppNotification,
  AvailabilitySlot,
  ChatMessage,
  ClientState,
  CreditEntry,
  FeedbackNote,
  PersonSummary,
  Profile,
  PublicProfile,
  Review,
  SessionSummary,
  SkillTag,
  TeacherCard,
} from '@/lib/types'

/**
 * Real loaders for the view models in `types.ts` — the production counterpart
 * of `campus.ts`. Everything here maps Prisma rows into the exact shapes the
 * UI was built against, so no component changes when demo mode switches off.
 */

type SkillRow = { id: string; name: string; slug: string; category: SkillTag['category'] }

const toSkillTag = (s: SkillRow): SkillTag => ({
  id: s.id,
  name: s.name,
  slug: s.slug,
  category: s.category,
})

type PersonRow = {
  id: string
  name: string
  avatarUrl: string | null
  branch: string | null
  year: number | null
}

const toPerson = (u: PersonRow): PersonSummary => ({
  id: u.id,
  name: u.name,
  avatarUrl: u.avatarUrl,
  branch: u.branch,
  year: u.year,
})

type AvailabilityRow = { id: string; weekday: number; startMin: number; endMin: number }

const toSlot = (a: AvailabilityRow): AvailabilitySlot => ({
  id: a.id,
  weekday: a.weekday,
  startMin: a.startMin,
  endMin: a.endMin,
})

/** Weekday then start time — the order a human reads a week in. */
const SLOT_ORDER = [{ weekday: 'asc' }, { startMin: 'asc' }] as const

export async function getSkillCatalog(): Promise<SkillTag[]> {
  const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } })
  return skills.map(toSkillTag)
}

/** Avg rating, rating count and completed-teaching count per user, in bulk. */
async function getTeacherStats(userIds: string[]) {
  if (userIds.length === 0) {
    return { ratings: new Map<string, { avg: number; count: number }>(), taught: new Map<string, number>() }
  }
  const [ratingRows, taughtRows] = await Promise.all([
    prisma.rating.groupBy({
      by: ['subjectId'],
      where: { subjectId: { in: userIds } },
      _avg: { score: true },
      _count: true,
    }),
    prisma.swapSession.groupBy({
      by: ['teacherId'],
      where: { teacherId: { in: userIds }, status: 'COMPLETED' },
      _count: true,
    }),
  ])
  return {
    ratings: new Map(
      ratingRows.map((r) => [
        r.subjectId,
        { avg: Math.round((r._avg.score ?? 0) * 10) / 10, count: r._count },
      ]),
    ),
    taught: new Map(taughtRows.map((r) => [r.teacherId, r._count])),
  }
}

/** Everyone teaching something — one card per (teacher, skill), like the fixtures. */
export async function getTeachers(excludeUserId?: string | null): Promise<TeacherCard[]> {
  const teachRows = await prisma.userSkill.findMany({
    where: { kind: 'TEACH', ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
    include: {
      skill: true,
      user: { include: { skills: { where: { kind: 'LEARN' }, include: { skill: true } } } },
    },
    orderBy: { user: { createdAt: 'asc' } },
  })

  const teacherIds = [...new Set(teachRows.map((r) => r.userId))]
  const [{ ratings, taught }, slotRows] = await Promise.all([
    getTeacherStats(teacherIds),
    prisma.availability.findMany({
      where: { userId: { in: teacherIds } },
      orderBy: [...SLOT_ORDER],
    }),
  ])
  const slotsByUser = new Map<string, AvailabilitySlot[]>()
  for (const row of slotRows) {
    const list = slotsByUser.get(row.userId) ?? []
    list.push(toSlot(row))
    slotsByUser.set(row.userId, list)
  }

  return teachRows.map((row) => {
    const stats = ratings.get(row.userId)
    return {
      ...toPerson(row.user),
      bio: row.user.bio,
      skill: toSkillTag(row.skill),
      level: row.level ?? 'INTERMEDIATE',
      note: row.note,
      averageRating: stats?.avg ?? null,
      ratingCount: stats?.count ?? 0,
      sessionsTaught: taught.get(row.userId) ?? 0,
      lookingFor: row.user.skills.map((s) => toSkillTag(s.skill)),
      availability: slotsByUser.get(row.userId) ?? [],
    }
  })
}

type SessionRow = Awaited<ReturnType<typeof findViewerSessions>>[number]

function findViewerSessions(userId: string) {
  return prisma.swapSession.findMany({
    where: { OR: [{ learnerId: userId }, { teacherId: userId }] },
    include: {
      skill: true,
      learner: { include: { availability: { orderBy: [...SLOT_ORDER] } } },
      teacher: { include: { availability: { orderBy: [...SLOT_ORDER] } } },
      ratings: { where: { authorId: userId }, select: { id: true } },
      // Newest 100, then reversed below: a `take` with ascending order would
      // hand back the *oldest* 100 and truncate the live end of the thread.
      messages: {
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

function toSessionSummary(row: SessionRow, viewerId: string): SessionSummary {
  const isLearner = row.learnerId === viewerId
  const counterpart = isLearner ? row.teacher : row.learner

  const messages: ChatMessage[] = [...row.messages].reverse().map((m) => ({
    id: m.id,
    body: m.body,
    mine: m.senderId === viewerId,
    senderName: m.sender.name,
    createdAt: m.createdAt,
  }))

  return {
    id: row.id,
    status: row.status,
    role: isLearner ? 'learner' : 'teacher',
    counterpart: toPerson(counterpart),
    skill: toSkillTag(row.skill),
    message: row.message,
    scheduledAt: row.scheduledAt,
    durationMin: row.durationMin,
    mode: row.mode,
    location: row.location,
    meetLink: row.meetLink,
    // Domain rule: contact is exchanged only once the teacher has accepted.
    counterpartPhone: row.status === 'ACCEPTED' ? counterpart.phone : null,
    viewerConfirmed: Boolean(isLearner ? row.learnerConfirmedAt : row.teacherConfirmedAt),
    counterpartConfirmed: Boolean(isLearner ? row.teacherConfirmedAt : row.learnerConfirmedAt),
    viewerRated: row.ratings.length > 0,
    messages,
    unreadCount: row.messages.filter((m) => m.senderId !== viewerId && m.readAt === null).length,
    proposal:
      row.proposedAt && row.proposedById
        ? {
            at: row.proposedAt,
            mode: row.proposedMode ?? row.mode,
            location: row.proposedLocation,
            meetLink: row.proposedMeetLink,
            note: row.proposalNote,
            mine: row.proposedById === viewerId,
          }
        : null,
    counterpartAvailability: counterpart.availability.map(toSlot),
    createdAt: row.createdAt,
  }
}

const REASON_FALLBACK: Record<CreditEntry['reason'], string> = {
  SIGNUP_BONUS: 'Welcome credit — your first session is on us',
  SESSION_COMPLETED: 'Session completed',
  ADJUSTMENT: 'Balance adjustment',
}

async function getLedger(userId: string): Promise<CreditEntry[]> {
  const rows = await prisma.creditTransaction.findMany({
    where: { OR: [{ toUserId: userId }, { fromUserId: userId }] },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return rows.map((row) => ({
    id: row.id,
    delta: row.toUserId === userId ? row.amount : -row.amount,
    reason: row.reason,
    description: row.note ?? REASON_FALLBACK[row.reason],
    createdAt: row.createdAt,
  }))
}

async function getNotifications(userId: string): Promise<AppNotification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const kindMap = {
    REQUEST: 'request',
    ACCEPTED: 'accepted',
    CREDIT: 'credit',
    REMINDER: 'reminder',
    MESSAGE: 'message',
    RESCHEDULE: 'reschedule',
  } as const
  return rows.map((row) => ({
    id: row.id,
    kind: kindMap[row.kind],
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.readAt !== null,
    createdAt: row.createdAt,
  }))
}

/** The landing-page shout-out wall: newest published voices, with authors. */
export async function getFeedbackWall(limit = 6): Promise<FeedbackNote[]> {
  const rows = await prisma.feedback.findMany({
    where: { published: true, NOT: { user: { email: { endsWith: '@removed.invalid' } } } },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    author: toPerson(row.user),
    createdAt: row.createdAt,
  }))
}

/**
 * The whole client payload in one call — what `LiveProvider` hydrates from and
 * refreshes with. Works signed-out too (public catalogue only), so the landing
 * page and login screen share the same code path.
 */
export async function getClientState(): Promise<ClientState> {
  const user = await getCurrentUser()

  const [skills, teachers] = await Promise.all([getSkillCatalog(), getTeachers(user?.id)])

  if (!user) {
    return {
      profile: null,
      sessions: [],
      ledger: [],
      favorites: [],
      notifications: [],
      skills,
      teachers,
      feedback: null,
    }
  }

  const [
    sessionRows,
    ledger,
    notifications,
    favoriteRows,
    stats,
    learned,
    ownFeedback,
    ownSlots,
  ] = await Promise.all([
      findViewerSessions(user.id),
      getLedger(user.id),
      getNotifications(user.id),
      prisma.favorite.findMany({ where: { userId: user.id }, select: { teacherId: true } }),
      getTeacherStats([user.id]),
      prisma.swapSession.count({ where: { learnerId: user.id, status: 'COMPLETED' } }),
      prisma.feedback.findUnique({ where: { userId: user.id }, select: { message: true } }),
      prisma.availability.findMany({ where: { userId: user.id }, orderBy: [...SLOT_ORDER] }),
    ])

  const ratingStats = stats.ratings.get(user.id)
  const profile: Profile = {
    ...toPerson(user),
    email: user.email,
    bio: user.bio,
    phone: user.phone,
    credits: user.credits,
    teaches: user.skills
      .filter((s) => s.kind === 'TEACH')
      .map((s) => ({ skill: toSkillTag(s.skill), level: s.level ?? 'INTERMEDIATE', note: s.note })),
    wants: user.skills
      .filter((s) => s.kind === 'LEARN')
      .map((s) => ({ skill: toSkillTag(s.skill) })),
    averageRating: ratingStats?.avg ?? null,
    ratingCount: ratingStats?.count ?? 0,
    sessionsTaught: stats.taught.get(user.id) ?? 0,
    sessionsLearned: learned,
    joinedAt: user.createdAt,
    availability: ownSlots.map(toSlot),
  }

  return {
    profile,
    sessions: sessionRows.map((row) => toSessionSummary(row, user.id)),
    ledger,
    favorites: favoriteRows.map((f) => f.teacherId),
    notifications,
    skills,
    teachers,
    feedback: ownFeedback?.message ?? null,
  }
}

/** A teacher's public page: skills both ways, stats and recent reviews. */
export async function getPublicProfileData(id: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      skills: { include: { skill: true } },
      availability: { orderBy: [...SLOT_ORDER] },
    },
  })
  if (!user) return null

  const [stats, learned, reviewRows] = await Promise.all([
    getTeacherStats([id]),
    prisma.swapSession.count({ where: { learnerId: id, status: 'COMPLETED' } }),
    prisma.rating.findMany({
      where: { subjectId: id },
      include: { author: true, session: { include: { skill: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const ratingStats = stats.ratings.get(id)
  const recentReviews: Review[] = reviewRows.map((row) => ({
    id: row.id,
    score: row.score,
    comment: row.comment,
    createdAt: row.createdAt,
    author: toPerson(row.author),
    skillName: row.session.skill.name,
  }))

  return {
    ...toPerson(user),
    bio: user.bio,
    teaches: user.skills
      .filter((s) => s.kind === 'TEACH')
      .map((s) => ({ skill: toSkillTag(s.skill), level: s.level ?? 'INTERMEDIATE', note: s.note })),
    wants: user.skills.filter((s) => s.kind === 'LEARN').map((s) => ({ skill: toSkillTag(s.skill) })),
    averageRating: ratingStats?.avg ?? null,
    ratingCount: ratingStats?.count ?? 0,
    sessionsTaught: stats.taught.get(id) ?? 0,
    sessionsLearned: learned,
    joinedAt: user.createdAt,
    availability: user.availability.map(toSlot),
    recentReviews,
  }
}
