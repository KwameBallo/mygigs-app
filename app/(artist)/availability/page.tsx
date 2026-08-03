import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { AvailabilityCalendar } from "./availability-calendar"

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/availability")

  const { locale, t } = await getI18n()
  const a = t.agenda
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{a.title}</h1>
        <p className="mt-3 text-muted">{a.noProfile}</p>
        <Link
          href="/profile"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black"
        >
          {a.toProfile}
        </Link>
      </main>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  // select("*") zodat het ook werkt vóór de start_time/end_time-migratie.
  const { data: slots } = await supabase
    .from("artist_availability")
    .select("*")
    .eq("artist_id", artist.id)
    .gte("date", today)
    .order("date", { ascending: true })

  const list = slots ?? []

  // Geboekte optredens komen nu uit de boekingen zelf (met tijdvak), niet meer
  // uit een 'hele dag'-blokkade. Zo blijft de DJ op andere tijden boekbaar.
  const { data: bookedGigs } = await supabase
    .from("bookings")
    .select("id, event_date, start_time, end_time, city")
    .eq("artist_id", artist.id)
    .in("status", ["accepted", "paid", "completed"])
    .gte("event_date", today)
    .order("event_date", { ascending: true })
  const booked = bookedGigs ?? []

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{a.title}</h1>
      <p className="mt-2 text-sm text-muted">{a.intro}</p>

      <div className="mt-6">
        <AvailabilityCalendar slots={list} today={today} />
      </div>

      {booked.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted">{a.bookedDays}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {booked.map((s) => {
              const slot =
                s.start_time && s.end_time
                  ? `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`
                  : null
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface p-3"
                >
                  <span className="h-2.5 w-2.5 flex-none rounded-full bg-red-400" />
                  <span className="text-sm font-medium">
                    {new Date(s.event_date).toLocaleDateString(dateLocale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {slot && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
                      {slot}
                    </span>
                  )}
                  {s.city && <span className="text-xs text-muted">{s.city}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
