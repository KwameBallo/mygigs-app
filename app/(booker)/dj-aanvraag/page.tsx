import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { applyForDj } from "./actions"

export default async function DjAanvraagPage() {
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
      <h1 className="text-3xl font-semibold tracking-tight">DJ worden</h1>
      <p className="mt-2 text-muted">
        Wil je als DJ optredens ontvangen via MyGigs? Dien een aanvraag in — een
        beheerder beoordeelt deze. Na goedkeuring maak je je DJ-profiel aan.
      </p>

      {status === "pending" ? (
        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-300">
          Je aanvraag is <strong>in behandeling</strong>. Zodra een beheerder
          deze goedkeurt, kun je je DJ-profiel aanmaken en boekingen ontvangen.
          Je krijgt hier bericht van.
        </div>
      ) : (
        <>
          {status === "rejected" && (
            <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-300">
              Je vorige aanvraag is afgewezen. Je kunt opnieuw indienen met meer
              toelichting.
            </div>
          )}
          <ApplyForm />
        </>
      )}
    </main>
  )
}

function ApplyForm() {
  return (
    <form
      action={applyForDj}
      className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Motivatie (optioneel)</span>
        <textarea
          name="motivation"
          rows={4}
          placeholder="Vertel kort over je ervaring, stijl en apparatuur..."
          className="input resize-none"
        />
      </label>
      <button
        type="submit"
        className="self-start rounded-full bg-brand px-6 py-3 font-medium text-black transition hover:bg-brand-strong"
      >
        Aanvraag versturen
      </button>
      <p className="text-xs text-muted">
        Na goedkeuring word je DJ en kun je je profiel aanmaken. Je kunt daarnaast
        gewoon evenementen blijven boeken.
      </p>
    </form>
  )
}
