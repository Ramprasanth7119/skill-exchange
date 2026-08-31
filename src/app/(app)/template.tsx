import type { ReactNode } from 'react'

/**
 * Re-mounts on every navigation inside the app shell, so each screen enters
 * with a soft rise instead of snapping into place.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up">{children}</div>
}
