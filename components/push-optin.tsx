"use client"

import { useEffect, useState } from "react"
import { useT } from "@/components/i18n-provider"

const DISMISS_KEY = "mygigs_push_dismissed"

// VAPID-sleutel (base64url) → Uint8Array voor pushManager.subscribe.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

async function subscribe(): Promise<boolean> {
  if (!VAPID) return false
  const reg = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID),
    }))
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  })
  return res.ok
}

// Vraagt (na een tik) toestemming voor meldingen en registreert het apparaat.
// Toont alleen een banner als meldingen nog niet aan/geweigerd zijn.
export function PushOptin() {
  const { t } = useT()
  const p = t.push
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    if (!supported || !VAPID) return
    if (Notification.permission === "granted") {
      // Stil opnieuw abonneren zodat het abonnement geldig blijft.
      subscribe().catch(() => {})
      return
    }
    if (Notification.permission === "default") {
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") return
      } catch {}
      setShow(true)
    }
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === "granted") await subscribe()
    } catch {}
    setBusy(false)
    setShow(false)
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="flex w-full items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 flex-none text-brand"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-medium">{p.title}</p>
          <p className="truncate text-xs text-muted">{p.body}</p>
        </div>
      </div>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
        >
          {p.dismiss}
        </button>
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-black transition hover:bg-brand-strong disabled:opacity-50"
        >
          {p.enable}
        </button>
      </div>
    </div>
  )
}
