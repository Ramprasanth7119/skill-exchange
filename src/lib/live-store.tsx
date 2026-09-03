'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChatMessage, ClientState, Profile } from '@/lib/types'
import {
  AppContext,
  type AcceptInput,
  type ActionOutcome,
  type AppStoreValue,
  type OnboardingInput,
  type ProposeInput,
  type RequestInput,
} from '@/lib/store'
import {
  acceptSessionAction,
  cancelSessionAction,
  completeOnboardingAction,
  confirmAttendanceAction,
  declineSessionAction,
  markMessagesReadAction,
  markNotificationsReadAction,
  proposeTimeAction,
  rateSessionAction,
  respondToProposalAction,
  sendMessageAction,
  submitFeedbackAction,
  refreshClientState,
  requestSessionAction,
  signOutAction,
  toggleFavoriteAction,
  updateProfileAction,
} from '@/app/actions'
import { useToast } from '@/components/feedback/toast'

/**
 * The production counterpart of DemoProvider: identical context, real backend.
 *
 * Pattern: every mutation applies an optimistic local patch (so the UI answers
 * instantly, like the demo does), fires its Server Action, then re-syncs the
 * whole state from the server. On failure it toasts the error and re-syncs,
 * which rolls the optimistic patch back. A slow poll keeps the notification
 * bell and incoming requests fresh between mutations.
 */

const BLANK_PROFILE: Profile = {
  id: '',
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
  availability: [],
}

const POLL_MS = 20_000

