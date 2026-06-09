import { getAd, type AdPlacement } from "@/lib/data/ads"

// Server component: haalt één actieve advertentie op voor de plek en toont
// een sponsored banner. Rendert niets als er geen advertentie is.
export async function AdSlot({
  placement,
  className,
}: {
  placement: AdPlacement
  className?: string
}) {
  const ad = await getAd(placement)
  if (!ad) return null

  const inner = (
    <div className="relative flex min-h-[88px] items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface-2 p-4 transition hover:border-brand/40">
      {ad.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.image_url}
          alt={ad.brand_name}
          className="h-16 w-16 flex-none rounded-xl object-cover sm:h-20 sm:w-28"
        />
      )}
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Advertentie · {ad.brand_name}
        </span>
        {ad.title && (
          <p className="mt-0.5 truncate text-sm font-semibold">{ad.title}</p>
        )}
      </div>
      {ad.target_url && (
        <span className="hidden flex-none rounded-full bg-brand px-4 py-2 text-sm font-medium text-black sm:inline-block">
          Meer
        </span>
      )}
    </div>
  )

  if (!ad.target_url) {
    return <div className={className}>{inner}</div>
  }

  return (
    <a
      href={ad.target_url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`block ${className ?? ""}`}
    >
      {inner}
    </a>
  )
}
