import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getConversations } from "@/lib/data/messages"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "nu"
  if (min < 60) return `${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}u`
  const d = Math.round(hr / 24)
  return `${d}d`
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/messages")

  const conversations = await getConversations(user.id)

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Berichten</h1>

      {conversations.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-lg font-medium">Nog geen gesprekken</p>
          <p className="mt-2 text-sm text-muted">
            Zodra je een artiest boekt of berichten ontvangt, verschijnen ze
            hier.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-2">
          {conversations.map((c) => {
            const iAmArtist = c.booker_id !== user.id
            const name = iAmArtist
              ? (c.booker?.full_name ?? "Boeker")
              : (c.artist?.stage_name ?? "Artiest")
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40"
              >
                <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-surface-2 text-sm font-semibold text-muted">
                  {!iAmArtist && c.artist?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.artist.avatar_url}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold">{name}</h3>
                    {c.lastMessage && (
                      <span className="flex-none text-xs text-muted">
                        {timeAgo(c.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted">
                    {c.lastMessage?.body ?? "Nog geen berichten"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-black">
                    {c.unread}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
