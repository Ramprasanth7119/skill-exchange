# SkillSwap

A campus skill-exchange platform. Students teach each other and settle in
**time credits** instead of money: teach one hour, earn one credit; spend one
credit to learn for an hour. No money ever changes hands.

## Why

The best teacher for the skill you want is usually two classrooms away — but
there's no fair way to pay them. Credits make every exchange fair, even when
the person you want to learn from wants nothing you teach.

## Features

- **Discover** — search and filter verified student teachers by skill,
  level and rating, with a personalized "recommended for you" sort.
- **Perfect swaps** — the app spots when a teacher wants exactly what you
  teach, so one relationship earns credits both ways.
- **Sessions** — a full request → accept → meet → both-confirm → rate flow.
  Contact details are revealed only after a request is accepted.
- **Wallet** — a derived credit balance over an append-only ledger, plus an
  achievements shelf (first hour taught, full loop closed, …).
- **Campus leaderboard** — hours actually taught, on a podium.
- **Notification centre + live toasts** — requests, acceptances and credit
  moves land the moment they happen.
- **Saved teachers** — heart anyone and filter Discover down to your list.
- **Google or magic-link sign-in** (Supabase auth in Phase B).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 7 ·
Supabase (Postgres + auth) · Vercel.

## Running it

```bash
npm install
npm run dev
```

Without Supabase credentials in `.env`, the app runs in **demo mode**: a
simulated campus answers your requests live (teachers accept, requests come
in, credits settle). With real credentials, all demo data disappears —
`src/lib/campus.ts` is the single gate.

```bash
npm run typecheck && npm run lint && npm run build   # verification
node scripts/e2e-live.mjs 3001                        # full-journey browser test
node scripts/e2e-focus.mjs 3001                       # modal focus + autofill regression
node scripts/e2e-features.mjs 3001                    # engagement features
```

See `CLAUDE.md` for architecture rules and `PROJECT-PLAN.md` for the roadmap.
