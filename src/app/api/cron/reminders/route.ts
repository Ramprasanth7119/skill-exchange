import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { isSupabaseConfigured } from '@/lib/env'
import { formatSessionTime } from '@/lib/format'

/**
 * The day-before nudge. A session nobody is reminded of is a session somebody
 * forgets, and a no-show costs the other student an hour they set aside.
 *
 * Idempotent by construction: `reminderSentAt` is stamped in the same pass, so
 * a retried or double-scheduled cron cannot mail anyone twice. Accepting a new
 * time clears the stamp, so a moved session gets reminded again for its new
 * slot (see `respondToProposalAction`).
 *
 * Wire it up in `vercel.json`; run it by hand with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
 */

const WINDOW_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // No secret means no endpoint. An open cron route is an open mailer.
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured()) {
    return Response.json({ error: 'No database configured' }, { status: 503 })
  }

  const now = new Date()
  const due = await prisma.swapSession.findMany({
    where: {
      status: 'ACCEPTED',
      reminderSentAt: null,
      scheduledAt: { gte: now, lte: new Date(now.getTime() + WINDOW_MS) },
    },
    include: { skill: true, learner: true, teacher: true },
    take: 200,
  })

  for (const session of due) {
    if (!session.scheduledAt) continue
    const when = formatSessionTime(session.scheduledAt)
    const where =
      session.mode === 'ONLINE'
        ? (session.meetLink ?? 'Online')
        : (session.location ?? 'On campus')

    // Stamp first: a mail that fails is better than a mail sent twice, and
    // both sides still see the in-app notification below.
    await prisma.swapSession.update({
      where: { id: session.id },
      data: { reminderSentAt: new Date() },
    })

    await prisma.notification.createMany({
      data: [
        {
          userId: session.teacherId,
          kind: 'REMINDER' as const,
          title: `Teaching ${session.skill.name} — ${when}`,
          body: `${session.learner.name.split(' ')[0]} is counting on you. ${where}.`,
          href: `/sessions/${session.id}`,
        },
        {
          userId: session.learnerId,
          kind: 'REMINDER' as const,
          title: `Learning ${session.skill.name} — ${when}`,
          body: `With ${session.teacher.name.split(' ')[0]}. ${where}.`,
          href: `/sessions/${session.id}`,
        },
      ],
    })

    await Promise.all([
      sendEmail(
        session.teacher.email,
        `Reminder: you're teaching ${session.skill.name} ${when.toLowerCase()}`,
        `<p><strong>${when}</strong> · ${where}</p>
         <p>${session.learner.name} is expecting you. If something has come up,
         suggest a new time in the app rather than leaving them waiting.</p>`,
      ),
      sendEmail(
        session.learner.email,
        `Reminder: ${session.skill.name} with ${session.teacher.name.split(' ')[0]} ${when.toLowerCase()}`,
        `<p><strong>${when}</strong> · ${where}</p>
         <p>Bring your questions. Confirm afterwards in the app — that is when
         the credit moves.</p>`,
      ),
    ])
  }

  return Response.json({ reminded: due.length })
}
