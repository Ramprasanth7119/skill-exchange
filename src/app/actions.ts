'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, isAllowedEmail, requireUser } from '@/lib/auth'
import { getClientState, getPublicProfileData } from '@/lib/data'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { isSupabaseConfigured } from '@/lib/env'
import { redirect } from 'next/navigation'
import type { ActionResult, ClientState, PublicProfile } from '@/lib/types'

/**
 * Every mutation in the app, as Server Actions. Server Functions are reachable
 * by direct POST regardless of what the UI shows, so each one:
 *   1. re-checks auth itself (`requireUser`),
 *   2. validates its input with Zod,
 *   3. re-checks the domain invariants from CLAUDE.md at write time.
 * They return `ActionResult` so the client store can surface errors uniformly.
 */

const fail = (error: string): ActionResult<never> => ({ ok: false, error })

function assertLive() {
  if (!isSupabaseConfigured()) throw new Error('Server Actions are inert in demo mode')
}

/** One round-trip for the client store to re-sync after any mutation. */
export async function refreshClientState(): Promise<ClientState> {
  assertLive()
  return getClientState()
}

export async function fetchPublicProfile(id: string): Promise<PublicProfile | null> {
  assertLive()
  await requireUser() // profiles are for members, not for scraping
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return null
  return getPublicProfileData(parsed.data)
}

/* ------------------------------------------------------------------ */
/* Onboarding & profile                                                */
/* ------------------------------------------------------------------ */

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  branch: z.string().trim().min(1).max(20),
  year: z.number().int().min(1).max(5),
  bio: z.string().trim().max(280),
  teaches: z
    .array(
      z.object({
        skillId: z.string().uuid(),
        level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
      }),
    )
    .max(10),
  wants: z.array(z.string().uuid()).max(10),
})

export async function completeOnboardingAction(
  input: z.infer<typeof onboardingSchema>,
): Promise<ActionResult> {
  assertLive()
  const authUser = await getAuthUser()
  if (!authUser?.email) return fail('Sign in first.')
  if (!isAllowedEmail(authUser.email)) {
    return fail('Only college email addresses can join this campus.')
  }
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) return fail('Some details are missing or invalid.')
  const data = parsed.data

  const existing = await prisma.user.findUnique({ where: { id: authUser.id } })
  if (existing) return fail('This account is already set up.')

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: authUser.id,
        email: authUser.email!,
        name: data.name,
        branch: data.branch,
        year: data.year,
        bio: data.bio || null,
        skills: {
          create: [
            ...data.teaches.map(({ skillId, level }) => ({
              skillId,
              kind: 'TEACH' as const,
              level,
            })),
            ...data.wants
              .filter((skillId) => !data.teaches.some((t) => t.skillId === skillId))
              .map((skillId) => ({ skillId, kind: 'LEARN' as const })),
          ],
        },
      },
    })
    await tx.creditTransaction.create({
      data: {
        amount: 1,
        reason: 'SIGNUP_BONUS',
        toUserId: authUser.id,
        note: 'Welcome credit — your first session is on us',
      },
    })
    await tx.notification.create({
      data: {
        userId: authUser.id,
        kind: 'REMINDER',
        title: `Welcome, ${data.name.split(' ')[0]}!`,
        body: 'You start with 1 credit. Spend it learning, earn more by teaching.',
        href: '/wallet',
      },
    })
  })
  return { ok: true, data: undefined }
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  branch: z.string().trim().min(1).max(20).nullable(),
  year: z.number().int().min(1).max(5).nullable(),
  bio: z.string().trim().max(280).nullable(),
  phone: z.string().trim().max(20).nullable(),
  teaches: z
    .array(
      z.object({
        skillId: z.string().uuid(),
        level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
        note: z.string().trim().max(200).nullable(),
      }),
    )
    .max(10),
  wants: z.array(z.string().uuid()).max(10),
})

export async function updateProfileAction(
  input: z.infer<typeof profileSchema>,
): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return fail('Some details are invalid.')
  const data = parsed.data

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        branch: data.branch,
        year: data.year,
        bio: data.bio,
        phone: data.phone,
      },
    })
    // Skills are replaced wholesale — simpler and safe, they carry no history.
    await tx.userSkill.deleteMany({ where: { userId: user.id } })
    await tx.userSkill.createMany({
      data: [
        ...data.teaches.map(({ skillId, level, note }) => ({
          userId: user.id,
          skillId,
          kind: 'TEACH' as const,
          level,
          note,
        })),
        ...data.wants
          .filter((skillId) => !data.teaches.some((t) => t.skillId === skillId))
          .map((skillId) => ({ userId: user.id, skillId, kind: 'LEARN' as const })),
      ],
    })
  })
  return { ok: true, data: undefined }
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const requestSchema = z.object({
  teacherId: z.string().uuid(),
  skillId: z.string().uuid(),
  mode: z.enum(['IN_PERSON', 'ONLINE']),
  message: z.string().trim().max(500),
  preferredAt: z.date().nullable(),
})

