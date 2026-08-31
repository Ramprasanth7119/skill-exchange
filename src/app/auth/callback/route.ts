import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * OAuth landing for Supabase social logins (Google). The provider redirects
 * here with a `code`; we exchange it for a session cookie and continue into
 * the app. Inert in demo mode — the login page never sends anyone here then.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // Only allow same-origin paths so the redirect can't be pointed elsewhere.
  const nextParam = url.searchParams.get('next') ?? '/discover'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/discover'

  if (isSupabaseConfigured() && code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
