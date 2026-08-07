import type { DjTier } from "@/lib/dj-tier"

// Statusbadge: alleen een gekleurd sterretje naast de DJ-naam (blauw/geel/rood).
// De rang-naam komt als tooltip mee voor toegankelijkheid.
export function DjTierBadge({
  tier,
  label,
  className = "",
}: {
  tier: DjTier
  label: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex flex-none items-center ${className}`}
      title={label}
      aria-label={label}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={tier.color}
        aria-hidden="true"
      >
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
      </svg>
    </span>
  )
}
