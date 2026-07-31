import Link from "next/link"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"
import { ContactForm } from "./contact-form"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return { title: dict[locale].metaTitle }
}

export default async function KlantenservicePage() {
  const { locale } = await getI18n()
  const d = dict[locale]

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <Link
        href="/"
        className="text-sm text-muted transition hover:text-foreground"
      >
        {d.back}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        {d.intro}
      </p>

      {/* Categorie-tegels */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {d.categories.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <p className="font-medium">{c.title}</p>
            <p className="mt-1 text-sm text-muted">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Veelgestelde vragen */}
      <h2 className="mt-12 text-xl font-semibold tracking-tight">
        {d.faqTitle}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {d.faq.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-border bg-surface px-5 py-1 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-medium">
              {item.q}
              <span className="text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>

      {/* Handige links */}
      <h2 className="mt-12 text-xl font-semibold tracking-tight">
        {d.linksTitle}
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {d.links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted transition hover:border-brand/50 hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Contact */}
      <h2 className="mt-12 text-xl font-semibold tracking-tight">
        {d.contactTitle}
      </h2>
      <div className="mt-4 rounded-3xl border border-border bg-surface p-6">
        <ContactForm t={d.form} intro={d.contactIntro} />
      </div>
    </main>
  )
}
