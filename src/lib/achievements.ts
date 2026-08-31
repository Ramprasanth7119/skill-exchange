import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Coins,
  Flame,
  GraduationCap,
  Heart,
  Repeat,
  Sparkles,
  Star,
} from 'lucide-react'
import type { CreditEntry, Profile, SessionSummary } from '@/lib/types'

/**
 * Achievements are derived, never stored — same philosophy as the credit
 * balance. Feed in the state, get back which badges are lit. Phase B computes
 * the identical list server-side from real rows.
 */

export type Achievement = {
  id: string
  name: string
  description: string
  icon: LucideIcon
  earned: boolean
}

export function getAchievements(
  profile: Profile,
  sessions: SessionSummary[],
  ledger: CreditEntry[],
  favorites: string[],
): Achievement[] {
  const totalHours = profile.sessionsTaught + profile.sessionsLearned

  return [
    {
      id: 'first-steps',
      name: 'First steps',
      description: 'Joined SkillSwap and claimed your welcome credit.',
      icon: Sparkles,
      earned: ledger.length > 0,
    },
    {
      id: 'scholar',
      name: 'Scholar',
      description: 'Completed your first hour of learning.',
      icon: GraduationCap,
      earned: profile.sessionsLearned >= 1,
    },
    {
      id: 'mentor',
      name: 'Mentor',
      description: 'Taught your first hour to another student.',
      icon: Award,
      earned: profile.sessionsTaught >= 1,
    },
    {
      id: 'full-loop',
      name: 'Full loop',
      description: 'Both taught and learned — the whole idea, lived once.',
      icon: Repeat,
      earned: profile.sessionsTaught >= 1 && profile.sessionsLearned >= 1,
    },
    {
      id: 'collector',
      name: 'Collector',
      description: 'Held 3 credits at once. Time in the bank.',
      icon: Coins,
      earned: profile.credits >= 3,
    },
    {
      id: 'regular',
      name: 'Campus regular',
      description: '5 hours swapped in total.',
      icon: Flame,
      earned: totalHours >= 5,
    },
    {
      id: 'curator',
      name: 'Curator',
      description: 'Saved a teacher to your list for later.',
      icon: Heart,
      earned: favorites.length > 0,
    },
    {
      id: 'good-word',
      name: 'Good word',
      description: 'Left a rating after a session.',
      icon: Star,
      earned: sessions.some((s) => s.viewerRated),
    },
  ]
}
