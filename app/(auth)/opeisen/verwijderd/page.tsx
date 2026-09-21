import type { Metadata } from "next"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { getI18n } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Gegevens verwijderd · MyGigs",
  robots: { index: false, follow: false },
}

const text = {
  nl: {
    title: "Je gegevens zijn verwijderd",
    body: "We hebben alles weggehaald wat we van je hadden, en we nemen geen contact meer met je op. Bedenk je je later? Je bent altijd welkom om je zelf aan te melden.",
    home: "Naar mygigs.nl",
  },
  en: {
    title: "Your details have been deleted",
    body: "We have removed everything we had about you, and we will not contact you again. Change your mind later? You are always welcome to sign up yourself.",
    home: "Go to mygigs.nl",
  },
}

export default async function DeletedPage() {
  const { locale } = await getI18n()
  const t = text[locale]
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="safe-py relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 text-center">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-3 text-sm text-muted">{t.body}</p>
        <Link href="/" className="mt-6 text-sm font-medium text-brand hover:underline">
          {t.home}
        </Link>
      </div>
    </main>
  )
}
