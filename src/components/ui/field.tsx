'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'

const CONTROL =
  'w-full rounded-xl border border-line-strong bg-surface px-4 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/** Label + control + optional hint/error, with the wiring done once. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}) {
  const id = useId()
  const hintId = hint || error ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children(id, hintId)}
      {error ? (
        <p id={hintId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`${CONTROL} h-11 ${className}`} {...rest} />
}

export function TextArea({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={`${CONTROL} min-h-24 resize-none py-3 ${className}`} {...rest} />
}

export function Select({ className = '', children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={`${CONTROL} h-11 appearance-none ${className}`} {...rest}>
      {children}
    </select>
  )
}
