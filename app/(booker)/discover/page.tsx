import { SiteHeader } from "@/components/site-header"
import { DiscoverClient } from "./discover-client"
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
      <DiscoverClient
        artists={artists}
        genres={genres}
        filters={{ q, genre, city }}
      />
    </>
  )
}
