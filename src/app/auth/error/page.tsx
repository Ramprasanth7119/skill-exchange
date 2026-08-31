import { ShieldAlert } from 'lucide-react'
import { Logo } from '@/components/navigation/logo'
import { Button } from '@/components/ui/button'

/**
 * Terminal auth failures land here (expired magic link, revoked OAuth grant).
 * Recoverable ones go back to /login with a query flag instead.
 */
export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="animate-fade-up w-full max-w-md rounded-card border border-line bg-surface p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-danger-soft">
            <ShieldAlert aria-hidden className="size-7 text-danger" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            That link didn&apos;t work
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Magic links expire after a while and can only be used once. Request
            a fresh one and you&apos;ll be in.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/login">Back to sign in</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
