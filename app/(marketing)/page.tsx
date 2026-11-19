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

        <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-muted">
          {h.footer}
        </footer>
      </main>
    </>
  )
}

