import Link from "next/link"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"
import {
  PLANS,
  planLabel,
  planPeriod,
  hasActiveSubscription,
} from "@/lib/subscriptions"
import { roleLabel } from "@/lib/roles"
import { updateAccount, updateCompanyDetails } from "./actions"
import { DeleteAccountButton } from "./delete-account-button"
import { dict } from "./i18n"

export default async function SettingsPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/settings")

  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const subStatusLabel: Record<string, string> = {
    inactive: d.statusInactive,
    trialing: d.statusTrialing,
    active: d.statusActive,
    past_due: d.statusPastDue,
    canceled: d.statusCanceled,
  }

  const subActive = hasActiveSubscription(profile.subscription_status)
  const subPlan = profile.subscription_plan
    ? PLANS[profile.subscription_plan as keyof typeof PLANS]
    : null
  const periodEnd = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString(
        dateLocale,
        { day: "numeric", month: "long", year: "numeric" },
      )
    : null
  const trialEnd = profile.subscription_trial_end
    ? new Date(profile.subscription_trial_end).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.pageTitle}</h1>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">{d.accountTitle}</h2>
        <p className="mt-1 text-sm text-muted">{d.accountSubtitle}</p>
        <form action={updateAccount} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.fullName}</span>
            <input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder={d.fullNamePlaceholder}
              className="input h-11"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{d.gender}</span>
              <select
                name="gender"
                defaultValue={profile.gender ?? ""}
                className="input h-11"
              >
                <option value="">{d.genderChoose}</option>
                <option value="man">{d.genderMan}</option>
                <option value="vrouw">{d.genderWoman}</option>
                <option value="anders">{d.genderOther}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{d.phone}</span>
              <input
                name="phone"
                type="tel"
                defaultValue={profile.phone ?? ""}
                placeholder={d.phonePlaceholder}
                className="input h-11"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.email}</span>
            <input
              value={profile.email ?? ""}
              disabled
              className="input h-11 opacity-60"
            />
          </label>
          <p className="text-xs text-muted">{d.contactPrivacyNote}</p>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{d.role}</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">
              {roleLabel(profile.role, locale)}
            </span>
          </div>
          <button
            type="submit"
            className="mt-1 h-11 self-start rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
          >
            {d.save}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">{d.companyTitle}</h2>
        <p className="mt-1 text-sm text-muted">{d.companySubtitle}</p>
        <form
          action={updateCompanyDetails}
          className="mt-4 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.companyName}</span>
            <input
              name="company_name"
              defaultValue={profile.company_name ?? ""}
              placeholder={d.companyNamePlaceholder}
              className="input h-11"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{d.vatNumber}</span>
              <input
                name="vat_number"
                defaultValue={profile.vat_number ?? ""}
                placeholder={d.vatNumberPlaceholder}
                className="input h-11"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{d.invoiceEmail}</span>
              <input
                name="invoice_email"
                type="email"
                defaultValue={profile.invoice_email ?? ""}
                placeholder={d.invoiceEmailPlaceholder}
                className="input h-11"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{d.invoiceAddress}</span>
            <input
              name="invoice_address"
              defaultValue={profile.invoice_address ?? ""}
              placeholder={d.invoiceAddressPlaceholder}
              className="input h-11"
            />
          </label>
          <button
            type="submit"
            className="mt-1 h-11 self-start rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
          >
            {d.save}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">{d.subscriptionTitle}</h2>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span>{d.status}</span>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              subActive
                ? "bg-brand/10 text-brand"
                : "bg-surface-2 text-foreground"
            }`}
          >
            {subStatusLabel[profile.subscription_status] ??
              profile.subscription_status}
          </span>
        </div>
        {subActive ? (
          <p className="mt-3 text-sm text-muted">
            {subPlan
              ? d.planLine
                  .replace("{label}", planLabel(subPlan.id, locale))
                  .replace("{period}", planPeriod(subPlan.id, locale))
              : ""}{" "}
            {profile.subscription_status === "trialing" && trialEnd
              ? d.trialUntil.replace("{date}", trialEnd)
              : periodEnd
                ? d.renewsOn.replace("{date}", periodEnd)
                : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">{d.subscribePrompt}</p>
        )}
        <Link
          href="/subscribe"
          className="mt-4 inline-block rounded-full border border-border px-6 py-2.5 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
        >
          {subActive ? d.manageSubscription : d.viewSubscriptions}
        </Link>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">{d.privacyTitle}</h2>
        <p className="mt-1 text-sm text-muted">{d.privacySubtitle}</p>

        <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium">{d.whatDjSeesTitle}</p>
          <p className="mt-1 text-sm text-muted">{d.whatDjSeesBody}</p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium">{d.rightsTitle}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            <RightItem>{d.rightAccess}</RightItem>
            <RightItem>{d.rightCorrection}</RightItem>
            <RightItem>{d.rightDeletion}</RightItem>
            <RightItem>{d.rightObjection}</RightItem>
            <RightItem>{d.rightPortability}</RightItem>
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/privacy"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
          >
            {d.privacyPolicy}
          </Link>
          <Link
            href="/voorwaarden"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
          >
            {d.terms}
          </Link>
          <Link
            href="/reset-password"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
          >
            {d.changePassword}
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted">
          {d.dataRequestPrefix}{" "}
          <a
            href="mailto:privacy@mygigs.nl"
            className="font-medium text-brand hover:underline"
          >
            privacy@mygigs.nl
          </a>{" "}
          {d.dataRequestSuffix}
        </p>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm font-medium text-red-400">
            {d.deleteAccountTitle}
          </p>
          <p className="mt-1 text-xs text-muted">{d.deleteAccountBody}</p>
          <div className="mt-3">
            <DeleteAccountButton />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">{d.sessionTitle}</h2>
        <p className="mt-1 text-sm text-muted">{d.sessionSubtitle}</p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="h-11 rounded-full border border-border px-6 font-medium transition hover:border-red-500/50 hover:text-red-400"
          >
            {d.signOut}
          </button>
        </form>
      </section>
    </main>
  )
}

function RightItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex-none text-brand">✓</span>
      <span>{children}</span>
    </li>
  )
}
