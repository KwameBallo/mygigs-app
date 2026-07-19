import Link from "next/link"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import type { Artist } from "@/lib/data/artists"

export function ArtistCard({ artist }: { artist: Artist }) {
  const initials = artist.stage_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href={`/artists/${artist.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand/50 hover:shadow-[0_0_0_1px_var(--brand)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {artist.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.avatar_url}
            alt={artist.stage_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface text-4xl font-semibold text-muted">
            {initials}
          </div>
        )}
        {artist.online && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Online
          </span>
        )}
        {artist.genres && (
          <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-black">
            {artist.genres.name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold tracking-tight">{artist.stage_name}</h3>
          <Stars rating={artist.rating} count={artist.reviews_count} />
        </div>
        {artist.home_city && (
          <p className="text-sm text-muted">{artist.home_city}</p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-sm text-muted">vanaf</span>
          <span className="text-lg font-semibold text-brand">
            {formatEuro(artist.base_gage)}
          </span>
          <span className="text-xs text-muted">/uur</span>
        </div>
      </div>
    </Link>
  )
}
