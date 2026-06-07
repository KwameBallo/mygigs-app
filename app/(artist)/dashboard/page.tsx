import Link from "next/link"
import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Stars } from "@/components/stars"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { updateBookingStatus } from "./actions"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/dashboard")

  const { data: artist } = await supabase
    .from("artists")
    .select("*, genres(name)")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Maak je artiestprofiel
          </h1>
          <p className="mt-3 text-muted">
            Je account heeft nog geen gekoppeld artiestprofiel. Zodra dit is
            aangemaakt, zie je hier je aanvragen, agenda en verdiensten.
          </p>
          <Link
            href="/discover"
            className="mt-8 inline-block rounded-full border border-border bg-surface px-6 py-3 font-medium transition hover:border-brand/50"
          >
            Bekijk de marktplaats
          </Link>
        </main>
      </>
    )
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, profiles!bookings_booker_id_fkey(full_name)")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false })

  const list = bookings ?? []
  const pending = list.filter((b) => b.status === "pending")
  const earnings = list
    .filter((b) => b.status === "paid" || b.status === "completed")
    .reduce((sum, b) => sum + b.gage, 0)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {artist.stage_name}
            </h1>
            <div className="mt-2">
              <Stars rating={artist.rating} count={artist.reviews_count} />
            </div>
          </div>
          <Link
            href={`/artists/${artist.id}`}
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium transition hover:border-brand/50"
          >
            Bekijk publiek profiel
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Verdiend" value={formatEuro(earnings)} />
          <Stat label="Open aanvragen" value={String(pending.length)} />
          <Stat label="Boekingen (30d)" value={String(artist.bookings_30d)} />
          <Stat label="Rating" value={artist.rating.toFixed(1)} />
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            Boekingsaanvragen
          </h2>

          {list.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
              Nog geen aanvragen. Zodra een boeker je boekt, verschijnt het hier.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {list.map((b) => {
                const booker = b.profiles as { full_name: string | null } | null
                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          {booker?.full_name ?? "Boeker"}
                        </h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {new Date(b.event_date).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {b.city ? ` · ${b.city}` : ""}
                        {b.venue_name ? ` · ${b.venue_name}` : ""}
                      </p>
                      {b.message && (
                        <p className="mt-2 max-w-lg text-sm text-muted">
                          “{b.message}”
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-brand">
                        {formatEuro(b.gage)}
                      </span>
                      {b.status === "pending" && (
                        <div className="flex gap-2">
                          <form action={updateBookingStatus}>
                            <input type="hidden" name="booking_id" value={b.id} />
                            <input type="hidden" name="status" value="accepted" />
                            <button
                              type="submit"
                              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
                            >
                              Accepteer
                            </button>
                          </form>
                          <form action={updateBookingStatus}>
                            <input type="hidden" name="booking_id" value={b.id} />
                            <input type="hidden" name="status" value="declined" />
                            <button
                              type="submit"
                              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-red-500/50"
                            >
                              Weiger
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
