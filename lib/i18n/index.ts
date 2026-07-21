import "server-only"
import { cookies } from "next/headers"
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./config"
import { dictionaries } from "./dictionaries"

// Huidige taal uit de cookie (val terug op Nederlands).
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE
}

// Taal + woordenboek voor server components.
export async function getI18n() {
  const locale = await getLocale()
  return { locale, t: dictionaries[locale] }
}
