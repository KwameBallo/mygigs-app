import Link from "next/link"
import { AvatarImage } from "@/components/avatar-image"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import type { Artist } from "@/lib/data/artists"

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand/50 hover:shadow-[0_0_0_1px_var(--brand)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <AvatarImage
          row={artist}
          name={artist.stage_name}
          prefer={512}
          sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 92vw"
          className="text-4xl"
          imgClassName="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
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
