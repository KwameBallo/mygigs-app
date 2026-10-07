"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getI18n } from "@/lib/i18n"
import {
  PLANS,
  TRIAL_DAYS,
  addDays,
  addMonths,
  isPlanId,
} from "@/lib/subscriptions"
import { dict } from "./i18n"

export async function startSubscription(formData: FormData) {
  const planRaw = String(formData.get("plan") ?? "")
  if (!isPlanId(planRaw)) {
    redirect("/subscribe?error=plan")
  }
  const plan = PLANS[planRaw]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?next=/subscribe")
  }

  // Hier hoort een incasso via Mollie te komen. Zolang die er niet is starten
  // we direct de proefperiode van 14 dagen, zodat de DJ gewoon kan werken.
  //
  // Let op bij het bouwen daarvan: een abonnement is een terugkerende incasso
  // en loopt dus langs een ander deel van Mollie dan een boeking. Niet in
  // lib/payments.ts proppen; dat bestand gaat over geld van een boeker dat
  // naar een DJ moet, en dat is hier niet aan de orde.
  const now = new Date()
  const trialEnd = addDays(now, TRIAL_DAYS)
  const periodEnd = addMonths(trialEnd, plan.months)

  // Abonnementsvelden zijn client-side niet meer wijzigbaar (kolomrechten):
  // deze status wordt met de service-role gezet. Straks zet Mollie dit.
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: "trialing",
      subscription_plan: plan.id,
      subscription_trial_end: trialEnd.toISOString(),
      subscription_current_period_end: periodEnd.toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    console.error("startSubscription failed:", error.message)
    const { locale } = await getI18n()
    redirect(
      `/subscribe?error=${encodeURIComponent(dict[locale].genericError)}`,
    )
  }

  revalidatePath("/subscribe")
  revalidatePath("/settings")
  revalidatePath("/profile")
  redirect("/profile?subscribed=1")
}
