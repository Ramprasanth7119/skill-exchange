import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'credit' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-deep hover:-translate-y-px hover:shadow-md hover:shadow-primary/25 active:scale-[0.98] active:translate-y-0 shadow-sm shadow-primary/20',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-ink-faint hover:bg-sunken active:scale-[0.98]',
  ghost: 'text-ink-soft hover:bg-sunken hover:text-ink active:scale-[0.98]',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white active:scale-[0.98]',
  credit:
    'bg-credit-soft text-credit-strong border border-credit/20 hover:bg-credit hover:text-white active:scale-[0.98]',
  // Light button for dark panels. A dedicated variant, NOT `primary` plus
  // overrides: `text-ink` in className can lose the specificity race against
  // the variant's `text-white`, which renders the label invisible.
  inverse:
    'bg-paper text-ink hover:bg-white hover:-translate-y-px hover:shadow-md hover:shadow-black/20 active:scale-[0.98] active:translate-y-0 shadow-sm',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

const BASE =
  'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'

type ButtonProps = {
  variant?: Variant
  size?: Size
  href?: string
  /** Set for links that leave the app — Google Calendar, a meeting URL. */
  external?: boolean
  children: ReactNode
} & Omit<ComponentProps<'button'>, 'children'>

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  external = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      )
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
