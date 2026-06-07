import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatEuro } from "@/lib/utils/pricing"
import { sendMessage, sendOffer, respondToOffer } from "./actions"

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/messages/${id}`)

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, artist_id, booker_id, artists(stage_name, avatar_url, user_id), profiles!conversations_booker_id_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle()

  if (!conv) notFound()

  const artist = conv.artists as {
    stage_name: string
    avatar_url: string | null
    user_id: string
  } | null
  const booker = conv.profiles as { full_name: string | null } | null

  const iAmArtist = conv.booker_id !== user.id
  const allowed = conv.booker_id === user.id || artist?.user_id === user.id
  if (!allowed) notFound()

  const otherName = iAmArtist
    ? (booker?.full_name ?? "Boeker")
    : (artist?.stage_name ?? "Artiest")

  // Mark incoming messages as read.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .is("read_at", null)
    .neq("sender_id", user.id)

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, body, sender_id, created_at, offer_amount, offer_event_date, offer_status",
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  const list = messages ?? []

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4">
      <div className="flex items-center gap-3 border-b border-border py-4">
        <Link
          href="/messages"
          className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold">{otherName}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-5">
        {list.length === 0 ? (
          <p className="m-auto text-sm text-muted">
            Begin het gesprek. Stuur je eerste bericht.
          </p>
        ) : (
          list.map((m) => {
            const mine = m.sender_id === user.id
            if (m.offer_amount != null) {
              return (
                <OfferCard
                  key={m.id}
                  id={m.id}
                  amount={m.offer_amount}
                  eventDate={m.offer_event_date}
                  status={m.offer_status}
                  mine={mine}
                  canRespond={!iAmArtist}
                />
              )
            }
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "self-end bg-brand text-black"
                    : "self-start border border-border bg-surface"
                }`}
              >
                {m.body}
              </div>
            )
          })
        )}
      </div>

      {iAmArtist && (
        <details className="border-t border-border py-3">
          <summary className="cursor-pointer text-sm font-medium text-brand">
            Doe een bod
          </summary>
          <form
            action={sendOffer}
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="conversation_id" value={id} />
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted">Bedrag (euro)</span>
              <input
                name="amount"
                type="number"
                min="1"
                required
                placeholder="500"
                className="input h-11"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted">Datum</span>
              <input name="event_date" type="date" required className="input h-11" />
            </label>
            <button
              type="submit"
              className="h-11 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
            >
              Verstuur bod
            </button>
          </form>
        </details>
      )}

      <form
        action={sendMessage}
        className="flex items-center gap-2 border-t border-border py-3"
      >
        <input type="hidden" name="conversation_id" value={id} />
        <input
          name="body"
          required
          autoComplete="off"
          placeholder="Typ een bericht..."
          className="input h-11 flex-1"
        />
        <button
          type="submit"
          className="h-11 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
        >
          Stuur
        </button>
      </form>
    </div>
  )
}

const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: "In afwachting",
  accepted: "Geaccepteerd",
  declined: "Afgewezen",
}

function OfferCard({
  id,
  amount,
  eventDate,
  status,
  mine,
  canRespond,
}: {
  id: string
  amount: number
  eventDate: string | null
  status: string | null
  mine: boolean
  canRespond: boolean
}) {
  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null
  const pending = status === "pending"

  return (
    <div
      className={`max-w-[80%] rounded-2xl border p-4 text-sm ${
        mine ? "self-end" : "self-start"
      } ${
        status === "accepted"
          ? "border-brand/50 bg-brand/5"
          : status === "declined"
            ? "border-border bg-surface opacity-70"
            : "border-brand/40 bg-surface"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Bod
      </p>
      <p className="mt-1 text-lg font-semibold">{formatEuro(amount)}</p>
      {dateLabel && <p className="text-muted">Datum: {dateLabel}</p>}
      <p className="mt-1 text-xs text-muted">
        {OFFER_STATUS_LABEL[status ?? "pending"] ?? status}
      </p>

      {canRespond && pending && (
        <div className="mt-3 flex gap-2">
          <form action={respondToOffer}>
            <input type="hidden" name="message_id" value={id} />
            <input type="hidden" name="decision" value="accept" />
            <button
              type="submit"
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-black transition hover:bg-brand-strong"
            >
              Accepteren
            </button>
          </form>
          <form action={respondToOffer}>
            <input type="hidden" name="message_id" value={id} />
            <input type="hidden" name="decision" value="decline" />
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium transition hover:border-red-500/50 hover:text-red-400"
            >
              Afwijzen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
