export function Stars({
  rating,
  count,
}: {
  rating: number
  count?: number
}) {
  const rounded = Math.round(rating * 2) / 2
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = rounded >= i ? "full" : rounded >= i - 0.5 ? "half" : "none"
          return (
            <svg
              key={i}
              viewBox="0 0 20 20"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`half-${i}`}>
                  <stop offset="50%" stopColor="var(--brand)" />
                  <stop offset="50%" stopColor="var(--border)" />
                </linearGradient>
              </defs>
              <path
                d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.77l-5.2 2.75.99-5.8L1.58 7.62l5.82-.85L10 1.5z"
                fill={
                  fill === "full"
                    ? "var(--brand)"
                    : fill === "half"
                      ? `url(#half-${i})`
                      : "var(--border)"
                }
              />
            </svg>
          )
        })}
      </span>
      <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
      {count != null && <span className="text-muted">({count})</span>}
    </span>
  )
}
