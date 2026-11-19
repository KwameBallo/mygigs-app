import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Logo } from "@/components/logo"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"

export default async function Home() {
  const [profile, { locale, t }] = await Promise.all([
    getProfile(),
    getI18n(),
  ])
  const h = t.home
  // DJ-werving (Word DJ / Word geboekt) tonen we alleen aan uitgelogde
  // bezoekers; ingelogde klanten regelen DJ-worden via de aanvraag.
  const showDjRecruitment = !profile
  const isArtist = profile?.role === "artist" || profile?.role === "both"

  // "Ik ben DJ": een DJ gaat naar zijn dashboard, een ingelogde klant naar de
  // aanvraag om DJ te worden, een uitgelogde bezoeker naar aanmelden als DJ.
  const djHref = isArtist
    ? "/dashboard"
    : profile
      ? "/dj-aanvraag"
      : "/login?mode=signup&type=dj"

  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
        <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[640px]" />

        <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
          <Logo size="lg" />
          <div className="mb-8" />
          <h1 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Be the <span className="text-brand">star</span> you want to be.
          </h1>
          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Link
              href="/discover"
              className="flex-1 rounded-full bg-brand px-8 py-4 font-medium text-black transition hover:bg-brand-strong"
            >
              {h.bookDj}
            </Link>
            <Link
              href={djHref}
              className="flex-1 rounded-full border border-border bg-surface px-8 py-4 font-medium transition hover:border-brand/50"
            >
              {locale === "nl" ? "Ik ben DJ" : "I am a DJ"}
            </Link>
          </div>
        </section>

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
