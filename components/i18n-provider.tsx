"use client"

import { createContext, useContext } from "react"
import type { Locale } from "@/lib/i18n/config"
import type { Dictionary } from "@/lib/i18n/dictionaries"

type Ctx = { locale: Locale; t: Dictionary }

const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale
  dict: Dictionary
  children: React.ReactNode
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dict }}>
      {children}
    </I18nContext.Provider>
  )
}

// Vertalingen ophalen in client-componenten.
export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useT must be used within I18nProvider")
  return ctx
}
