'use client'

/** Segmented control with counts, used for session status groups. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>
  active: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter"
      className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-full border border-line bg-surface p-1"
    >
      {tabs.map(({ value, label, count }) => {
        const selected = value === active
        return (
          <button
            key={value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(value)}
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all duration-150 ${
              selected
                ? 'bg-ink text-paper shadow-sm'
                : 'text-ink-soft hover:bg-sunken hover:text-ink'
            }`}
          >
            {label}
            {typeof count === 'number' && count > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  selected ? 'bg-paper/20 text-paper' : 'bg-sunken text-ink-faint'
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
