import Link from "next/link"
import { redirect } from "next/navigation"
import { Stars } from "@/components/stars"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { getFavorites } from "@/lib/data/favorites"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"

export default async function FavoritesPage() {
  const { locale } = await getI18n()
  const d = dict[locale]
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/favorites")

  const artists = await getFavorites(user.id)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {d.intro}
      </p>

      {artists.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-lg font-medium">{d.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted">
            {d.emptyBody}
          </p>
          <Link
            href="/discover"
            className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
          >
            {d.discover}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {artists.map((a) => {
            const initials = a.stage_name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
            return (
              <Link
                key={a.id}
                href={`/artists/${a.id}`}
                className="flex gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-brand/40"
              >
                <div className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-surface-2">
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatar_url}
                      alt={a.stage_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate font-semibold">{a.stage_name}</h3>
                  {a.home_city && (
                    <p className="truncate text-sm text-muted">{a.home_city}</p>
                  )}
                  <div className="mt-1">
                    <Stars rating={a.rating} count={a.reviews_count} />
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    {a.genres && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                        {a.genres.name}
                      </span>
                    )}
                    <span className="font-semibold text-brand">
                      {formatEuro(a.base_gage)}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
