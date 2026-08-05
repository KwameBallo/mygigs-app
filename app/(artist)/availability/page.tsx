import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { AvailabilityCalendar } from "./availability-calendar"
import { GigSchedule } from "./gig-schedule"

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
    .select("id, event_date, start_time, end_time, city, venue_name, address, status")
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
        <div className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {a.scheduleTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{a.scheduleIntro}</p>
          <GigSchedule
            gigs={booked}
            dateLocale={dateLocale}
            labels={{
              timeTbd: a.scheduleTimeTbd,
              accepted: a.gigAccepted,
              paid: a.gigPaid,
              done: a.gigDone,
            }}
          />
        </div>
      )}
    </main>
  )
}
