'use client'

import { useEffect, useRef } from 'react'

/**
 * Soft cursor glow: a dot that tracks the pointer exactly and a ring that
 * chases it with a little lag, growing warm over anything clickable. Additive —
 * the system cursor stays. CSS hides both on touch and reduced-motion devices;
 * everything here is direct DOM writes inside rAF, so React never re-renders.
 */
export function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let x = -100
    let y = -100
    let ringX = -100
    let ringY = -100
    let raf = 0

    const onMove = (event: MouseEvent) => {
      x = event.clientX
      y = event.clientY
      const target = event.target as Element | null
      const interactive = !!target?.closest?.(
        'a, button, [role="button"], input, select, textarea, label',
      )
      ring.classList.toggle('is-hovering', interactive)
    }

    const tick = () => {
      ringX += (x - ringX) * 0.16
      ringY += (y - ringY) * 0.16
      dot.style.transform = `translate(${x - 3}px, ${y - 3}px)`
      // Center offset uses half the current ring size via CSS translate trick:
      ring.style.transform = `translate(calc(${ringX}px - 50%), calc(${ringY}px - 50%))`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} aria-hidden className="cursor-dot" />
      <div ref={ringRef} aria-hidden className="cursor-ring" />
    </>
  )
}
