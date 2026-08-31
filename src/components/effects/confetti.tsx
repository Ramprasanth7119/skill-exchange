'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#0e7a5f', '#f59e0b', '#1d4ed8', '#be123c', '#f5b73d', '#15803d']

type Particle = {
  id: number
  x: string
  y: string
  r: string
  color: string
  delay: string
  size: number
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: `${(Math.random() - 0.5) * 260}px`,
    y: `${60 + Math.random() * 140}px`,
    r: `${(Math.random() - 0.5) * 720}deg`,
    color: COLORS[id % COLORS.length],
    delay: `${Math.random() * 120}ms`,
    size: 6 + Math.round(Math.random() * 5),
  }))
}

/**
 * A small celebratory burst — pure CSS particles, no canvas, no library.
 * Re-fires whenever `burstKey` changes to a truthy value.
 */
export function Confetti({ burstKey }: { burstKey: string | number | null }) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!burstKey) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const raf = requestAnimationFrame(() => setParticles(makeParticles(26)))
    const timer = window.setTimeout(() => setParticles([]), 1300)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [burstKey])

  if (particles.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-visible">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-[2px]"
          style={{
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animation: `confetti-fall 1.1s cubic-bezier(0.25, 0.8, 0.4, 1) ${p.delay} both`,
            ['--confetti-x' as string]: p.x,
            ['--confetti-y' as string]: p.y,
            ['--confetti-r' as string]: p.r,
          }}
        />
      ))}
    </div>
  )
}
