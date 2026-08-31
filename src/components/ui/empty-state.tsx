import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Every list screen renders one of these instead of "No data found" — an
 * explanation of what belongs here plus the action that fills it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft">
        <Icon aria-hidden className="size-7 text-primary" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
