import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { dict } from "./i18n"
import { applyForDj } from "./actions"

export default async function DjAanvraagPage() {
  const { locale } = await getI18n()
  const d = dict[locale]
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/dj-aanvraag")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role === "artist" || profile?.role === "both") redirect("/profile")

  const { data: application } = await supabase
    .from("dj_applications")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle()
  const status = application?.status ?? null

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
      <p className="mt-2 text-muted">{d.intro}</p>

      {status === "pending" ? (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-300">
          {d.pendingBefore}
          <strong>{d.pendingStrong}</strong>
          {d.pendingAfter}
        </div>
      ) : (
        <>
          {status === "rejected" && (
            <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-300">
              {d.rejectedNotice}
            </div>
          )}
          <ApplyForm d={d} />
        </>
      )}
    </main>
  )
}

function ApplyForm({ d }: { d: (typeof dict)["nl"] }) {
  return (
    <form
      action={applyForDj}
      className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{d.motivationLabel}</span>
        <textarea
          name="motivation"
          rows={4}
          placeholder={d.motivationPlaceholder}
          className="input resize-none"
        />
      </label>
      <button
        type="submit"
        className="self-start rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
      >
        {d.submit}
      </button>
      <p className="text-xs text-muted">{d.formHint}</p>
    </form>
  )
}
