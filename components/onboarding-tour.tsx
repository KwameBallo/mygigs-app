"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Rol-bewuste welkomst-rondleiding die de gebruiker bij de eerste login stap
// voor stap door de app leidt. Voortgang staat in localStorage zodat de gids
// meeloopt over paginawissels heen. Later opnieuw te openen via het knopje
// linksonder.

type Step = { title: string; body: string; cta: string; href?: string }

type Dict = {
  skip: string
  back: string
  reopen: string
  stepLabel: string // "Stap {n} van {t}"
  bookerSteps: Step[]
  djSteps: Step[]
}

const nl: Dict = {
  skip: "Overslaan",
  back: "Vorige",
  reopen: "Rondleiding",
  stepLabel: "Stap {n} van {t}",
  bookerSteps: [
    {
      title: "Welkom bij MyGigs 👋",
      body: "In een paar stappen laten we zien hoe je de perfecte DJ boekt.",
      cta: "Start",
    },
    {
      title: "Ontdek DJ's",
      body: "Vind op de kaart de DJ die bij je event past — gefilterd op stijl, budget en datum.",
      cta: "Ga naar Ontdekken",
      href: "/discover",
    },
    {
      title: "Doe een aanvraag",
      body: "Kies een DJ, geef datum en locatie op en bespreek de details in de chat.",
      cta: "Volgende",
    },
    {
      title: "Veilig betalen",
      body: "Na acceptatie betaal je via de app. Je geld staat veilig in escrow tot ná het optreden.",
      cta: "Volgende",
    },
    {
      title: "Je boekingen",
      body: "Al je boekingen, facturen en reviews vind je hier terug. Veel plezier!",
      cta: "Naar mijn boekingen",
      href: "/bookings",
    },
  ],
  djSteps: [
    {
      title: "Welkom bij MyGigs 👋",
      body: "Zet je act neer en ontvang boekingen. We lopen de belangrijkste stappen even langs.",
      cta: "Start",
    },
    {
      title: "Bouw je profiel",
      body: "Vul je profiel: media, uurtarief en welke apparatuur je meeneemt.",
      cta: "Naar mijn profiel",
      href: "/profile",
    },
    {
      title: "Facturatie & KVK",
      body: "Stel op je profiel je facturatiegegevens in: KVK-nummer en btw-status (btw-plichtig of KOR). Zonder KVK kun je niet factureren.",
      cta: "Volgende",
    },
    {
      title: "Beschikbaarheid",
      body: "Zet je beschikbare data zodat organisatoren je kunnen boeken.",
      cta: "Naar beschikbaarheid",
      href: "/availability",
    },
    {
      title: "Aanvragen accepteren",
      body: "Nieuwe boekingsaanvragen accepteer je op je dashboard.",
      cta: "Naar dashboard",
      href: "/dashboard",
    },
    {
      title: "Uitbetaling",
      body: "Na het optreden word je netto binnen 5 werkdagen uitbetaald, met verkoop- en commissiefactuur. Succes!",
      cta: "Klaar",
    },
  ],
}

const en: Dict = {
  skip: "Skip",
  back: "Back",
  reopen: "Tour",
  stepLabel: "Step {n} of {t}",
  bookerSteps: [
    {
      title: "Welcome to MyGigs 👋",
      body: "In a few steps we'll show you how to book the perfect DJ.",
      cta: "Start",
    },
    {
      title: "Discover DJs",
      body: "Find the DJ that fits your event on the map — filtered by style, budget and date.",
      cta: "Go to Discover",
      href: "/discover",
    },
    {
      title: "Send a request",
      body: "Pick a DJ, add date and location, and discuss the details in chat.",
      cta: "Next",
    },
    {
      title: "Pay securely",
      body: "After acceptance you pay through the app. Your money is held in escrow until after the gig.",
      cta: "Next",
    },
    {
      title: "Your bookings",
      body: "You'll find all your bookings, invoices and reviews here. Enjoy!",
      cta: "Go to my bookings",
      href: "/bookings",
    },
  ],
  djSteps: [
    {
      title: "Welcome to MyGigs 👋",
      body: "Set up your act and receive bookings. Let's walk through the key steps.",
      cta: "Start",
    },
    {
      title: "Build your profile",
      body: "Fill in your profile: media, hourly rate and the equipment you bring.",
      cta: "Go to my profile",
      href: "/profile",
    },
    {
      title: "Billing & Chamber of Commerce",
      body: "On your profile, set your billing details: Chamber of Commerce number and VAT status (VAT-registered or KOR). Without registration you can't invoice.",
      cta: "Next",
    },
    {
      title: "Availability",
      body: "Set your available dates so organisers can book you.",
      cta: "Go to availability",
      href: "/availability",
    },
    {
      title: "Accept requests",
      body: "You accept new booking requests on your dashboard.",
      cta: "Go to dashboard",
      href: "/dashboard",
    },
    {
      title: "Payout",
      body: "After the gig you're paid out net within 5 business days, with a sales and commission invoice. Good luck!",
      cta: "Done",
    },
  ],
}

const KEY = "mygigs_onboarding_v1"

export function OnboardingTour({
  locale,
  role,
}: {
  locale: "nl" | "en"
  role: string | null | undefined
}) {
  const d = locale === "en" ? en : nl
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

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

  // Onboarding is voor DJ's en organisatoren; admins slaan we over.
  if (!mounted || role === "admin" || !role) return null

  function persist(n: number) {
    try {
      localStorage.setItem(KEY, String(n))
    } catch {}
  }
  function complete() {
    try {
      localStorage.setItem(KEY, "done")
    } catch {}
    setActive(false)
  }
  function reopen() {
    persist(0)
    setStep(0)
    setActive(true)
  }

  if (!active) {
    return (
      <button
        onClick={reopen}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted shadow-lg backdrop-blur transition hover:border-brand/50 hover:text-foreground"
      >
        <span aria-hidden>❔</span>
        {d.reopen}
      </button>
    )
  }

  const s = steps[step]
  const isLast = step === steps.length - 1

  function primary() {
    if (isLast) {
      complete()
      if (s.href) router.push(s.href)
      return
    }
    const next = step + 1
    persist(next)
    setStep(next)
    if (s.href) router.push(s.href)
  }

  return (
    <div
      role="dialog"
      aria-label="Rondleiding"
      className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border border-border bg-surface p-5 shadow-2xl"
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
              onClick={() => {
                const p = step - 1
                persist(p)
                setStep(p)
              }}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
            >
              {d.back}
            </button>
          )}
          <button
            onClick={primary}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-black transition hover:bg-brand-strong"
          >
            {s.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
