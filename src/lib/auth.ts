import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * The signed-in Supabase user, or null.
 *
 * Always `getUser()`, never `getSession()`: getSession reads the cookie without
 * verifying it, so a forged cookie would pass. getUser revalidates against
 * Supabase's auth server.
 */
export async function getAuthUser() {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * The signed-in user's row in our own tables, with their credit balance.
 * Returns null when signed out, or when auth succeeded but onboarding has not
 * created the profile row yet.
 */
export async function getCurrentUser() {
  const authUser = await getAuthUser()
  if (!authUser) return null

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { skills: { include: { skill: true } } },
  })
  if (!user) return null

  return { ...user, credits: await getCreditBalance(user.id) }
}

/**
 * Guard for pages and Server Actions. Server Functions are reachable by direct
 * POST, so every mutating action must call this itself — routing alone is not
 * a security boundary.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Balance is always derived from the ledger, never stored, so it cannot drift
 * out of sync with the transactions that produced it.
 */
export async function getCreditBalance(userId: string) {
  const [earned, spent] = await Promise.all([
    prisma.creditTransaction.aggregate({
      where: { toUserId: userId },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { fromUserId: userId },
      _sum: { amount: true },
    }),
  ])

  return (earned._sum.amount ?? 0) - (spent._sum.amount ?? 0)
}

/** Only students from the college domain may register. */
export function isAllowedEmail(email: string) {
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim()
  if (!domain) return true // domain gate not configured yet — allow, for local dev
  return email.toLowerCase().trim().endsWith(`@${domain}`)
}
