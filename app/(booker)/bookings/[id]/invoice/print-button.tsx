"use client"

import { useT } from "@/components/i18n-provider"
import { dict } from "./i18n"

export function PrintButton() {
  const { locale } = useT()
  const d = dict[locale]
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong print:hidden"
    >
      {d.print}
    </button>
  )
}
