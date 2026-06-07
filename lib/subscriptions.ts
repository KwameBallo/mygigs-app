// Verdienmodel: artiesten sluiten een abonnement af. Geen boekingsfee.
import type { Database } from "@/types/database"

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
