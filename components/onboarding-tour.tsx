"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useHideOnScroll } from "@/lib/use-hide-on-scroll"

// Coach-mark rondleiding: licht het echte element uit (spotlight), wijst ernaar
// met een vinger en een callout, en leidt de gebruiker stap voor stap door de
// app. Rol-bewust. Voortgang in localStorage. Opnieuw te openen via het knopje
// linksonder. Werkt met terugval: vindt hij een element niet, dan toont hij de
// callout gecentreerd zodat de tour nooit vastloopt.

type Step = { sel?: string; page?: string; title: string; body: string }
type Rect = { top: number; left: number; width: number; height: number }

type Dict = {
  skip: string
  back: string
  next: string
  done: string
  reopen: string
  stepLabel: string
  bookerSteps: Step[]
  djSteps: Step[]
}

const nl: Dict = {
  skip: "Overslaan",
  back: "Vorige",
  next: "Volgende",
  done: "Let's go",
  reopen: "Rondleiding",
  stepLabel: "Stap {n} / {t}",
  bookerSteps: [
    { sel: 'a[href="/discover"]', title: "Ontdek DJ's", body: "Tik op Ontdek en scroll door de DJ's op de kaart." },
    { sel: '[data-tour="discover-search"]', page: "/discover", title: "Zoek & filter", body: "Zoek op naam of stad, of via filter." },
    { sel: 'a[href="/bookings"]', page: "/bookings", title: "Je boekingen", body: "Boekingen, facturen én reviews." },
    { title: "Je bent klaar 🎉", body: "Boom. Klaar om je DJ te vinden." },
  ],
  djSteps: [
    { sel: 'a[href="/profile"]', title: "Je profiel", body: "Eerst even shinen: profiel, foto's en je tarief." },
    { sel: '[data-tour="profile-billing"]', page: "/profile", title: "Facturatie & KVK", body: "Regel je zaakjes: KVK en btw-status. Zonder dit geen facturen." },
    { sel: 'a[href="/availability"]', page: "/availability", title: "Beschikbaarheid", body: "Wanneer kun je? Vul je beschikbaarheid in." },
    { sel: 'a[href="/dashboard"]', page: "/dashboard", title: "Aanvragen", body: "Boekingen landen op je dashboard. Controleer en accepteer." },
    { title: "Je bent set 🔥", body: "Klaar om gigs binnen te halen. Go." },
  ],
}

const en: Dict = {
  skip: "Skip",
  back: "Back",
  next: "Next",
  done: "Let's go",
  reopen: "Tour",
  stepLabel: "Step {n} / {t}",
  bookerSteps: [
    { sel: 'a[href="/discover"]', title: "Discover DJs", body: "Tap Discover and scroll the DJs on the map." },
    { sel: '[data-tour="discover-search"]', page: "/discover", title: "Search & filter", body: "Search by name or city, or use a filter." },
    { sel: 'a[href="/bookings"]', page: "/bookings", title: "Your bookings", body: "Bookings, invoices and reviews." },
    { title: "You're set 🎉", body: "Boom. Ready to find your DJ." },
  ],
  djSteps: [
    { sel: 'a[href="/profile"]', title: "Your profile", body: "Shine first: profile, photos and your rate." },
    { sel: '[data-tour="profile-billing"]', page: "/profile", title: "Billing & registration", body: "Sort the essentials: Chamber of Commerce and VAT. No invoices without it." },
    { sel: 'a[href="/availability"]', page: "/availability", title: "Availability", body: "When are you free? Set your availability." },
    { sel: 'a[href="/dashboard"]', page: "/dashboard", title: "Requests", body: "Bookings land on your dashboard. Check and accept." },
    { title: "You're set 🔥", body: "Ready to pull in gigs. Go." },
  ],
}

const KEY = "mygigs_onboarding_v2"

function visibleEl(sel: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(sel))
  return (
    els.find((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }) ?? null
  )
}

