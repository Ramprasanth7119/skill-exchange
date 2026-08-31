'use client'

import { useRef, type ReactNode } from 'react'

/**
 * Gentle 3D tilt toward the pointer. Wrap any card in it; on touch or
 * reduced-motion devices the handlers simply never fire meaningfully and the
 * card stays flat. Transform-only, so it stays on the GPU.
 */
export function Tilt({
  children,
  max = 6,
  className = '',
}: {
  children: ReactNode
  max?: number
  className?: string
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = innerRef.current
    if (!el) return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(0)`
    })
  }

  function onLeave() {
    const el = innerRef.current
    if (!el) return
    cancelAnimationFrame(frame.current)
    el.style.transform = ''
  }

  return (
    <div className={`tilt-wrap ${className}`} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={innerRef} className="tilt-inner h-full">
        {children}
      </div>
    </div>
  )
}
