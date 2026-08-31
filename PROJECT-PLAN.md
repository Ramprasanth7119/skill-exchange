# SkillSwap — project plan

## Problem statement

College students want practical skills — DSA, video editing, public speaking,
design, an instrument — but paid courses are expensive and generic, while the
best available teacher is often a peer two classrooms away. There is no
structured way to discover who on campus knows what, and informal "teach me and
I'll teach you" arrangements collapse because nothing holds either side to it.

SkillSwap matches students who can teach a skill with students who want to learn
it, settles in time credits rather than money, and adds the scheduling and
reputation that make the arrangement stick.

## The mechanism: time credits

Teach one hour → earn 1 credit. Spend 1 credit → learn for an hour.

This is the design decision the whole product rests on. Direct bartering fails
because wants rarely match: I want your video editing, but you have no interest
in my DSA. Credits make the exchange triangular — you teach someone else, and
spend that credit on me. New accounts get 1 free credit so a student can
experience being taught before they have taught anyone.

Two rules keep it honest: a credit moves only when **both** people confirm the
session happened, and the balance is always derived from an append-only ledger
rather than stored as a number that could drift.

## MVP scope

In scope:

1. **College-email signup** — magic link, restricted to one email domain. Gives
   real trust and a captive launch audience.
2. **Profile** — name, branch, year, bio, skills I teach (with level), skills I
   want to learn.
3. **Discover** — browse and search teachers by skill, with rating and sessions
   taught.
4. **Request a session** — learner requests, teacher accepts or declines and
   sets a time, in person or online.
5. **Complete + credit transfer** — both sides confirm, one credit moves.
6. **Rate** — 1–5 plus an optional comment, both directions.
7. **Wallet** — balance and the ledger behind it.

Deliberately out of scope for the MVP, and why:

| Not building | Instead |
| --- | --- |
| In-app chat | A `wa.me` deep link once a session is accepted |
| Video calling | Paste a Google Meet link |
| Push notifications | Email on the events that matter |
| Group sessions | 1-to-1 only |
| Admin dashboard | Prisma Studio |
| Mobile apps | Responsive web |

The point of cutting these is to reach real users in week 4 rather than week 12.

## Route map

| Route | Purpose |
| --- | --- |
| `/` | Landing page — what it is, sign in |
| `/login` | Magic-link sign in |
| `/auth/callback` | Supabase redirect target; creates the profile row on first login |
| `/onboarding` | First-run: name, branch, year, pick teach + learn skills |
| `/discover` | Browse and filter teachers by skill |
| `/u/[id]` | Public profile with reviews, and the request button |
| `/sessions` | My sessions, grouped by status |
| `/sessions/[id]` | One session: accept, schedule, confirm, cancel, rate |
| `/wallet` | Credit balance and ledger |
| `/profile` | Edit my own profile and skills |

## Build phases

The project is split into two passes with a typed seam between them, so each can
be done well without blocking on the other.

**Phase A — UI.** Build every screen in the route map against the fixtures in
`src/lib/mock-data.ts`. No database, no Server Actions, no auth. The dev server
runs in preview mode (see `CLAUDE.md`), so pages render with placeholder
credentials. Components import view models from `src/lib/types.ts` only.

Done when: every route renders, every session status and every empty state is
styled, and the app is navigable end to end on mock data.

**Phase B — API.** Replace fixtures with real loaders and Server Actions, wire
up Supabase auth, run the first migration, seed the skill catalogue. Because the
UI already consumes `types.ts`, this pass changes data sources, not components —
and a shape mismatch shows up as a type error rather than a runtime surprise.

Done when: `mock-data.ts` is deleted and nothing imports it.

## Roadmap

- **Week 1** — Supabase project, first migration, seed, auth, onboarding, profiles.
- **Week 2** — Discover, public profiles, request/accept flow.
- **Week 3** — Completion, credit ledger, ratings, wallet.
- **Week 4** — Polish, deploy to Vercel, and run a real pilot.

## Pilot

The pilot is the part that turns this from a project into a product. Target: 20
students signed up and **10 completed sessions** in the first two weeks. Recruit
through existing campus networks rather than a public launch, sit with the first
few users while they sign up, and watch where they hesitate.

Track completed sessions, not signups. Signups are a vanity metric; a completed
session means two people actually met and one of them learned something.

## Risks

- **Cold start.** An empty platform is useless to its first visitor. Mitigation:
  personally onboard ~15 teachers across varied skills before opening signups.
- **Credit hoarding.** People earn credits and never spend them, so demand
  stalls. Watch the ratio; if it skews, consider expiring or capping balances.
- **No-shows.** The two-sided confirmation means a no-show simply never pays out,
  and repeated cancellations are visible on a profile.
- **Scheduling friction.** If arranging a time is painful, sessions die between
  accept and completion. This is the most likely failure point — keep the accept
  step to one screen and hand off to WhatsApp immediately.
