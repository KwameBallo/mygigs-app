import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { AvailabilityCalendar } from "./availability-calendar"
import { AvailabilityTimes } from "./availability-times"

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
  const booked = list.filter((s) => s.status === "booked")
  const availDays = list
    .filter((s) => s.status === "available")
    .map((s) => ({
      date: s.date,
      start: s.start_time ?? null,
      end: s.end_time ?? null,
    }))

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{a.title}</h1>
      <p className="mt-2 text-sm text-muted">{a.intro}</p>

      <div className="mt-6">
        <AvailabilityCalendar slots={list} today={today} />
      </div>

      <AvailabilityTimes days={availDays} />

      {booked.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted">{a.bookedDays}</h2>
          <div className="mt-2 flex flex-col gap-2">
            {booked.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span className="h-2.5 w-2.5 flex-none rounded-full bg-red-400" />
                <span className="text-sm font-medium">
                  {new Date(s.date).toLocaleDateString(dateLocale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-muted">{a.booked}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
