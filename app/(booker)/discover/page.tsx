import { DiscoverClient } from "./discover-client"
import { getArtists, getGenres } from "@/lib/data/artists"

type SearchParams = Promise<{
  q?: string
  genre?: string
  city?: string
  minFollowers?: string
  ai?: string
}>

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, genre, city, minFollowers, ai } = await searchParams
  const minFollowersNum = minFollowers ? Number(minFollowers) : undefined
  const [artists, genres] = await Promise.all([
    getArtists({
      q,
      genre,
      city,
      minFollowers: Number.isNaN(minFollowersNum) ? undefined : minFollowersNum,
    }),
    getGenres(),
  ])

  return (
    <DiscoverClient
      artists={artists}
      genres={genres}
      filters={{ q, genre, city, minFollowers, ai }}
    />
  )
}
