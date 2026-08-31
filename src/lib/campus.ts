import type { FeedbackNote, PublicProfile, SkillTag, TeacherCard } from '@/lib/types'
import { MOCK_PUBLIC_PROFILE, MOCK_SKILLS, MOCK_TEACHERS, MOCK_VOICES } from '@/lib/mock-data'
import { isDemoMode } from '@/lib/env'

/**
 * The ONLY door to the campus roster. Pages never import mock-data directly —
 * they call these accessors, which return fixtures strictly in demo mode
 * (no Supabase configured). In production every one of them returns empty and
 * Phase B replaces their bodies with real queries, deleting mock-data.ts.
 */

export function getCampusTeachers(): TeacherCard[] {
  return isDemoMode() ? MOCK_TEACHERS : []
}

export function getCampusSkills(): SkillTag[] {
  return isDemoMode() ? MOCK_SKILLS : []
}

/** Landing-wall shout-outs — fixtures in demo mode, empty in production. */
export function getCampusVoices(): FeedbackNote[] {
  return isDemoMode() ? MOCK_VOICES : []
}

/** The fully-populated profile fixture (reviews, wants) — demo mode only. */
export function getRichPublicProfile(id: string): PublicProfile | null {
  return isDemoMode() && id === MOCK_PUBLIC_PROFILE.id ? MOCK_PUBLIC_PROFILE : null
}
