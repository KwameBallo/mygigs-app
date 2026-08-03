import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { NavClient } from "./nav-client"

export default async function NavigatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/dashboard`)

  const { t } = await getI18n()
  const d = t.dashboard

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!artist) redirect("/dashboard")

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, lat, lng, address")
    .eq("id", id)
    .eq("artist_id", artist.id)
    .maybeSingle()

  // Geen boeking van deze DJ, of geen adrescoördinaten → terug/uitleg.
  if (!booking || booking.lat == null || booking.lng == null) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <p className="text-muted">{d.navNoCoords}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black"
        >
          {d.navBack}
        </Link>
      </main>
    )
  }

  return (
    <div className="h-full">
      <NavClient
        bookingId={booking.id}
        venue={{ lat: Number(booking.lat), lng: Number(booking.lng) }}
        address={booking.address}
      />
    </div>
  )
}
