import type { DjTier } from "@/lib/dj-tier"

// Statusbadge (sterretje in de rang-kleur) naast de DJ-naam. Puur display.
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
      className={`inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{ background: `${tier.color}22`, color: tier.color }}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5z" />
      </svg>
      {label}
    </span>
  )
}
