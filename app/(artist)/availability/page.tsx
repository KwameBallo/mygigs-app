import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { addAvailability, removeAvailability } from "./actions"

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/availability")

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-3 text-muted">
          Je hebt nog geen DJ-profiel. Maak er eerst een aan.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black"
        >
          Naar profiel
        </Link>
      </main>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: slots } = await supabase
    .from("artist_availability")
    .select("id, date, status")
    .eq("artist_id", artist.id)
    .gte("date", today)
    .order("date", { ascending: true })

  const list = slots ?? []

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
      <p className="mt-2 text-sm text-muted">
        Markeer de dagen waarop je beschikbaar bent voor boekingen.
      </p>

      <form
        action={addAvailability}
        className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-surface p-4"
      >
        <input
          type="date"
          name="date"
          required
          min={today}
          className="input h-11 flex-1"
        />
        <button
          type="submit"
          className="h-11 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
        >
          Toevoegen
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
            Nog geen beschikbare dagen. Voeg er hierboven een toe.
          </p>
        ) : (
          list.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    s.status === "booked" ? "bg-red-400" : "bg-green-400"
                  }`}
                />
                <span className="font-medium">
                  {new Date(s.date).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-muted">
                  {s.status === "booked" ? "Geboekt" : "Beschikbaar"}
                </span>
              </div>
              {s.status !== "booked" && (
                <form action={removeAvailability}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-red-400"
                  >
                    Verwijder
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  )
}
