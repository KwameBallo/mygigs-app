import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// =============================================================
// Waar de klant landt nadat hij bij Mollie geweest is.
//
// Deze pagina doet met opzet niets. Hij zet geen boeking op betaald, maakt
// geen factuur en stuurt geen mail. Dat gebeurt allemaal in de webhook.
//
// De reden is simpel: dat iemand hier terechtkomt bewijst niets. Je komt hier
// ook na annuleren, na een mislukte betaling, of doordat je deze link van
// iemand kreeg. En andersom: iemand die wel betaalt maar zijn browser sluit
// komt hier nooit, terwijl zijn boeking gewoon moet doorgaan.
//
// Wat deze pagina wel doet, is kijken wat de stand van zaken is en dat eerlijk
// vertellen. Staat de boeking al op betaald, dan is de webhook ons voor
// geweest. Staat hij er nog niet op, dan is dat meestal een kwestie van
// seconden, en dat zeggen we dan ook.
// =============================================================

export default async function BetaaldPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/bookings")

  const { data: boeking } = await supabase
    .from("bookings")
    .select("id, status, total, event_date, city, artists(stage_name)")
    .eq("id", id)
    .eq("booker_id", user.id)
    .maybeSingle()

  if (!boeking) redirect("/bookings")

  const betaald = boeking.status === "paid" || boeking.status === "completed"
  const artiest = Array.isArray(boeking.artists)
    ? boeking.artists[0]
    : boeking.artists

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        {betaald ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              Betaling gelukt
            </h1>
            <p className="mt-3 text-sm text-muted">
              Je boeking bij {artiest?.stage_name ?? "de DJ"} staat vast. Het
              bedrag blijft bij MyGigs staan tot na het optreden, daarna krijgt
              de DJ het uitbetaald.
            </p>
            <p className="mt-2 text-sm text-muted">
              Je betaalbewijs komt per mail. De DJ heeft bericht gekregen.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              We verwerken je betaling
            </h1>
            <p className="mt-3 text-sm text-muted">
              Dit duurt meestal een paar seconden. Je hoeft niets te doen en
              niet opnieuw te betalen: zodra je bank het bevestigt, zetten wij
              je boeking vast en krijg je een mail.
            </p>
            <p className="mt-2 text-sm text-muted">
              Zie je over een paar minuten nog niets, neem dan contact op via
              info@mygigs.nl. Dan zoeken we het voor je uit.
            </p>
          </>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/bookings?paid=1"
            className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-black transition hover:bg-brand-strong"
          >
            Naar je boekingen
          </Link>
        </div>
      </div>
    </main>
  )
}
