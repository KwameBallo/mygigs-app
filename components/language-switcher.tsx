"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Locale } from "@/lib/i18n/config"

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === locale) return
    // Cookie 1 jaar geldig; daarna server opnieuw laten renderen.
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {(["nl", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted">/</span>}
          <button
            type="button"
            onClick={() => choose(l)}
            aria-label={l === "nl" ? "Nederlands" : "English"}
            className={
              l === locale
                ? "text-brand"
                : "text-muted transition hover:text-foreground"
            }
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}
