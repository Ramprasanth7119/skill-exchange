'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle, MailCheck, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/navigation/logo'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useDemo } from '@/lib/store'
import { isDemoMode } from '@/lib/env'

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l3.99-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44A11.98 11.98 0 0 0 1.28 6.62l3.99 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}

/**
 * Phase A stand-in for the Supabase magic-link screen. The "magic link" button
 * in the sent state plays the role of the email link and lands on onboarding;
 * Phase B swaps the fake send for supabase.auth.signInWithOtp with the same UI.
 */
export default function LoginPage() {
  const router = useRouter()
  const { hydrated, onboarded, profile } = useDemo()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [sent, setSent] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  async function signInWithGoogle() {
    setGoogleBusy(true)
    if (isDemoMode()) {
      // No Supabase yet: play the round-trip, then land on onboarding like
      // a first-time Google user would.
      window.setTimeout(() => router.push('/onboarding'), 900)
      return
    }
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('That doesn’t look like an email address.')
      return
    }
    setError(undefined)
    setSent(true)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="animate-fade-up w-full max-w-md">
          {sent ? (
            <div className="rounded-card border border-line bg-surface p-8 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft">
                <MailCheck aria-hidden className="size-7 text-primary" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-bold text-ink">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                We sent a sign-in link to <strong className="text-ink">{email}</strong>.
                Open it on this device to continue.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button href="/onboarding">
                  Open the magic link
                  <ArrowRight aria-hidden className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
                  Use a different email
                </Button>
              </div>
              <p className="mt-4 rounded-xl bg-sunken px-3 py-2 text-xs text-ink-faint">
                Demo preview — no email is actually sent yet.
              </p>
            </div>
          ) : (
            <div className="rounded-card border border-line bg-surface p-8">
              <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
              <p className="mt-1.5 text-sm text-ink-soft">
                Sign in with your college email — no passwords, just a link.
              </p>

              <button
                onClick={signInWithGoogle}
                disabled={googleBusy}
                className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-surface text-sm font-semibold text-ink transition-all duration-150 hover:-translate-y-px hover:border-ink-faint hover:shadow-md hover:shadow-ink/5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                {googleBusy ? (
                  <LoaderCircle aria-hidden className="size-5 animate-spin text-ink-faint" />
                ) : (
                  <GoogleMark />
                )}
                {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
              </button>

              <div className="mt-5 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs font-semibold text-ink-faint">or use email</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
                <Field label="College email" error={error} hint="e.g. you@yourcollege.edu">
                  {(id, describedBy) => (
                    <TextInput
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={error ? true : undefined}
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourcollege.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </Field>
                <Button type="submit" size="lg">
                  Send magic link
                </Button>
              </form>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
                <ShieldCheck aria-hidden className="size-4 shrink-0 text-primary" />
                Only students from your college can join — that&apos;s the point.
              </p>

              {hydrated && onboarded ? (
                <div className="mt-6 border-t border-line pt-5 text-center">
                  <Button variant="ghost" size="sm" href="/discover">
                    Continue as {profile.name.split(' ')[0]}
                    <ArrowRight aria-hidden className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="mt-6 border-t border-line pt-5 text-center text-xs text-ink-faint">
                  New here? The same link creates your account.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
