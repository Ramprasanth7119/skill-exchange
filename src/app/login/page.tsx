'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, MailCheck, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/navigation/logo'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useDemo } from '@/lib/store'

/**
 * Phase A stand-in for the Supabase magic-link screen. The "magic link" button
 * in the sent state plays the role of the email link and lands on onboarding;
 * Phase B swaps the fake send for supabase.auth.signInWithOtp with the same UI.
 */
export default function LoginPage() {
  const { hydrated, onboarded, profile } = useDemo()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [sent, setSent] = useState(false)

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

              <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
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
