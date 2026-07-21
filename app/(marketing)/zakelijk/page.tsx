import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"

export async function generateMetadata() {
  const { locale } = await getI18n()
  const d = dict[locale]
  return {
    title: d.metaTitle,
    description: d.metaDescription,
  }
}

// Placeholder-namen: vervang door echte klantlogo's zodra die er zijn.
const CLIENTS = [
  "Rabobank",
  "KLM",
  "Heineken",
  "Bol.com",
  "Ahold",
  "Coolblue",
]

export default async function ZakelijkPage() {
  const { locale } = await getI18n()
  const d = dict[locale]

  return (
    <>
      <SiteHeader />
      <main className="relative flex flex-1 flex-col">
        <div className="brand-glow pointer-events-none absolute inset-x-0 top-0 h-[560px]" />

        {/* Hero */}
        <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-12 pt-20 text-center sm:pt-28">
          <span className="mb-6 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted">
            {d.heroBadge}
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-[1.07] tracking-tight sm:text-6xl">
            {d.heroTitleLead}{" "}
            <span className="text-brand">{d.heroTitleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-muted">
            {d.heroBody}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/discover"
              className="rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
            >
              {d.ctaViewDjs}
            </Link>
            <Link
              href="/login?mode=signup"
              className="rounded-full border border-border bg-surface px-7 py-3.5 font-medium transition hover:border-brand/50"
            >
              {d.ctaCreateAccount}
            </Link>
          </div>
        </section>

        {/* Logo-strip */}
        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-12">
          <p className="text-center text-xs uppercase tracking-wider text-muted">
            {d.logoStripLabel}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {CLIENTS.map((name) => (
              <span
                key={name}
                className="text-lg font-semibold tracking-tight text-muted/60 transition hover:text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Voordelen */}
        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {d.benefits.map((benefit) => (
              <Benefit
                key={benefit.title}
                title={benefit.title}
                body={benefit.body}
              />
            ))}
          </div>
        </section>

        {/* Zo werkt het */}
        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {d.howItWorksTitle}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {d.steps.map((step) => (
              <Step
                key={step.step}
                step={step.step}
                title={step.title}
                body={step.body}
              />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-24 pt-8">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {d.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              {d.ctaBody}
            </p>
            <Link
              href="/discover"
              className="mt-8 inline-block rounded-full bg-brand px-7 py-3.5 font-medium text-black transition hover:bg-brand-strong"
            >
              {d.ctaViewDjs}
            </Link>
          </div>
        </section>

        <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-muted">
          {d.footer}
        </footer>
      </main>
    </>
  )
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  )
}

function Step({
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
      <span className="font-mono text-sm text-brand">{step}</span>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  )
}
