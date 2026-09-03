@AGENTS.md

# SkillSwap

A campus skill-exchange platform. Students teach each other and settle in time
credits instead of money: teach one hour, earn one credit; spend one credit to
learn for an hour. See `PROJECT-PLAN.md` for scope and the build roadmap.

## Stack

Next.js 16.3.3 (App Router, Turbopack) · React 19.2 · TypeScript · Tailwind v4 ·
Prisma 7.10 · Supabase (Postgres + auth) · deployed on Vercel.

## Version gotchas that will bite you

These differ from older Next.js and Prisma, and are the source of nearly every
avoidable error in this project.

**Next.js 16**
- Middleware is renamed. The file is `src/proxy.ts`, the export is `proxy`, and
  it runs on the Node runtime. Do not create `middleware.ts`.
- `params` and `searchParams` on pages are **Promises** — `await` them. Same for
  `cookies()`, `headers()` and a route handler's `params`. Synchronous access was
  removed, not deprecated.
- Prefer the generated global types: `PageProps<'/u/[id]'>`, `RouteContext<'/api/x'>`.
  They need no import.
- `revalidateTag` now takes a second argument (a cacheLife profile).
  `revalidatePath` is unchanged — prefer it here, it is simpler and enough.
- Do **not** turn on `cacheComponents`. It forces every `cookies()` read and
  uncached query behind `<Suspense>`, which this app does not need yet.
- `next lint` is gone; run `npm run lint`.
- Turbopack is the default. Never pass `--turbopack`.

**Prisma 7**
- Connection URLs live in `prisma.config.ts`, **not** in `schema.prisma`. The
  datasource block only declares `provider`.
- There is no Rust engine. `PrismaClient` is constructed with a `PrismaPg`
  driver adapter — see `src/lib/prisma.ts`. Never `new PrismaClient()` bare.
- The client is generated into `src/generated/prisma` (gitignored, rebuilt on
  `postinstall` and before `build`). Import the client from
  `@/generated/prisma/client` and enums from `@/generated/prisma/enums`.
- `npm i prisma@latest` installs a **release candidate** — the `latest` npm tag
  currently points at 8.0.0-rc. Both prisma packages are pinned to 7.10.0 on
  purpose. Do not "upgrade" them casually.

## Architecture rules

- **`src/lib/types.ts` is the contract between the UI and the data layer.**
  Components import view models from there and never import Prisma types
  directly. This is what lets the UI and the API be built in separate passes.
- **`src/lib/campus.ts` is the only door to demo data.** Pages never import
  `mock-data.ts` directly; the accessors return fixtures only in demo mode
  (`isDemoMode()` in `env.ts` — i.e. no Supabase configured) and empty
  otherwise, so a production build serves no static data. The store's simulated
  event engine is gated the same way. Phase B replaces the accessor bodies with
  real queries.
- **Achievements are derived, never stored** (`src/lib/achievements.ts`) —
  same philosophy as the credit balance. Phase B computes the same list from
  real rows; do not add an achievements table.
- **One context, two providers.** Components consume `useDemo()` from
  `store.tsx`; `providers.tsx` mounts `DemoProvider` (fixtures + simulated
  events) or `LiveProvider` (`live-store.tsx`: optimistic patch → Server
  Action → full re-sync via `refreshClientState`) depending on
  `isSupabaseConfigured()`. Real loaders live in `src/lib/data.ts`, mutations
  in `src/app/actions.ts`. See `SETUP.md` for the go-live runbook.
- **Server Components fetch, Client Components interact.** Add `'use client'`
  only for a component that needs state, effects or event handlers.
- **Mutations are Server Actions**, in `src/app/**/actions.ts`, validated with
  Zod, returning the `ActionResult<T>` shape from `types.ts`.
- **Every Server Action re-checks auth via `requireUser()`.** Server Functions
  are reachable by direct POST — the proxy's route matching is not a security
  boundary for them.
- Use `getUser()`, never `getSession()`. `getSession` trusts the cookie without
  verifying it.

## Domain invariants — do not break these

1. **A credit balance is never stored.** It is always derived by summing
   `CreditTransaction` (`getCreditBalance` in `src/lib/auth.ts`). There is no
   `balance` column and there should never be one.
2. **`CreditTransaction` is append-only.** Never update or delete a row; correct
   a mistake by inserting a compensating `ADJUSTMENT`.
3. **A credit moves only when both people confirm.** The transfer happens when
   `learnerConfirmedAt` and `teacherConfirmedAt` are both set — not when the
   teacher accepts, and not on a single confirmation.
4. **Write the transfer and the status change in one `prisma.$transaction`.**
   `CreditTransaction.sessionId` is `@unique`, so a double-submit can never pay
   out twice — rely on that constraint rather than on checking first.
5. **A learner cannot request a session with fewer than 1 credit.** Check at
   request time and again at completion.
6. **Nobody teaches themselves.** Reject `learnerId === teacherId`.
7. **Phone numbers are revealed only on an `ACCEPTED` session**, to the two
   people in it. Never include `phone` in a list or discovery payload.
8. **Messaging is session-scoped.** There are no open DMs: every thread hangs
   off a `SwapSession`, so nobody can be written to by a stranger who has not
   asked to learn from them. Never add a user-to-user message route.
9. **A time proposal never moves a booking.** `proposedAt` sits beside
   `scheduledAt` until the *other* participant accepts; the proposer cannot
   answer their own suggestion. A student who is asleep can never be stranded
   at a slot they did not agree to.

## Commands

```bash
npm run dev          # dev server
npm run build        # prisma generate + next build
npm run typecheck    # tsc --noEmit
npm run lint
npm run db:migrate   # prisma migrate dev
npm run db:seed      # load the skill catalogue
npm run db:studio
node scripts/e2e-live.mjs <port>           # the full demo flow in headless Chrome
node scripts/e2e-features.mjs <port>       # engagement layer + feedback wall
node scripts/e2e-chat-schedule.mjs <port> # threads, availability, rescheduling
```

## Preview mode

While `.env` still holds the placeholder Supabase values, `isSupabaseConfigured()`
in `src/lib/env.ts` returns false: the proxy lets every route through and
`getAuthUser()` returns null. This exists so the UI can be built and viewed
before the backend is set up. It disappears on its own once real credentials are
filled in — do not add code that depends on preview mode staying available.

## Style

- Prettier defaults, but no semicolons and single quotes, matching existing files.
- Comments explain *why*, not *what*. Most code needs none.
- No `any`. No `!` non-null assertions except on `process.env` values that
  `env.ts` has already guarded.
