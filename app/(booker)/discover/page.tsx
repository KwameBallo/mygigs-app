import { redirect } from "next/navigation"
import { DiscoverClient } from "./discover-client"
import { getArtists, getRecommendedArtists, getGenres } from "@/lib/data/artists"
import { getClubs } from "@/lib/data/events"
import { getProfile } from "@/lib/auth"

type SearchParams = Promise<{
  q?: string
  genre?: string
  city?: string
  province?: string
  equipment?: string
  act?: string
  minFollowers?: string
  budget?: string
  rating?: string
  date?: string
  ai?: string
  type?: string
  rec?: string
}>

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  // DJ's browsen niet op Ontdek — stuur ze naar hun dashboard.
  const profile = await getProfile()
  if (profile?.role === "artist" || profile?.role === "both") {
    redirect("/dashboard")
  }
  // Organisator zonder ingevulde voorkeuren → eerst het (overslaanbare)
  // voorkeuren-formulier, dat de 'Aanbevolen'-lijst voedt. `=== false` zodat dit
  // vóór migratie 0030 niks doet (kolom nog afwezig → undefined).
  if (profile?.role === "booker" && profile.prefs_set === false) {
    redirect("/voorkeuren")
  }

  const {
    q,
    genre,
    city,
    province,
    equipment,
    act,
    minFollowers,
    budget,
    rating,
    date,
    ai,
    type,
    rec,
  } = await searchParams
  const isClubs = type === "clubs"
  const isRec = !isClubs && (rec === "1" || rec === "true")
  const minFollowersNum = minFollowers ? Number(minFollowers) : undefined
  const budgetNum = budget ? Number(budget) : undefined
  const ratingNum = rating ? Number(rating) : undefined

  const [artists, clubs, genres] = await Promise.all([
    isClubs
      ? Promise.resolve([])
      : isRec
        ? getRecommendedArtists({
            province: profile?.pref_province ?? null,
            budget: profile?.pref_budget ?? null,
            genreId: profile?.pref_genre_id ?? null,
            date: profile?.pref_date ?? null,
          })
        : getArtists({
            q,
            genre,
            city,
            province,
            equipment,
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
      filters={{
        q,
        genre,
        city,
        province,
        equipment,
        act,
        minFollowers,
        budget,
        rating,
        date,
        ai,
        type,
        rec,
      }}
    />
  )
}
