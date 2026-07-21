import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { sendMessage } from "./actions"
import { MarkRead } from "./mark-read"

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ warn?: string }>
}) {
  const { id } = await params
  const { warn } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=/messages/${id}`)

  const { t } = await getI18n()
  const mt = t.messages

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "id, artist_id, booker_id, flagged, artists(stage_name, avatar_url, user_id), profiles!conversations_booker_id_fkey(full_name)",
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
    ? (booker?.full_name ?? mt.fallbackBooker)
    : (artist?.stage_name ?? mt.fallbackDj)

  const { data: messages } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  const list = messages ?? []

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4">
      <MarkRead conversationId={id} />
      <div className="flex items-center gap-3 border-b border-border py-4">
        <Link
          href="/messages"
          className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold">{otherName}</h1>
      </div>

      {warn === "contact" && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {mt.warnContact}
        </div>
      )}
      {conv.flagged && warn !== "contact" && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {mt.flaggedNotice}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-5">
        {list.length === 0 ? (
          <p className="m-auto text-sm text-muted">{mt.startConversation}</p>
        ) : (
          list.map((m) => {
            const mine = m.sender_id === user.id
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

      <form
        action={sendMessage}
        className="flex items-center gap-2 border-t border-border py-3"
      >
        <input type="hidden" name="conversation_id" value={id} />
        <input
          name="body"
          required
          autoComplete="off"
          placeholder={mt.inputPlaceholder}
          className="input h-11 flex-1"
        />
        <button
          type="submit"
          className="h-11 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
        >
          {mt.send}
        </button>
      </form>
      <p className="pb-3 text-center text-[11px] text-muted">{mt.footerNote}</p>
    </div>
  )
}
