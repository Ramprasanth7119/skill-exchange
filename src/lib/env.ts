/**
 * Until a real Supabase project is wired up, `.env` still holds the placeholder
 * values from `.env.example`. Calling Supabase with those throws on every
 * request, so auth is skipped while this returns false — which lets the UI be
 * built and previewed before any backend exists.
 *
 * Guard every Supabase call behind this, and delete nothing when you configure
 * the real project: it simply starts returning true.
 */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return false
  if (url.includes('PROJECT_REF')) return false
  if (key === 'eyJ...') return false

  return true
}

/** True while the app is running on placeholder config, i.e. UI-only mode. */
export const IS_PREVIEW_MODE = !isSupabaseConfigured()

/**
 * Demo mode = no real backend yet. Every piece of static/mock data and every
 * simulated event in the app flows through this flag (see `src/lib/campus.ts`
 * and the store's event engine): the moment real Supabase credentials exist —
 * i.e. production, or Phase B development — it flips false and the app serves
 * NO static data anywhere. NEXT_PUBLIC_* vars are inlined at build time, so
 * the production bundle physically evaluates this to false.
 */
export function isDemoMode() {
  return !isSupabaseConfigured()
}
