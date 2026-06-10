import Link from "next/link"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { PLANS, hasActiveSubscription } from "@/lib/subscriptions"
import {
  ARTIST_COMMISSION_RATE,
  SUPPLIER_COMMISSION_RATE,
  formatPercent,
} from "@/lib/utils/pricing"
import { roleLabel } from "@/lib/roles"
import { updateAccount, updateCompanyDetails } from "./actions"

const SUB_STATUS_LABEL: Record<string, string> = {
  inactive: "Geen abonnement",
  trialing: "Proefperiode",
  active: "Actief",
  past_due: "Betaling mislukt",
  canceled: "Opgezegd",
}

export default async function SettingsPage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/settings")

  const subActive = hasActiveSubscription(profile.subscription_status)
  const subPlan = profile.subscription_plan
    ? PLANS[profile.subscription_plan as keyof typeof PLANS]
    : null
  const periodEnd = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString(
        "nl-NL",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : null
  const trialEnd = profile.subscription_trial_end
    ? new Date(profile.subscription_trial_end).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Instellingen</h1>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <form action={updateAccount} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Naam</span>
            <input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Je naam"
              className="input h-11"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">E-mail</span>
            <input
              value={profile.email ?? ""}
              disabled
              className="input h-11 opacity-60"
            />
          </label>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Rol:</span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">
              {roleLabel(profile.role)}
            </span>
          </div>
          <button
            type="submit"
            className="mt-1 h-11 self-start rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
          >
            Opslaan
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Bedrijfsgegevens</h2>
        <p className="mt-1 text-sm text-muted">
          Sla je factuurgegevens eenmalig op. Bij een zakelijke boeking vullen we
          ze automatisch voor je in.
        </p>
        <form
          action={updateCompanyDetails}
          className="mt-4 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Bedrijfsnaam</span>
            <input
              name="company_name"
              defaultValue={profile.company_name ?? ""}
              placeholder="Bedrijf B.V."
              className="input h-11"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">BTW-nummer</span>
              <input
                name="vat_number"
                defaultValue={profile.vat_number ?? ""}
                placeholder="NL000000000B00"
                className="input h-11"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Factuur-e-mail</span>
              <input
                name="invoice_email"
                type="email"
                defaultValue={profile.invoice_email ?? ""}
                placeholder="factuur@bedrijf.nl"
                className="input h-11"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Factuuradres</span>
            <input
              name="invoice_address"
              defaultValue={profile.invoice_address ?? ""}
              placeholder="Straat 1, 1234 AB Amsterdam"
              className="input h-11"
            />
          </label>
          <button
            type="submit"
            className="mt-1 h-11 self-start rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
          >
            Opslaan
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Organisatorenabonnement</h2>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span>Status:</span>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              subActive
                ? "bg-brand/10 text-brand"
                : "bg-surface-2 text-foreground"
            }`}
          >
            {SUB_STATUS_LABEL[profile.subscription_status] ??
              profile.subscription_status}
          </span>
        </div>
        {subActive ? (
          <p className="mt-3 text-sm text-muted">
            {subPlan ? `${subPlan.label} (${subPlan.period}).` : ""}{" "}
            {profile.subscription_status === "trialing" && trialEnd
              ? `Proefperiode tot ${trialEnd}.`
              : periodEnd
                ? `Verlengt op ${periodEnd}.`
                : ""}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Sluit een abonnement af om als club of organisator events te
            plaatsen. Start met een gratis proefperiode.
          </p>
        )}
        <Link
          href="/subscribe"
          className="mt-4 inline-block rounded-full border border-border px-6 py-2.5 text-sm font-medium transition hover:border-brand/50 hover:text-brand"
        >
          {subActive ? "Abonnement beheren" : "Bekijk abonnementen"}
        </Link>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Verdienmodel</h2>
        <p className="mt-1 text-sm text-muted">
          Zo verdient MyGigs aan de verschillende partijen.
        </p>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <FeeRow label="Clubs & organisatoren" value="Abonnement" />
          <FeeRow
            label="DJ's"
            value={`${formatPercent(ARTIST_COMMISSION_RATE)} commissie per boeking`}
          />
          <FeeRow
            label="Leveranciers"
            value={`${formatPercent(SUPPLIER_COMMISSION_RATE)} commissie`}
          />
          <FeeRow label="Drankmerken" value="Advertentiekosten" />
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Sessie</h2>
        <p className="mt-1 text-sm text-muted">
          Log uit op dit apparaat.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="h-11 rounded-full border border-border px-6 font-medium transition hover:border-red-500/50 hover:text-red-400"
          >
            Uitloggen
          </button>
        </form>
      </section>
    </main>
  )
}

function FeeRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </li>
  )
}
