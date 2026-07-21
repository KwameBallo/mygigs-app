import Link from "next/link"
import { redirect } from "next/navigation"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"

export default async function EarningsPage() {
  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const PAYOUT_LABEL: Record<string, string> = {
    scheduled: d.statusScheduled,
    paid: d.statusPaid,
    failed: d.statusFailed,
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/earnings")

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!artist) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
        <p className="mt-3 text-muted">{d.noProfile}</p>
        <Link
          href="/profile"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black"
        >
          {d.toProfile}
        </Link>
      </main>
    )
  }

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, status, created_at")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false })

  const list = payouts ?? []
  const paid = list
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0)
  const scheduled = list
    .filter((p) => p.status === "scheduled")
    .reduce((s, p) => s + p.amount, 0)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">{d.paidOut}</p>
          <p className="mt-1 text-2xl font-semibold text-brand">
            {formatEuro(paid)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">{d.onTheWay}</p>
          <p className="mt-1 text-2xl font-semibold">{formatEuro(scheduled)}</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">{d.payouts}</h2>
        {list.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
            {d.emptyPayouts}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {list.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="font-semibold">{formatEuro(p.amount)}</p>
                  <p className="text-xs text-muted">
                    {new Date(p.created_at).toLocaleDateString(dateLocale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
                  {PAYOUT_LABEL[p.status] ?? p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
