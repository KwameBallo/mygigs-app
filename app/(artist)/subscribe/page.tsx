import { redirect } from "next/navigation"
import Link from "next/link"
import { getProfile } from "@/lib/auth"
import { formatEuro } from "@/lib/utils/pricing"
import { PLANS, TRIAL_DAYS, hasActiveSubscription } from "@/lib/subscriptions"
import { getI18n } from "@/lib/i18n"
import { startSubscription } from "./actions"
import { dict } from "./i18n"

export default async function SubscribePage() {
  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const STATUS_LABEL: Record<string, string> = {
    inactive: d.statusInactive,
    trialing: d.statusTrialing,
    active: d.statusActive,
    past_due: d.statusPastDue,
    canceled: d.statusCanceled,
  }

  const planText: Record<string, { label: string; period: string; blurb: string }> = {
    monthly: {
      label: d.planMonthlyLabel,
      period: d.planMonthlyPeriod,
      blurb: d.planMonthlyBlurb,
    },
    yearly: {
      label: d.planYearlyLabel,
      period: d.planYearlyPeriod,
      blurb: d.planYearlyBlurb,
    },
  }

  const profile = await getProfile()
  if (!profile) redirect("/login?next=/subscribe")

  const active = hasActiveSubscription(profile.subscription_status)
  const trialEnd = profile.subscription_trial_end
    ? new Date(profile.subscription_trial_end).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.heading}</h1>
      <p className="mt-2 max-w-xl text-muted">
        {d.intro.replace("{days}", String(TRIAL_DAYS))}
      </p>

      {active && (
        <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <p className="text-sm font-medium text-brand">
            {STATUS_LABEL[profile.subscription_status] ??
              profile.subscription_status}
          </p>
          <p className="mt-1 text-sm text-muted">
            {profile.subscription_status === "trialing" && trialEnd
              ? d.trialUntil.replace("{date}", trialEnd)
              : d.activeBody}
          </p>
          <Link
            href="/events/manage"
            className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-black transition hover:bg-brand-strong"
          >
            {d.toEvents}
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Object.values(PLANS).map((plan) => (
          <form
            key={plan.id}
            action={startSubscription}
            className="flex flex-col rounded-2xl border border-border bg-surface p-6"
          >
            <input type="hidden" name="plan" value={plan.id} />
            <h2 className="text-lg font-semibold">{planText[plan.id].label}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {formatEuro(plan.price)}
              </span>
              <span className="text-sm text-muted">
                / {planText[plan.id].period}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm text-muted">
              {planText[plan.id].blurb}
            </p>
            <button
              type="submit"
              className="mt-5 h-11 rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
            >
              {active
                ? d.switchPlan
                : d.startFree.replace("{days}", String(TRIAL_DAYS))}
            </button>
          </form>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">{d.footer}</p>
    </main>
  )
}
