"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  PLANS,
  TRIAL_DAYS,
  addDays,
  addMonths,
  isPlanId,
} from "@/lib/subscriptions"

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

  // Stripe Checkout hoort hier zodra STRIPE_SECRET_KEY is gezet. Zonder Stripe
  // starten we direct de 14-daagse proefperiode zodat de tool te gebruiken is.
  const now = new Date()
  const trialEnd = addDays(now, TRIAL_DAYS)
  const periodEnd = addMonths(trialEnd, plan.months)

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: "trialing",
      subscription_plan: plan.id,
      subscription_trial_end: trialEnd.toISOString(),
      subscription_current_period_end: periodEnd.toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    redirect(`/subscribe?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath("/subscribe")
  revalidatePath("/settings")
  revalidatePath("/profile")
  redirect("/profile?subscribed=1")
}
