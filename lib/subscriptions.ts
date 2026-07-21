// Verdienmodel: artiesten sluiten een abonnement af. Geen boekingsfee.
import type { Database } from "@/types/database"
import type { Locale } from "@/lib/i18n/config"

export type SubscriptionStatus =
  Database["public"]["Enums"]["subscription_status"]

export type PlanId = "monthly" | "yearly"

export type Plan = {
  id: PlanId
  label: string
  price: number
  period: "maand" | "jaar"
  blurb: string
  // Aantal maanden dat de periode beslaat (voor period_end-berekening).
  months: number
}

export const TRIAL_DAYS = 14

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    label: "Maandelijks",
    price: 29,
    period: "maand",
    blurb: "Flexibel, elke maand opzegbaar.",
    months: 1,
  },
  yearly: {
    id: "yearly",
    label: "Jaarlijks",
    price: 290,
    period: "jaar",
    blurb: "Twee maanden gratis ten opzichte van maandelijks.",
    months: 12,
  },
}

// Gelokaliseerde weergave van een plan. De canonieke `PLANS` (prijs, months,
// period-berekening) blijven ongewijzigd; dit vertaalt alleen de labels.
const PLAN_TEXT: Record<PlanId, Record<Locale, { label: string; period: string; blurb: string }>> = {
  monthly: {
    nl: { label: "Maandelijks", period: "maand", blurb: "Flexibel, elke maand opzegbaar." },
    en: { label: "Monthly", period: "month", blurb: "Flexible, cancel any month." },
  },
  yearly: {
    nl: {
      label: "Jaarlijks",
      period: "jaar",
      blurb: "Twee maanden gratis ten opzichte van maandelijks.",
    },
    en: {
      label: "Yearly",
      period: "year",
      blurb: "Two months free compared to monthly.",
    },
  },
}

export function planLabel(id: PlanId, locale: Locale = "nl"): string {
  return PLAN_TEXT[id][locale].label
}

export function planPeriod(id: PlanId, locale: Locale = "nl"): string {
  return PLAN_TEXT[id][locale].period
}

export function planBlurb(id: PlanId, locale: Locale = "nl"): string {
  return PLAN_TEXT[id][locale].blurb
}

export function isPlanId(value: string): value is PlanId {
  return value === "monthly" || value === "yearly"
}

// Een artiest is "live" zolang de proefperiode loopt of het abonnement actief is.
export function hasActiveSubscription(
  status: SubscriptionStatus | null | undefined,
): boolean {
  return status === "trialing" || status === "active"
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}
