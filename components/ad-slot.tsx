import { getAd, type AdPlacement, type Ad } from "@/lib/data/ads"

// Voorbeeld-advertenties zodat je ook zonder data in de database ziet waar en
// hoe advertenties verschijnen. Worden alleen getoond als er geen echte
// advertentie voor de plek bestaat.
const DEMO_ADS: Record<AdPlacement, Pick<Ad, "brand_name" | "title" | "image_url" | "target_url">> = {
  events_top: {
    brand_name: "Heineken",
    title: "Proost op het beste feest van je week",
    image_url:
      "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=400",
    target_url: "https://heineken.com",
  },
  event_detail: {
    brand_name: "Red Bull",
    title: "Red Bull geeft je vleugels op de dansvloer",
    image_url:
      "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400",
    target_url: "https://redbull.com",
  },
  discover: {
    brand_name: "Bacardi",
    title: "Do What Moves You",
    image_url:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400",
    target_url: "https://bacardi.com",
  },
  sidebar: {
    brand_name: "Jägermeister",
    title: "Best Nights are Jäger Nights",
    image_url:
      "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=400",
    target_url: "https://jagermeister.com",
  },
}

// Server component: haalt één actieve advertentie op voor de plek en toont
// een sponsored banner. Valt terug op een voorbeeld-advertentie.
export async function AdSlot({
  placement,
  className,
}: {
  placement: AdPlacement
  className?: string
}) {
  const real = await getAd(placement)
  const ad = real ?? DEMO_ADS[placement]
  const isDemo = !real

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
          Advertentie{isDemo ? " · voorbeeld" : ""} · {ad.brand_name}
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
