import Link from "next/link"
import { redirect } from "next/navigation"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"

export default async function BookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/bookings")

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, artists(stage_name, avatar_url)")
    .eq("booker_id", user.id)
    .order("event_date", { ascending: false })

  const list = bookings ?? []

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Mijn boekingen</h1>

        {list.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-lg font-medium">Nog geen boekingen</p>
            <p className="mt-2 text-sm text-muted">
              Vind een artiest en stuur je eerste aanvraag.
            </p>
            <Link
              href="/discover"
              className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
            >
              Ontdek artiesten
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {list.map((b) => {
              const artist = b.artists as {
                stage_name: string
                avatar_url: string | null
              } | null
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {artist?.stage_name ?? "Artiest"}
                      </h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(b.event_date).toLocaleDateString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {b.city ? ` · ${b.city}` : ""}
                      {b.venue_name ? ` · ${b.venue_name}` : ""}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-brand">
                    {formatEuro(b.total)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
    </main>
  )
}
