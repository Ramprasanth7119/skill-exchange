/** Building blocks for loading states — shimmer, no spinners. */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-xl ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="mt-4 h-9 w-28 rounded-full" />
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
