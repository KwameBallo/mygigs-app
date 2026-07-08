import { DiscoverClient } from "./discover-client"
import { getArtists, getGenres } from "@/lib/data/artists"
import { getClubs } from "@/lib/data/events"

type SearchParams = Promise<{
  q?: string
  genre?: string
  city?: string
  act?: string
  minFollowers?: string
  budget?: string
  rating?: string
  date?: string
  ai?: string
  type?: string
}>

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q, genre, city, act, minFollowers, budget, rating, date, ai, type } =
    await searchParams
  const isClubs = type === "clubs"
  const minFollowersNum = minFollowers ? Number(minFollowers) : undefined
  const budgetNum = budget ? Number(budget) : undefined
  const ratingNum = rating ? Number(rating) : undefined

  const [artists, clubs, genres] = await Promise.all([
    isClubs
      ? Promise.resolve([])
      : getArtists({
          q,
          genre,
          city,
          act,
          minFollowers: Number.isNaN(minFollowersNum)
            ? undefined
            : minFollowersNum,
          budget: Number.isNaN(budgetNum) ? undefined : budgetNum,
          minRating: Number.isNaN(ratingNum) ? undefined : ratingNum,
          date,
        }),
    isClubs ? getClubs({ q, city }) : Promise.resolve([]),
    getGenres(),
  ])

  return (
    <DiscoverClient
      artists={artists}
      clubs={clubs}
      genres={genres}
      filters={{ q, genre, city, act, minFollowers, budget, rating, date, ai, type }}
    />
  )
}
