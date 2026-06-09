import { DiscoverClient } from "./discover-client"
import { getArtists, getGenres } from "@/lib/data/artists"
import { getClubs } from "@/lib/data/events"

type SearchParams = Promise<{
  q?: string
  genre?: string
  city?: string
  minFollowers?: string
  ai?: string
  type?: string
}>

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, genre, city, minFollowers, ai, type } = await searchParams
  const isClubs = type === "clubs"
  const minFollowersNum = minFollowers ? Number(minFollowers) : undefined

  const [artists, clubs, genres] = await Promise.all([
    isClubs
      ? Promise.resolve([])
      : getArtists({
          q,
          genre,
          city,
          minFollowers: Number.isNaN(minFollowersNum)
            ? undefined
            : minFollowersNum,
        }),
    isClubs ? getClubs({ q, city }) : Promise.resolve([]),
    getGenres(),
  ])

  return (
    <DiscoverClient
      artists={artists}
      clubs={clubs}
      genres={genres}
      filters={{ q, genre, city, minFollowers, ai, type }}
    />
  )
}
