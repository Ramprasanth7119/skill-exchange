'use client'

import { useEffect, useRef, useState } from 'react'

/** Animates a number toward its target — the wallet balance ticks up, not jumps. */
export function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(target)
  const previous = useRef(target)

  useEffect(() => {
    const from = previous.current
    previous.current = target
    if (from === target) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      if (reduced) {
        setValue(target)
        return
      }
      const t = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