export async function requestSessionAction(
  input: z.infer<typeof requestSchema>,
): Promise<ActionResult<{ sessionId: string }>> {
  assertLive()
  const user = await requireUser()
  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return fail('The request looks invalid — try again.')
  const data = parsed.data

  // Invariant 6: nobody teaches themselves.
  if (data.teacherId === user.id) return fail('You cannot book a session with yourself.')
  // Invariant 5: at least 1 credit at request time.
  if (user.credits < 1) {
    return fail('You need at least 1 credit to request a session. Teach an hour to earn one.')
  }
  // Light abuse guard: max 5 open requests per hour.
  const recent = await prisma.swapSession.count({
    where: {
      learnerId: user.id,
      createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  })
  if (recent >= 5) return fail('That’s a lot of requests at once — give teachers a moment to reply.')

  const offers = await prisma.userSkill.findFirst({
    where: { userId: data.teacherId, skillId: data.skillId, kind: 'TEACH' },
    include: { skill: true, user: true },
  })
  if (!offers) return fail('That teacher no longer offers this skill.')

  const session = await prisma.swapSession.create({
    data: {
      skillId: data.skillId,
      learnerId: user.id,
      teacherId: data.teacherId,
      mode: data.mode,
      message: data.message || null,
      scheduledAt: data.preferredAt,
    },
  })
  await prisma.notification.create({
    data: {
      userId: data.teacherId,
      kind: 'REQUEST',
      title: `New request from ${user.name.split(' ')[0]}`,
      body: `They want to learn ${offers.skill.name}. Accept to earn a credit.`,
      href: `/sessions/${session.id}`,
    },
  })
  await sendEmail(
    offers.user.email,
    `${user.name.split(' ')[0]} wants to learn ${offers.skill.name}`,
    `<p><strong>${user.name}</strong> requested an hour of ${offers.skill.name}.</p>
     ${data.message ? `<p>&ldquo;${data.message}&rdquo;</p>` : ''}
     <p>Accept it to earn a credit.</p>`,
  )
  return { ok: true, data: { sessionId: session.id } }
}

const acceptSchema = z.object({
  sessionId: z.string().uuid(),
  scheduledAt: z.date(),
  mode: z.enum(['IN_PERSON', 'ONLINE']),
  location: z.string().trim().max(120).nullable(),
  // Students paste "meet.google.com/…" without a protocol — don't reject that.
  meetLink: z.string().trim().max(200).nullable(),
})

export async function acceptSessionAction(
  input: z.infer<typeof acceptSchema>,
): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  const parsed = acceptSchema.safeParse(input)
  if (!parsed.success) return fail('Pick a valid time and place.')
  const data = parsed.data

  const session = await prisma.swapSession.findUnique({
    where: { id: data.sessionId },
    include: { skill: true, learner: true },
  })
  if (!session || session.teacherId !== user.id) return fail('Not your request to accept.')
  if (session.status !== 'REQUESTED') return fail('This request has already been answered.')

  await prisma.swapSession.update({
    where: { id: session.id },
    data: {
      status: 'ACCEPTED',
      scheduledAt: data.scheduledAt,
      mode: data.mode,
      location: data.mode === 'IN_PERSON' ? data.location : null,
      meetLink: data.mode === 'ONLINE' ? data.meetLink : null,
    },
  })
  await prisma.notification.create({
    data: {
      userId: session.learnerId,
      kind: 'ACCEPTED',
      title: `${user.name.split(' ')[0]} said yes!`,
      body: `Your ${session.skill.name} session is on the calendar.`,
      href: `/sessions/${session.id}`,
    },
  })
  await sendEmail(
    session.learner.email,
    `${user.name.split(' ')[0]} accepted your ${session.skill.name} session`,
    `<p>You're on for <strong>${session.skill.name}</strong> with ${user.name}.</p>
     <p>The time, place and contact details are waiting in your sessions.</p>`,
  )
  return { ok: true, data: undefined }
}

export async function declineSessionAction(sessionId: string): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  const session = await prisma.swapSession.findUnique({ where: { id: sessionId } })
  if (!session || session.teacherId !== user.id) return fail('Not your request to decline.')
  if (session.status !== 'REQUESTED') return fail('This request has already been answered.')
  await prisma.swapSession.update({ where: { id: sessionId }, data: { status: 'DECLINED' } })
  return { ok: true, data: undefined }
}

export async function cancelSessionAction(sessionId: string): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  const session = await prisma.swapSession.findUnique({ where: { id: sessionId } })
  if (!session || (session.learnerId !== user.id && session.teacherId !== user.id)) {
    return fail('Not your session to cancel.')
  }
  if (session.status !== 'REQUESTED' && session.status !== 'ACCEPTED') {
    return fail('This session can no longer be cancelled.')
  }
  await prisma.swapSession.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED', cancelledById: user.id },
  })
  return { ok: true, data: undefined }
}

