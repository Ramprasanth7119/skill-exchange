import { Coins } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'

/**
 * The hero visual: three students in a circle with one credit orbiting between
 * them — the triangular economy in a single glance, CSS-only so the landing
 * page ships no JavaScript for it. Static under prefers-reduced-motion.
 */

// Illustrative personas only — deliberately NOT drawn from the campus roster,
// so the marketing page never shows anything resembling real member data.
// The slight rotations make the cards feel pinned to a noticeboard.
const NODES = [
  { name: 'You', skill: 'teach coding', position: 'top-0 left-1/2 -translate-x-1/2 -rotate-2' },
  { name: 'Maya', skill: 'teaches design', position: 'bottom-[4%] left-0 rotate-3' },
  { name: 'Dev', skill: 'teaches guitar', position: 'bottom-[4%] right-0 -rotate-3' },
]

export function CreditLoop() {
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-105 select-none">
      {/* orbit ring */}
      <div className="absolute inset-[12%] rounded-full border-2 border-dashed border-line-strong" />

      {/* the orbiting credit */}
      <div className="animate-coin-spin absolute inset-[12%]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-coin-counter">
            <span className="flex size-12 items-center justify-center rounded-full border-4 border-surface bg-credit-soft shadow-lg shadow-credit/20">
              <Coins className="size-6 text-credit" />
            </span>
          </div>
        </div>
      </div>

      {/* center caption */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface px-5 py-4 text-center shadow-sm"
        style={{ animation: 'bob 5s ease-in-out infinite' }}
      >
        <p className="font-display text-2xl font-bold text-credit-strong">1 credit</p>
        <p className="text-sm font-medium text-ink-soft">= 1 hour of time</p>
      </div>

      {/* the three students */}
      {NODES.map(({ name, skill, position }) => (
        <div
          key={name}
          className={`absolute ${position} flex w-32 flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-3 text-center shadow-sm`}
        >
          <Avatar name={name} size="md" />
          <p className="text-xs leading-tight font-semibold text-ink">{name.split(' ')[0]}</p>
          <p className="text-[11px] leading-tight text-ink-faint">{skill}</p>
        </div>
      ))}
    </div>
  )
}
