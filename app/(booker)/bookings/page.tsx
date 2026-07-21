import Link from "next/link"
import { redirect } from "next/navigation"
import { StatusBadge } from "@/lib/utils/status"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { cancelBooking } from "./actions"
import { openBookingChat } from "@/lib/actions/chat"

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ shortlist?: string; created?: string; paid?: string }>
}) {
  const { shortlist, paid } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/bookings")

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, artists(stage_name, avatar_url)")
    .eq("booker_id", user.id)
    .order("event_date", { ascending: false })

  const list = bookings ?? []
  const { locale, t } = await getI18n()
  const m = t.myBookings
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{m.title}</h1>

        {shortlist === "1" && (
          <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/10 p-4 text-sm text-brand">
            {m.shortlistBanner}
          </div>
        )}

        {paid === "1" && (
          <div className="mt-6 rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300">
            {m.paidBanner}
          </div>
        )}

        {list.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-lg font-medium">{m.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted">{m.emptyBody}</p>
            <Link
              href="/discover"
              className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 font-medium text-black transition hover:bg-brand-strong"
            >
              {m.emptyCta}
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {list.map((b) => {
              const artist = b.artists as {
                stage_name: string
                avatar_url: string | null
              } | null
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">
                        {artist?.stage_name ?? "DJ"}
                      </h3>
                      <StatusBadge status={b.status} />
                      <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                        {b.booking_type === "zakelijk" ? m.business : m.private}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(b.event_date).toLocaleDateString(dateLocale, {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {b.city ? ` · ${b.city}` : ""}
                      {b.venue_name ? ` · ${b.venue_name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-lg font-semibold text-brand">
                      {formatEuro(b.total)}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {b.booking_type === "zakelijk" && (
                        <Link
                          href={`/bookings/${b.id}/invoice`}
                          className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition hover:border-brand/50 hover:text-foreground"
                        >
                          {m.invoice}
                        </Link>
                      )}
                      {/* Na acceptatie: chatten voor meer info. */}
                      {(b.status === "accepted" || b.status === "paid") && (
                        <form action={openBookingChat}>
                          <input type="hidden" name="booking_id" value={b.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition hover:border-brand/50 hover:text-foreground"
                          >
                            {m.chat}
                          </button>
                        </form>
                      )}
                      {/* Geaccepteerd → naar het betaalscherm (escrow bij MyGigs). */}
                      {b.status === "accepted" && (
                        <Link
                          href={`/bookings/${b.id}/pay`}
                          className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-black transition hover:bg-brand-strong"
                        >
                          {m.pay}
                        </Link>
                      )}
                      {(b.status === "pending" || b.status === "accepted") && (
                        <form action={cancelBooking}>
                          <input type="hidden" name="booking_id" value={b.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition hover:border-red-400/50 hover:text-red-400"
                          >
                            {m.cancel}
                          </button>
                        </form>
                      )}
                    </div>
                    {b.status === "paid" && (
                      <span className="text-xs text-green-400">{m.paidNote}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </main>
  )
}