export function LiveProvider({
  initial,
  children,
}: {
  initial: ClientState
  children: ReactNode
}) {
  const [state, setState] = useState(initial)
  const toast = useToast()

  // Refreshes are suppressed while a mutation is in flight so a poll can't
  // overwrite an optimistic patch with pre-mutation server state.
  const inFlight = useRef(0)

  const refresh = useCallback(async () => {
    if (inFlight.current > 0) return
    try {
      const next = await refreshClientState()
      if (inFlight.current === 0) setState(next)
    } catch {
      // Offline or signed out mid-session — keep showing what we have.
    }
  }, [])

  /** Optimistic patch → Server Action → toast on failure → re-sync. */
  const run = useCallback(
    (
      patch: ((current: ClientState) => ClientState) | null,
      action: () => Promise<{ ok: boolean; error?: string }>,
    ) => {
      if (patch) setState(patch)
      inFlight.current += 1
      void action()
        .then((result) => {
          if (!result.ok && result.error) toast('error', 'That didn’t go through', result.error)
        })
        .catch(() => toast('error', 'Connection hiccup', 'Please try that again.'))
        .finally(() => {
          inFlight.current -= 1
          void refresh()
        })
    },
    [refresh, toast],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, POLL_MS)
    return () => window.clearInterval(interval)
  }, [refresh])

  // Supabase Realtime: a new Notification row for this user means something
  // just happened (request, acceptance, credit) — ring the bell immediately
  // instead of waiting for the next poll. Requires the Notification table to
  // be in the `supabase_realtime` publication (see SETUP.md); without that
  // the subscription is simply silent and polling still covers everything.
  const userId = state.profile?.id ?? null
  useEffect(() => {
    if (!userId) return
    let active = true
    let cleanup: (() => void) | undefined

    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (!active) return
      const supabase = createClient()
      const channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'Notification',
            filter: `userId=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as { title?: string; body?: string }
            if (row.title) toast('info', row.title, row.body ?? '')
            void refresh()
          },
        )
        .subscribe()
      cleanup = () => void supabase.removeChannel(channel)
    })

    return () => {
      active = false
      cleanup?.()
    }
  }, [userId, refresh, toast])

  const value = useMemo<AppStoreValue>(() => {
    const profile = state.profile ?? BLANK_PROFILE

    const patchSession = (id: string, patch: Partial<ClientState['sessions'][number]>) =>
      (current: ClientState): ClientState => ({
        ...current,
        sessions: current.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })

    const requestSession = (input: RequestInput): ActionOutcome => {
      if (profile.credits < 1) {
        return {
          ok: false,
          error: 'You need at least 1 credit to request a session. Teach an hour to earn one.',
        }
      }
      if (input.teacher.id === profile.id) {
        return { ok: false, error: 'You cannot book a session with yourself.' }
      }
      run(
        (current) => ({
          ...current,
          sessions: [
            {
              id: `optimistic-${Date.now()}`,
              status: 'REQUESTED' as const,
              role: 'learner' as const,
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
              messages: [],
              unreadCount: 0,
              proposal: null,
              counterpartAvailability: input.teacher.availability,
              createdAt: new Date(),
            },
            ...current.sessions,
          ],
        }),
        () =>
          requestSessionAction({
            teacherId: input.teacher.id,
            skillId: input.teacher.skill.id,
            mode: input.mode,
            message: input.message,
            preferredAt: input.preferredAt,
          }),
      )
      return { ok: true }
    }

    return {
      hydrated: true,
      onboarded: state.profile !== null,
      profile,
      sessions: state.sessions,
      ledger: state.ledger,
      favorites: state.favorites,
      notifications: state.notifications,
      skills: state.skills,
      teachers: state.teachers,
      feedback: state.feedback,

      submitFeedback: (message) =>
        run(
          (current) => ({ ...current, feedback: message.trim() || null }),
          () => submitFeedbackAction(message),
        ),

      requestSession,

      cancelSession: (id) =>
        run(patchSession(id, { status: 'CANCELLED' }), () => cancelSessionAction(id)),

      acceptSession: (id, input: AcceptInput) =>
        run(
          patchSession(id, {
            status: 'ACCEPTED',
            scheduledAt: input.scheduledAt,
            mode: input.mode,
            location: input.location,
            meetLink: input.meetLink,
          }),
          () =>
            acceptSessionAction({
              sessionId: id,
              scheduledAt: input.scheduledAt,
              mode: input.mode,
              location: input.location,
              meetLink: input.meetLink,
            }),
        ),

      declineSession: (id) =>
        run(patchSession(id, { status: 'DECLINED' }), () => declineSessionAction(id)),

      confirmAttendance: (id) =>
        run(patchSession(id, { viewerConfirmed: true }), () => confirmAttendanceAction(id)),

      rateSession: (id, score, comment) =>
        run(patchSession(id, { viewerRated: true }), () =>
          rateSessionAction({ sessionId: id, score, comment }),
        ),

      sendMessage: (sessionId, body) => {
        const text = body.trim()
        if (!text) return
        // Shown immediately and dimmed; the re-sync replaces it with the row
        // the server actually stored, id and timestamp included.
        const optimistic: ChatMessage = {
          id: `optimistic-${Date.now()}`,
          body: text,
          mine: true,
          senderName: profile.name,
          createdAt: new Date(),
          pending: true,
        }
        run(
          (current) => ({
            ...current,
            sessions: current.sessions.map((s) =>
              s.id === sessionId ? { ...s, messages: [...s.messages, optimistic] } : s,
            ),
          }),
          () => sendMessageAction({ sessionId, body: text }),
        )
      },

      markMessagesRead: (sessionId) => {
        const target = state.sessions.find((s) => s.id === sessionId)
        // Guarding here rather than in the caller keeps the read effect from
        // firing a write on every render of an already-read thread.
        if (!target || target.unreadCount === 0) return
        run(patchSession(sessionId, { unreadCount: 0 }), () =>
          markMessagesReadAction(sessionId),
        )
      },

      proposeTime: (sessionId, input: ProposeInput) =>
        run(patchSession(sessionId, { proposal: { ...input, mine: true } }), () =>
          proposeTimeAction({ sessionId, ...input }),
        ),

      respondToProposal: (sessionId, accept) => {
        const target = state.sessions.find((s) => s.id === sessionId)
        const proposal = target?.proposal
        run(
          patchSession(
            sessionId,
            accept && proposal
              ? {
                  proposal: null,
                  scheduledAt: proposal.at,
                  mode: proposal.mode,
                  location: proposal.location,
                  meetLink: proposal.meetLink,
                }
              : { proposal: null },
          ),
          () => respondToProposalAction(sessionId, accept),
        )
      },

      updateProfile: (patch) => {
        const merged = { ...profile, ...patch }
        run(
          (current) => ({ ...current, profile: merged }),
          () =>
            updateProfileAction({
              name: merged.name,
              branch: merged.branch,
              year: merged.year,
              bio: merged.bio,
              phone: merged.phone,
              teaches: merged.teaches.map(({ skill, level, note }) => ({
                skillId: skill.id,
                level,
                note,
              })),
              wants: merged.wants.map(({ skill }) => skill.id),
              availability: merged.availability.map(({ weekday, startMin, endMin }) => ({
                weekday,
                startMin,
                endMin,
              })),
            }),
        )
      },

      completeOnboarding: (input: OnboardingInput) => {
        run(
          (current) => ({
            ...current,
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
          }),
          () =>
            completeOnboardingAction({
              name: input.name,
              branch: input.branch,
              year: input.year,
              bio: input.bio,
              teaches: input.teaches.map(({ skill, level }) => ({ skillId: skill.id, level })),
              wants: input.wants.map((skill) => skill.id),
            }),
        )
      },

      toggleFavorite: (teacherId) =>
        run(
          (current) => ({
            ...current,
            favorites: current.favorites.includes(teacherId)
              ? current.favorites.filter((id) => id !== teacherId)
              : [...current.favorites, teacherId],
          }),
          () => toggleFavoriteAction(teacherId),
        ),

      markNotificationsRead: () =>
        run(
          (current) => ({
            ...current,
            notifications: current.notifications.map((n) => (n.read ? n : { ...n, read: true })),
          }),
          () => markNotificationsReadAction(),
        ),

      resetDemo: () => {
        void signOutAction()
      },
    }
  }, [state, run])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