export function OnboardingTour({
  locale,
  role,
}: {
  locale: "nl" | "en"
  role: string | null | undefined
}) {
  const d = locale === "en" ? en : nl
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [above, setAbove] = useState(false)
  const scrolling = useHideOnScroll()

  const isDj = role === "artist" || role === "both"
  const steps = isDj ? d.djSteps : d.bookerSteps

  useEffect(() => {
    setMounted(true)
    try {
      const v = localStorage.getItem(KEY)
      if (v === "done") {
        setActive(false)
      } else {
        const n = v ? parseInt(v, 10) : 0
        setStep(Number.isFinite(n) && n > 0 ? Math.min(n, steps.length - 1) : 0)
        setActive(true)
      }
    } catch {
      setActive(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const measure = useCallback(
    (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      setAbove(r.top > window.innerHeight * 0.55)
    },
    [],
  )

  // Zoek het doel-element voor de huidige stap (met retries, want na navigatie
  // is het er soms nog niet direct).
  useEffect(() => {
    if (!active) return
    const s = steps[step]
    if (!s || !s.sel) {
      setRect(null)
      return
    }
    if (s.page && pathname !== s.page) return // wacht tot we op de juiste pagina zijn
    let tries = 0
    let stop = false
    const find = () => {
      if (stop) return
      const el = visibleEl(s.sel!)
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" })
        setTimeout(() => !stop && measure(el), 280)
      } else if (tries < 15) {
        tries++
        setTimeout(find, 180)
      } else {
        setRect(null) // terugval: gecentreerd
      }
    }
    find()
    return () => {
      stop = true
    }
  }, [active, step, pathname, steps, measure])

  // Herposition bij scroll/resize.
  useEffect(() => {
    if (!active) return
    const on = () => {
      const s = steps[step]
      if (s?.sel && (!s.page || pathname === s.page)) {
        const el = visibleEl(s.sel)
        if (el) measure(el)
      }
    }
    window.addEventListener("resize", on)
    window.addEventListener("scroll", on, true)
    return () => {
      window.removeEventListener("resize", on)
      window.removeEventListener("scroll", on, true)
    }
  }, [active, step, pathname, steps, measure])

  if (!mounted || role === "admin" || !role) return null

  const persist = (n: number) => {
    try {
      localStorage.setItem(KEY, String(n))
    } catch {}
  }
  const complete = () => {
    try {
      localStorage.setItem(KEY, "done")
    } catch {}
    setActive(false)
    setRect(null)
  }
  const reopen = () => {
    persist(0)
    setStep(0)
    setRect(null)
    setActive(true)
    if (steps[0]?.page && pathname !== steps[0].page) router.push(steps[0].page)
  }

  if (!active) {
    return (
      <button
        onClick={reopen}
        aria-label={d.reopen}
        style={{ zIndex: 99999 }}
        className={`fixed bottom-36 right-4 flex items-center gap-2 rounded-full border border-border bg-surface/90 p-2.5 text-sm font-medium text-muted shadow-lg backdrop-blur transition-all hover:border-brand/50 hover:text-foreground lg:bottom-6 lg:right-44 lg:px-4 lg:py-2 ${
          scrolling
            ? "max-lg:pointer-events-none max-lg:translate-y-6 max-lg:opacity-0"
            : ""
        }`}
      >
        <span aria-hidden>❔</span>
        <span className="hidden lg:inline">{d.reopen}</span>
      </button>
    )
  }

  const s = steps[step]
  const isLast = step === steps.length - 1

  const goStep = (n: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, n))
    persist(clamped)
    setStep(clamped)
    setRect(null)
    const ns = steps[clamped]
    if (ns.page && pathname !== ns.page) router.push(ns.page)
  }
  const next = () => (isLast ? complete() : goStep(step + 1))

  const pad = 6
  const spot = rect
    ? {
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + 2 * pad,
        height: rect.height + 2 * pad,
      }
    : null

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200
  const cw = Math.min(340, vw - 28)
  let callout: CSSProperties
  if (rect) {
    const left = Math.min(Math.max(rect.left, 14), vw - cw - 14)
    callout = above
      ? {
          position: "fixed",
          left,
          bottom: window.innerHeight - rect.top + 18,
          width: cw,
          zIndex: 100001,
        }
      : {
          position: "fixed",
          left,
          top: rect.top + rect.height + 18,
          width: cw,
          zIndex: 100001,
        }
  } else {
    callout = {
      position: "fixed",
      left: "50%",
      bottom: "9vh",
      transform: "translateX(-50%)",
      width: cw,
      zIndex: 100001,
    }
  }

  return (
    <>
      {spot ? (
        <div
          className="onb-spot"
          style={{
            position: "fixed",
            zIndex: 100000,
            pointerEvents: "none",
            left: spot.left,
            top: spot.top,
            width: spot.width,
            height: spot.height,
            borderRadius: 14,
            outline: "2px solid var(--brand)",
            transition: "left .25s, top .25s, width .25s, height .25s",
          }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            pointerEvents: "none",
            background: "rgba(6,6,9,.55)",
          }}
        />
      )}

      {spot && rect && (
        <div
          className="onb-finger"
          aria-hidden
          style={{
            position: "fixed",
            zIndex: 100001,
            pointerEvents: "none",
            left: rect.left + rect.width / 2 - 13,
            top: above ? spot.top - 34 : spot.top + spot.height + 2,
            fontSize: 26,
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,.6))",
          }}
        >
          {above ? "👇" : "👆"}
        </div>
      )}

      <div
        role="dialog"
        aria-label="Rondleiding"
        style={callout}
        className="rounded-2xl border border-brand/40 bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-brand">
            {d.stepLabel
              .replace("{n}", String(step + 1))
              .replace("{t}", String(steps.length))}
          </span>
          <button
            onClick={complete}
            aria-label={d.skip}
            className="-mr-1 -mt-1 rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight">{s.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {steps.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 rounded-full transition-all ${
                  k === step ? "w-5 bg-brand" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => goStep(step - 1)}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
              >
                {d.back}
              </button>
            )}
            <button
              onClick={next}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-black transition hover:bg-brand-strong"
            >
              {isLast ? d.done : d.next}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
