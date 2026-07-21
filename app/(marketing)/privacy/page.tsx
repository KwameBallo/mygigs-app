import Link from "next/link"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return { title: dict[locale].metaTitle }
}

export default async function PrivacyPage() {
  const { locale } = await getI18n()
  const d = dict[locale]

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <Link
        href="/"
        className="text-sm text-muted transition hover:text-foreground"
      >
        {d.back}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {d.updated.replace("{date}", d.updatedDate)}
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
        {d.sections.map((section) => (
          <Section key={section.heading} title={section.heading}>
            {section.body}
          </Section>
        ))}
        <Section title={d.contact.heading}>
          {d.contact.prefix}
          <a
            href={`mailto:${d.contact.email}`}
            className="font-medium text-brand hover:underline"
          >
            {d.contact.email}
          </a>
          {d.contact.suffix}
        </Section>
      </div>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5">{children}</p>
    </section>
  )
}
