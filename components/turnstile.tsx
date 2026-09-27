"use client"

import { useEffect, useRef } from "react"

// =============================================================
// Het vakje van Cloudflare Turnstile.
//
// Voor een mens is dit onzichtbaar of één vinkje; een formulierbot komt er niet
// door. Turnstile zet zelf een verborgen veld in het formulier waar de server
// het bewijs uit haalt.
//
// We plaatsen het vakje expliciet in plaats van automatisch, omdat je op de
// inlogpagina tussen inloggen en aanmelden wisselt zonder de pagina te
// herladen. Bij automatisch plaatsen zou het vakje dan niet verschijnen.
// =============================================================

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; theme?: string; action?: string },
  ) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

export function Turnstile({
  siteKey,
  action,
}: {
  siteKey: string
  action?: string
}) {
  const holder = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let widgetId: string | null = null
    let timer = 0

    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const script = document.createElement("script")
      script.src = SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // Wachten tot het script er is en dan het vakje plaatsen.
    timer = window.setInterval(() => {
      if (!holder.current || !window.turnstile) return
      window.clearInterval(timer)
      if (holder.current.childElementCount > 0) return
      widgetId = window.turnstile.render(holder.current, {
        sitekey: siteKey,
        theme: "dark",
        action,
      })
    }, 120)

    return () => {
      window.clearInterval(timer)
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          // Al opgeruimd door Turnstile zelf; niets aan de hand.
        }
      }
    }
  }, [siteKey, action])

  return <div ref={holder} className="flex justify-center" />
}
