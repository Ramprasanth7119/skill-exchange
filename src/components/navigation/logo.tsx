import Link from 'next/link'

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label="SkillSwap home">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-[10px] bg-primary transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-105"
      >
        <svg viewBox="0 0 64 64" className="size-5" fill="none">
          <path
            d="M19 26h25m0 0-7-7m7 7-7 7"
            stroke="#faf7f2"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M45 44H20m0 0 7-7m-7 7 7 7"
            stroke="#f5b73d"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        SkillSwap
      </span>
    </Link>
  )
}
