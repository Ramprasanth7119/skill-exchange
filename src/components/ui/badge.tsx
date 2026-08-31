import { Coins } from 'lucide-react'
import type { SessionStatus } from '@/lib/types'

const STATUS_STYLES: Record<SessionStatus, { label: string; classes: string; dot: string }> = {
  REQUESTED: { label: 'Pending', classes: 'bg-pending-soft text-pending', dot: 'bg-pending' },
  ACCEPTED: { label: 'Upcoming', classes: 'bg-upcoming-soft text-upcoming', dot: 'bg-upcoming' },
  COMPLETED: { label: 'Completed', classes: 'bg-success-soft text-success', dot: 'bg-success' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-neutral-soft text-neutral', dot: 'bg-neutral' },
  DECLINED: { label: 'Declined', classes: 'bg-danger-soft text-danger', dot: 'bg-danger' },
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, classes, dot } = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

/** The credit balance pill shown in the navigation. */
export function CreditPill({ credits, className = '' }: { credits: number; className?: string }) {
  return (
    <span
      title={`${credits} time credit${credits === 1 ? '' : 's'} — 1 credit = 1 hour`}
      className={`inline-flex items-center gap-1.5 rounded-chip border border-credit/20 bg-credit-soft px-3 py-1.5 text-sm font-bold text-credit-strong tabular-nums ${className}`}
    >
      <Coins aria-hidden className="size-4" />
      {credits}
      <span className="sr-only">time credits</span>
    </span>
  )
}

/** Inline "costs 1 credit" marker used near CTAs. */
export function CreditCost({ label = '1 credit · 1 hour' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-credit-strong">
      <Coins aria-hidden className="size-3.5" />
      {label}
    </span>
  )
}
