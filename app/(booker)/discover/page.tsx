import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { ArtistCard } from "@/components/artist-card"
import { getArtists, getGenres } from "@/lib/data/artists"

type SearchParams = Promise<{ q?: string; genre?: string; city?: string }>

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, genre, city } = await searchParams
  const [artists, genres] = await Promise.all([
    getArtists({ q, genre, city }),
    getGenres(),
  ])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ontdek artiesten
        </h1>
        <p className="mt-2 text-muted">
          {artists.length} {artists.length === 1 ? "artiest" : "artiesten"}{" "}
          gevonden.
        </p>

        <form
          method="get"
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek op naam..."
            className="input sm:max-w-xs"
          />
          <input
            name="city"
            defaultValue={city}
            placeholder="Stad"
            className="input sm:max-w-[12rem]"
          />
          <select name="genre" defaultValue={genre ?? ""} className="input sm:max-w-[12rem]">
            <option value="">Alle genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
          >
            Zoek
          </button>
        </form>

        {artists.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-lg font-medium">Geen artiesten gevonden</p>
            <p className="mt-2 text-sm text-muted">
              Pas je filters aan of bekijk{" "}
              <Link href="/discover" className="text-brand hover:underline">
                alle artiesten
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