export async function confirmAttendanceAction(sessionId: string): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  const session = await prisma.swapSession.findUnique({
    where: { id: sessionId },
    include: { skill: true, learner: true, teacher: true },
  })
  if (!session || (session.learnerId !== user.id && session.teacherId !== user.id)) {
    return fail('Not your session to confirm.')
  }
  if (session.status !== 'ACCEPTED') return fail('Only an accepted session can be confirmed.')

  const isLearner = session.learnerId === user.id
  const already = isLearner ? session.learnerConfirmedAt : session.teacherConfirmedAt
  if (already) return { ok: true, data: undefined } // idempotent

  const otherConfirmed = isLearner ? session.teacherConfirmedAt : session.learnerConfirmedAt

  if (!otherConfirmed) {
    await prisma.swapSession.update({
      where: { id: sessionId },
      data: isLearner ? { learnerConfirmedAt: new Date() } : { teacherConfirmedAt: new Date() },
    })
    return { ok: true, data: undefined }
  }

  // Invariants 3+4: both sides have now confirmed — move the credit and flip
  // the status in ONE transaction. The @unique on sessionId makes a concurrent
  // double-settlement impossible; the second insert throws and rolls back.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.swapSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          ...(isLearner ? { learnerConfirmedAt: new Date() } : { teacherConfirmedAt: new Date() }),
        },
      })
      await tx.creditTransaction.create({
        data: {
          amount: 1,
          reason: 'SESSION_COMPLETED',
          sessionId,
          fromUserId: session.learnerId,
          toUserId: session.teacherId,
          note: `${session.skill.name} — ${session.teacher.name.split(' ')[0]} taught ${session.learner.name.split(' ')[0]}`,
        },
      })
      await tx.notification.createMany({
        data: [
          {
            userId: session.teacherId,
            kind: 'CREDIT' as const,
            title: '+1 credit earned',
            body: `You taught ${session.skill.name} to ${session.learner.name.split(' ')[0]}.`,
            href: '/wallet',
          },
          {
            userId: session.learnerId,
            kind: 'CREDIT' as const,
            title: 'Session completed',
            body: `1 credit went to ${session.teacher.name.split(' ')[0]} — rate the session?`,
            href: `/sessions/${sessionId}`,
          },
        ],
      })
    })
  } catch {
    return fail('This session has already been settled.')
  }
  await sendEmail(
    session.teacher.email,
    `+1 credit — you taught ${session.skill.name}`,
    `<p>${session.learner.name.split(' ')[0]} confirmed the session. One credit is in your wallet.</p>`,
  )
  return { ok: true, data: undefined }
}

const rateSchema = z.object({
  sessionId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(400),
})

export async function rateSessionAction(input: z.infer<typeof rateSchema>): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  const parsed = rateSchema.safeParse(input)
  if (!parsed.success) return fail('Pick a star rating first.')
  const data = parsed.data

  const session = await prisma.swapSession.findUnique({ where: { id: data.sessionId } })
  if (!session || (session.learnerId !== user.id && session.teacherId !== user.id)) {
    return fail('Not your session to rate.')
  }
  if (session.status !== 'COMPLETED') return fail('Only completed sessions can be rated.')

  const subjectId = session.learnerId === user.id ? session.teacherId : session.learnerId
  try {
    await prisma.rating.create({
      data: {
        sessionId: data.sessionId,
        authorId: user.id,
        subjectId,
        score: data.score,
        comment: data.comment || null,
      },
    })
  } catch {
    return fail('You have already rated this session.')
  }
  return { ok: true, data: undefined }
}

/* ------------------------------------------------------------------ */
/* Favorites, notifications, sign-out                                  */
/* ------------------------------------------------------------------ */

export async function toggleFavoriteAction(teacherId: string): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  if (!z.string().uuid().safeParse(teacherId).success) return fail('Unknown teacher.')

  const existing = await prisma.favorite.findUnique({
    where: { userId_teacherId: { userId: user.id, teacherId } },
  })
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } })
  } else {
    await prisma.favorite.create({ data: { userId: user.id, teacherId } })
  }
  return { ok: true, data: undefined }
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })
  return { ok: true, data: undefined }
}

export async function signOutAction() {
  assertLive()
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

/**
 * Account deletion. The credit ledger is append-only and sessions are shared
 * history with another student, so those rows stay — everything personal is
 * wiped instead: identity fields anonymized, skills/favorites/notifications
 * deleted. With a service-role key configured, the Supabase auth user is
 * removed too; without one, sign-out still ends the session and the domain
 * gate plus the anonymized email keep the row inert.
 */
export async function deleteAccountAction(): Promise<ActionResult> {
  assertLive()
  const user = await requireUser()

  await prisma.$transaction([
    prisma.userSkill.deleteMany({ where: { userId: user.id } }),
    prisma.favorite.deleteMany({ where: { OR: [{ userId: user.id }, { teacherId: user.id }] } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: 'Former student',
        email: `deleted-${user.id}@removed.invalid`,
        avatarUrl: null,
        bio: null,
        branch: null,
        year: null,
        phone: null,
      },
    }),
  ])

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    await admin.auth.admin.deleteUser(user.id).catch(() => {
      // The profile is already anonymized; auth cleanup can be re-run manually.
    })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
