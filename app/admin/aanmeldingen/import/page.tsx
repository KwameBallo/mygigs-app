import Link from "next/link"
import { redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { MAX_RIJEN, VOORBEELD_CSV } from "@/lib/leads-csv"
import { checkAdmin } from "../guard"
import { ImportForm } from "./import-form"

export const dynamic = "force-dynamic"

// =============================================================
// Een lijst DJ's in één keer in de wachtrij zetten.
//
// Bewust alleen in het Nederlands, net als de andere beheerschermen. Dit is
// voor jou, niet voor klanten.
// =============================================================

export default async function ImportPage() {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")

  return (
    <main className="min-h-full">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 safe-top">
        <Logo />
        <Link
          href="/admin/aanmeldingen"
          className="rounded-full border border-border px-3 py-1.5 text-sm transition hover:border-brand/50"
        >
          Terug naar de wachtrij
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Lijst met DJ&apos;s inlezen</h1>
        <p className="mt-2 text-sm text-muted">
          Zet in één keer tot {MAX_RIJEN} DJ&apos;s in de wachtrij. Ze komen binnen op
          status nieuw: niemand staat daarmee online en er gaat geen mail uit. Goedkeuren
          en uitnodigen blijven knoppen die jij indrukt.
        </p>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Wat deze import wel en niet doet</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
            <li>
              <span className="text-foreground">Geen foto&apos;s.</span> Een foto van
              iemands profiel is werk van een fotograaf. Die zetten we niet op ons eigen
              domein voordat de DJ ja heeft gezegd. Hij uploadt er zelf een bij het
              opeisen.
            </li>
            <li>
              <span className="text-foreground">De bron is verplicht.</span> Die komt in
              de uitnodigingsmail te staan. Zonder bron kun je de DJ niet vertellen waar
              zijn gegevens vandaan komen, en dat is geen vrije keuze.
            </li>
            <li>
              <span className="text-foreground">Een mailadres is verplicht.</span> Zonder
              adres kun je geen uitnodiging sturen en blijft de regel voor niets staan.
            </li>
            <li>
              <span className="text-foreground">Dubbele regels gaan eruit.</span> We
              kijken binnen je bestand, in de wachtrij, en of er al een account met dat
              mailadres bestaat.
            </li>
            <li>
              <span className="text-foreground">Sam kijkt erna mee.</span> Elke nieuwe
              regel krijgt binnen tien minuten zijn advies: groen, oranje of rood.
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Hoe de kolommen mogen heten</h2>
          <p className="mt-2 text-sm text-muted">
            Alleen <code>naam</code> en <code>email</code> zijn verplicht, de rest mag
            ontbreken. Hoofdletters, spaties en liggende streepjes maken niet uit.
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {[
              ["naam", "stage_name, artiestennaam, dj"],
              ["email", "mail, emailadres"],
              ["stad", "home_city, plaats, woonplaats"],
              ["tarief", "base_gage, gage, prijs"],
              ["genres", "genre, stijlen"],
              ["instagram", "instagram_handle, insta, ig"],
              ["soundcloud", "soundcloud_url"],
              ["mixcloud", "mixcloud_url"],
              ["spotify", "spotify_url"],
              ["website", "website_url, site"],
              ["bio", "beschrijving, omschrijving"],
              ["bron", "source_note, herkomst"],
            ].map(([naam, rest]) => (
              <div key={naam} className="flex gap-2">
                <dt className="font-medium">{naam}</dt>
                <dd className="text-muted">{rest}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">
            Meerdere genres scheid je met een streepje:{" "}
            <code>House|Techno</code>. Alleen genres die MyGigs al kent gaan mee, de rest
            wordt overgeslagen en gemeld.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface-2 p-3 text-xs">
            {VOORBEELD_CSV}
          </pre>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <ImportForm />
        </section>
      </div>
    </main>
  )
}
