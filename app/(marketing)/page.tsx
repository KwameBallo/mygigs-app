import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { ArtistCard } from "@/components/artist-card"
import { getArtists, getGenres } from "@/lib/data/artists"

export default async function Home() {
  const [artists, genres] = await Promise.all([getArtists(), getGenres()])
  const featured = artists.slice(0, 4)

  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
        <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[640px]" />

        <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
          <span className="mb-6 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted">
            Artiesten en DJ&apos;s rechtstreeks boeken
          </span>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Be the star you <span className="text-brand">want to be.</span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted">
            MyGigs koppelt boekers rechtstreeks aan artiesten. Filter op locatie,
            genre, budget en datum. Boek in een paar tikken. Geen tussenkomst van
            boekingskantoren.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/discover"
              className="rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
            >
              Ik ga uit &amp; boek
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-full border border-border bg-surface px-7 py-3.5 font-medium transition hover:border-brand/50"
            >
              Ik ben DJ
            </Link>
          </div>

          {genres.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {genres.slice(0, 8).map((g) => (
                <Link
                  key={g.id}
                  href={`/discover?genre=${g.id}`}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted transition hover:border-brand/50 hover:text-foreground"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <SideCard
              tag="Voor consumenten"
              title="Ontdek & boek"
              body="Blader door de agenda met feesten en DJ's bij jou in de buurt. Boek een DJ voor je eigen event. Filter op genre, stad, datum en budget."
              cta="Ontdek feesten"
              href="/discover"
              primary
            />
            <SideCard
              tag="Voor DJ's & artiesten"
              title="Word geboekt"
              body="Maak een artiestprofiel aan, toon je demo's en volgers, en ontvang boekingsaanvragen. Aanmelden is gratis: MyGigs verdient 7% per boeking."
              cta="Word DJ"
              href="/login?mode=signup"
            />
            <SideCard
              tag="Voor bedrijven"
              title="Zakelijk boeken"
              body="Boek artiesten voor je bedrijfsevent met factuur op naam, BTW-aftrek en één aanspreekpunt. Sla je factuurgegevens eenmalig op."
              cta="Naar zakelijk"
              href="/zakelijk"
            />
          </div>
        </section>

        {featured.length > 0 && (
          <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                Uitgelichte artiesten
              </h2>
              <Link
                href="/discover"
                className="text-sm font-medium text-brand hover:underline"
              >
                Bekijk alles
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          </section>
        )}

        <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Feature
              step="01"
              title="Vind je match"
              body="Zoek op genre, stad, datum en budget. Zie rating, reviews en demo's voordat je boekt."
            />
            <Feature
              step="02"
              title="Boek direct"
              body="Stuur een aanvraag met datum en locatie. De artiest accepteert, jij betaalt veilig."
            />
            <Feature
              step="03"
              title="Veilige uitbetaling"
              body="Je geld staat in escrow tot na het optreden. 7% servicekosten, verder geen verrassingen."
            />
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24 pt-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center">
            <div className="brand-glow pointer-events-none absolute" />
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Klaar om te shinen?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Maak een profiel aan en ontvang je eerste boekingsaanvraag. Aanmelden
              is gratis.
            </p>
            <Link
              href="/login?mode=signup"
              className="mt-8 inline-block rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
            >
              Begin nu
            </Link>
          </div>
        </section>

        <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-muted">
          MyGigs. Be the star you want to be.
        </footer>
      </main>
    </>
  )
}

function SideCard({
  tag,
  title,
  body,
  cta,
  href,
  primary,
}: {
  tag: string
  title: string
  body: string
  cta: string
  href: string
  primary?: boolean
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-surface p-7">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand">
        {tag}
      </span>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted">{body}</p>
      <Link
        href={href}
        className={`mt-6 inline-block self-start rounded-full px-6 py-3 text-sm font-medium transition ${
          primary
            ? "bg-brand text-black hover:bg-brand-strong"
            : "border border-border hover:border-brand/50"
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}

function Feature({
  step,
  title,
  body,
}: {
  step: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <span className="text-sm font-mono text-brand">{step}</span>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  )
}
