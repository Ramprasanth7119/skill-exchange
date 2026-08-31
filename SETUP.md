# Going live — the complete runbook

Everything in the codebase is already dual-mode: with placeholder `.env`
values it runs the demo, and the moment real credentials exist every screen
switches to the real backend (`LiveProvider` + Server Actions). These are the
only manual steps left, in order. Nothing here requires code changes.

## 1. Supabase project (~10 min)

1. https://supabase.com/dashboard → **New project** (free tier is fine).
2. Copy into `.env` (from `.env.example`):
   - `DATABASE_URL` — Settings → Database → Connection string → *Transaction
     pooler* (port 6543). Keep `?pgbouncer=true`.
   - `DIRECT_URL` — same page, *Direct connection* (port 5432).
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Settings → API.
3. `npm run db:migrate` — creates every table (including `Favorite` and
   `Notification`) and the CHECK constraint on ratings.
4. `npm run db:seed` — loads the skill catalogue.

## 2. Auth providers (~10 min)

**Magic link** works out of the box (Authentication → Providers → Email,
enabled by default). The built-in sender is limited to ~4 emails/hour — fine
for testing; before the pilot, plug in a real SMTP sender under
Authentication → SMTP (Resend has a free tier).

**Google** — Authentication → Providers → Google:
1. In Google Cloud Console create an OAuth client ID (type: Web application).
2. Authorized redirect URI: `https://PROJECT_REF.supabase.co/auth/v1/callback`.
3. Paste client ID + secret into the Supabase Google provider and enable it.

**Redirect allowlist** — Authentication → URL Configuration: add
`http://localhost:3000/auth/callback` and, after deploying,
`https://YOUR_DOMAIN/auth/callback`.

## 3. The college gate

Set `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` in `.env` to the real college domain
(e.g. `citchennai.net`). It is enforced in two places: the login form refuses
other domains up front, and `completeOnboardingAction` re-checks server-side —
a Google account from outside the domain can sign in but can never create a
profile.

## 4. Verify locally

```bash
npm run dev
```

- The landing page should show NO demo teachers (empty campus until people join).
- Sign in with a real magic link or Google → you land on /onboarding.
- Complete onboarding → 1 welcome credit appears in the wallet, ledger shows
  the SIGNUP_BONUS row in the database.
- Second account (different email) → teach a skill → first account can
  request, accept, both confirm, and the credit row appears with the
  `sessionId` unique constraint holding.

## 5. Deploy (Vercel, ~10 min)

1. Push the repo to GitHub, import it in Vercel.
2. Copy every `.env` value into Vercel → Settings → Environment Variables.
3. Set `NEXT_PUBLIC_SITE_URL` to the production URL.
4. Add the production `/auth/callback` URL to the Supabase redirect allowlist
   and the Google OAuth client's authorized redirects.
5. Deploy. The build runs `prisma generate` on `postinstall` automatically.

## What is intentionally NOT built yet

- **Email notifications** (the in-app bell works; emails bring people back).
  Wire Resend inside the Server Actions that create `Notification` rows.
- **Supabase Realtime** for instant updates — the client currently re-syncs
  after every action and polls every 20s, which is plenty for a pilot.
- **Adjustment/dispute tooling** — the ledger supports compensating
  `ADJUSTMENT` rows; writing them is a manual SQL job until an admin screen
  exists.
