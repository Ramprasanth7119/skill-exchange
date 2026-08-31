import { Compass } from 'lucide-react'
import { Logo } from '@/components/navigation/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft">
          <Compass aria-hidden className="size-8 text-primary" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold text-ink">
          This page skipped class
        </h1>
        <p className="mt-2 max-w-sm text-ink-soft">
          Whatever you were looking for isn&apos;t here — but there&apos;s plenty worth
          learning back on campus.
        </p>
        <Button href="/discover" className="mt-6">
          Back to discover
        </Button>
      </main>
    </div>
  )
}
