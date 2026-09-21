import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getI18n } from "@/lib/i18n"
import { checkAdmin } from "../guard"
import { reextractLead, rejectLead, reopenLead, saveLead } from "../actions"
import { SubmitButton } from "../submit-button"
import { dict } from "../i18n"
import { AdminHeader, Flash, Panel, StatusPill, sourceLabel } from "../ui"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Eén aanmelding: links wat er binnenkwam, rechts de velden om na te kijken.

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ msg?: string }>
}) {
  const check = await checkAdmin()
  if (!check.ok) redirect(check.reason === "mfa" ? "/admin/mfa" : "/admin/login")

  const { id } = await params
  const { msg } = await searchParams
  if (!UUID_RE.test(id)) notFound()

  const { locale } = await getI18n()
  const d = dict[locale]
  const dateLocale = locale === "nl" ? "nl-NL" : "en-GB"

  const service = createAdminClient()
  const [{ data: lead }, { data: genreRows }] = await Promise.all([
    service.from("dj_leads").select("*").eq("id", id).maybeSingle(),
    service.from("genres").select("name").order("name"),
  ])
  if (!lead) notFound()
  const allGenres = (genreRows ?? []).map((g) => g.name)

  // Bestaat deze DJ misschien al? Op Instagram-naam of artiestennaam.
  const lookups = []
  if (lead.instagram_handle) {
    lookups.push(
      service
        .from("artists")
        .select("id, stage_name, home_city")
        .ilike("instagram_handle", escapeLike(lead.instagram_handle))
        .limit(3),
    )
  }
  if (lead.stage_name) {
    lookups.push(
      service
        .from("artists")
        .select("id, stage_name, home_city")
        .ilike("stage_name", escapeLike(lead.stage_name))
        .limit(3),
    )
  }
  const matches = new Map<string, { id: string; stage_name: string; home_city: string | null }>()
  for (const r of await Promise.all(lookups)) {
    for (const a of r.data ?? []) matches.set(a.id, a)
  }

  const editable = lead.status === "new" || lead.status === "reviewing"
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
  const by = lead.extracted_by ?? ""
  const readBy =
    by === "ai"
      ? d.readByAi
      : by.startsWith("heuristic")
        ? d.readByHeuristic
        : by === "admin"
          ? d.readByAdmin
          : null
  // "heuristic: <reden>" betekent dat de AI niet meedeed. De reden tonen we.
  const aiProblem = by.startsWith("heuristic: ") ? by.slice("heuristic: ".length) : null

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AdminHeader d={d} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Link href="/admin/aanmeldingen" className="text-sm text-muted hover:text-foreground">
          ← {d.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.stage_name || d.noName}
          </h1>
          <StatusPill status={lead.status} d={d} />
        </div>

        <Flash msg={msg} d={d} />

        {!lead.self_submitted && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <p className="font-medium">{d.avgTitle}</p>
            <p className="mt-1 text-amber-200/80">{d.avgBody}</p>
          </div>
        )}

        {matches.size > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
            <p className="font-medium">{d.existsTitle}</p>
            <ul className="mt-1 text-muted">
              {[...matches.values()].map((a) => (
                <li key={a.id}>
                  <Link href={`/artists/${a.id}`} className="text-brand hover:underline">
                    {a.stage_name}
                  </Link>
                  {a.home_city ? `, ${a.home_city}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Links: het origineel */}
          <Panel title={d.rawTitle} className="h-fit">
            <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">{d.rawReceived}</dt>
              <dd>{fmt(lead.received_at)} · {sourceLabel(lead.source, d)}</dd>
              {lead.raw_from && (
                <>
                  <dt className="text-muted">{d.rawFrom}</dt>
                  <dd className="break-all">{lead.raw_from}</dd>
                </>
              )}
              {lead.raw_subject && (
                <>
                  <dt className="text-muted">{d.rawSubject}</dt>
                  <dd>{lead.raw_subject}</dd>
                </>
              )}
              {lead.source_note && (
                <>
                  <dt className="text-muted">{d.rawSourceNote}</dt>
                  <dd className="break-all">{lead.source_note}</dd>
                </>
              )}
              {readBy && (
                <>
                  <dt className="text-muted">{d.rawReadBy}</dt>
                  <dd>{readBy}</dd>
                </>
              )}
            </dl>
            {aiProblem && (
              <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <p className="font-medium">{d.aiOffTitle}</p>
                <p className="mt-0.5 break-words text-amber-200/80">{aiProblem}</p>
              </div>
            )}
            {/* Tekst van een onbekende afzender: als platte tekst tonen, nooit als HTML. */}
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-3 font-mono text-sm leading-relaxed">
              {lead.raw_text}
            </pre>
            {editable && lead.raw_text && (
              <form action={reextractLead} className="mt-3">
                <input type="hidden" name="id" value={lead.id} />
                <SubmitButton
                  busyText={d.reextractBusy}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-brand/50"
                >
                  {d.reextractBtn}
                </SubmitButton>
                <p className="mt-1.5 text-xs text-muted">{d.reextractHint}</p>
              </form>
            )}
          </Panel>

          {/* Rechts: de velden */}
          <div className="flex flex-col gap-4">
            <Panel title={d.fieldsTitle}>
              <form action={saveLead} className="flex flex-col gap-4">
                <input type="hidden" name="id" value={lead.id} />
                <fieldset disabled={!editable} className="flex flex-col gap-4 disabled:opacity-70">
                  <Field label={d.fStageName} name="stage_name" value={lead.stage_name} max={120} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={d.fEmail} name="email" type="email" value={lead.email} max={320} />
                    <Field label={d.fCity} name="home_city" value={lead.home_city} max={120} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={d.fGage}
                      name="base_gage"
                      inputMode="decimal"
                      value={lead.base_gage != null ? String(lead.base_gage) : null}
                      max={12}
                    />
                    <Field
                      label={d.fInstagram}
                      name="instagram_handle"
                      value={lead.instagram_handle}
                      max={60}
                      prefix="@"
                    />
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">{d.fBio}</span>
                    <textarea
                      name="bio"
                      rows={5}
                      maxLength={4000}
                      defaultValue={lead.bio ?? ""}
                      className="input resize-y"
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={d.fSoundcloud} name="soundcloud_url" value={lead.soundcloud_url} max={500} />
                    <Field label={d.fMixcloud} name="mixcloud_url" value={lead.mixcloud_url} max={500} />
                    <Field label={d.fSpotify} name="spotify_url" value={lead.spotify_url} max={500} />
                    <Field label={d.fWebsite} name="website_url" value={lead.website_url} max={500} />
                  </div>

                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">{d.fGenres}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {allGenres.map((g) => (
                        <label key={g} className="cursor-pointer">
                          <input
                            type="checkbox"
                            name="genres"
                            value={g}
                            defaultChecked={lead.genres.includes(g)}
                            className="peer sr-only"
                          />
                          <span className="inline-block rounded-full border border-border px-2.5 py-1 text-xs transition peer-checked:border-brand peer-checked:bg-brand/15 peer-checked:text-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                            {g}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </fieldset>

                {editable && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        name="intent"
                        value="save"
                        className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:border-brand/50"
                      >
                        {d.saveBtn}
                      </button>
                      <button
                        type="submit"
                        name="intent"
                        value="approve"
                        className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-black transition hover:bg-brand-strong"
                      >
                        {d.approveBtn}
                      </button>
                    </div>
                    <p className="text-xs text-muted">{d.approveHint}</p>
                  </>
                )}
              </form>
            </Panel>

            {editable && (
              <Panel title={d.rejectTitle}>
                <form action={rejectLead} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="id" value={lead.id} />
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-medium">{d.rejectLabel}</span>
                    <input
                      name="reject_reason"
                      required
                      maxLength={500}
                      placeholder={d.rejectPlaceholder}
                      className="input"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-red-500/50 px-5 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                  >
                    {d.rejectBtn}
                  </button>
                </form>
              </Panel>
            )}

            {(lead.status === "rejected" || lead.status === "approved") && (
              <Panel title={statusText(lead.status, d)}>
                {lead.reject_reason && <p className="mb-2 text-sm">{lead.reject_reason}</p>}
                {lead.reviewed_at && (
                  <p className="mb-3 text-xs text-muted">
                    {d.reviewedBy} {fmt(lead.reviewed_at)}
                  </p>
                )}
                <form action={reopenLead}>
                  <input type="hidden" name="id" value={lead.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:border-brand/50"
                  >
                    {d.reopenBtn}
                  </button>
                </form>
              </Panel>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// % en _ zijn jokertekens in een LIKE-zoekopdracht. Letterlijk zoeken.
function escapeLike(v: string) {
  return v.replace(/[%_\\]/g, "\\$&")
}

function statusText(s: "rejected" | "approved", d: (typeof dict)["nl"]) {
  return s === "rejected" ? d.statusRejected : d.statusApproved
}

function Field({
  label,
  name,
  value,
  max,
  type = "text",
  inputMode,
  prefix,
}: {
  label: string
  name: string
  value: string | null
  max: number
  type?: string
  inputMode?: "decimal" | "text"
  prefix?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {prefix}
          </span>
        )}
        <input
          name={name}
          type={type}
          inputMode={inputMode}
          maxLength={max}
          defaultValue={value ?? ""}
          className={`input w-full ${prefix ? "pl-7" : ""}`}
        />
      </span>
    </label>
  )
}
