import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { ArtistCard } from "@/components/artist-card"
import { getArtists } from "@/lib/data/artists"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"

export default async function Home() {
  const [artists, profile, { t }] = await Promise.all([
    getArtists(),
    getProfile(),
    getI18n(),
  ])
  const h = t.home
  const featured = artists.slice(0, 4)
  // DJ-werving (Word DJ / Word geboekt) tonen we alleen aan uitgelogde
  // bezoekers; ingelogde klanten regelen DJ-worden via de aanvraag.
  const showDjRecruitment = !profile
  const isArtist = profile?.role === "artist" || profile?.role === "both"

  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
        <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[640px]" />

        <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
          <p className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
            My<span className="text-brand">Gigs</span>
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Be the <span className="text-brand">star</span> you want to be.
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg font-medium text-muted">
            {h.brandTagline}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {isArtist ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
              >
                {h.toDashboard}
              </Link>
            ) : (
              <Link
                href="/discover"
                className="rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
              >
                {h.bookDj}
              </Link>
            )}
            {showDjRecruitment && (
              <Link
                href="/login?mode=signup&type=dj"
                className="rounded-full border border-border bg-surface px-7 py-3.5 font-medium transition hover:border-brand/50"
              >
                {h.becomeDj}
              </Link>
            )}
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
          {/* Zonder de DJ-werving-kaart blijven er twee over: dan een smaller
              grid zodat het paar gecentreerd staat i.p.v. links uitgelijnd. */}
          <div
            className={`mx-auto grid grid-cols-1 gap-5 ${
              showDjRecruitment
                ? "sm:grid-cols-3"
                : "sm:max-w-3xl sm:grid-cols-2"
            }`}
          >
            <SideCard
              title={h.card1Title}
              body={h.card1Body}
              cta={h.card1Cta}
              href="/discover"
              primary
            />
            {showDjRecruitment && (
              <SideCard
                tag={h.card2Tag}
                title={h.card2Title}
                body={h.card2Body}
                cta={h.card2Cta}
                href="/login?mode=signup&type=dj"
              />
            )}
            <SideCard
              title={h.card3Title}
              body={h.card3Body}
              cta={h.card3Cta}
              href="/zakelijk"
            />
          </div>
        </section>

        {featured.length > 0 && (
          <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                {h.featuredTitle}
              </h2>
              <Link
                href="/discover"
                className="text-sm font-medium text-brand hover:underline"
              >
                {h.viewAll}
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
            <Feature step="01" title={h.step1Title} body={h.step1Body} />
            <Feature step="02" title={h.step2Title} body={h.step2Body} />
            <Feature step="03" title={h.step3Title} body={h.step3Body} />
          </div>
        </section>

        {showDjRecruitment && (
          <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24 pt-8">
            <div className="overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center">
              <div className="brand-glow pointer-events-none absolute" />
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {h.ctaTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted">{h.ctaBody}</p>
              <Link
                href="/login?mode=signup&type=dj"
                className="mt-8 inline-block rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
              >
                {h.ctaButton}
              </Link>
            </div>
          </section>
        )}

        <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-muted">
          {h.footer}
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
  tag?: string
  title: string
  body: string
  cta: string
  href: string
  primary?: boolean
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-surface p-7">
      {tag && (
        <span className="text-xs font-semibold uppercase tracking-wider text-brand">
          {tag}
        </span>
      )}
      <h3
        className={`text-2xl font-semibold tracking-tight ${tag ? "mt-3" : ""}`}
      >
        {title}
      </h3>
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
