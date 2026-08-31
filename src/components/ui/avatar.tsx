import { avatarColor, initials } from '@/lib/format'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<Size, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
}

/**
 * Initials on a deterministic color — no user photos exist in the fixtures, and
 * consistent colors make people recognizable across screens anyway.
 */
export function Avatar({
  name,
  size = 'md',
  className = '',
}: {
  name: string
  size?: Size
  className?: string
}) {
  const { bg, fg } = avatarColor(name)
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${SIZES[size]} ${className}`}
      style={{ background: bg, color: fg }}
    >
      {initials(name)}
    </span>
  )
}
