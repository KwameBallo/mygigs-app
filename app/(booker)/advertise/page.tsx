import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getMyAds, AD_PLACEMENTS } from "@/lib/data/ads"
import { formatEuro } from "@/lib/utils/pricing"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { createAd, toggleAd, deleteAd } from "./actions"
import { dict } from "./i18n"

export default async function AdvertisePage() {
  const { locale } = await getI18n()
  const d = dict[locale]

  const placementText: Record<string, string> = {
    events_top: d.placementEventsTop,
    event_detail: d.placementEventDetail,
    discover: d.placementDiscover,
    sidebar: d.placementSidebar,
  }
  const labelFor = (value: string) => placementText[value] ?? value

  const profile = await getProfile()
  if (!profile) redirect("/login?next=/advertise")

  const isArtist = profile.role === "artist" || profile.role === "both"

  // Artiesten promoten hun eigen profiel: naam + link vooraf invullen.
  let artist: { id: string; stage_name: string } | null = null
  if (isArtist) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("artists")
      .select("id, stage_name")
      .eq("user_id", profile.id)
      .maybeSingle()
    artist = data
  }

  const ads = await getMyAds(profile.id)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">{d.heading}</h1>
      {isArtist ? (
        <p className="mt-1 text-sm text-muted">{d.introArtist}</p>
      ) : (
        <p className="mt-1 text-sm text-muted">{d.introBrand}</p>
      )}

      {/* Tarieven */}
      <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">{d.rates}</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {AD_PLACEMENTS.map((p) => (
            <li
              key={p.value}
              className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5 text-sm"
            >
              <span className="text-muted">{labelFor(p.value)}</span>
              <span className="font-medium">
                {formatEuro(p.price)}
                <span className="text-xs font-normal text-muted">
                  {" "}
                  {d.perWeek}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Nieuwe advertentie */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted">{d.newAd}</h2>
        <form
          action={createAd}
          className="mt-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
        >
          <Field label={isArtist ? d.labelNameArtist : d.labelNameBrand}>
            <input
              name="brand_name"
              required
              defaultValue={isArtist ? (artist?.stage_name ?? "") : ""}
              className="input h-10 w-full"
            />
          </Field>
          <Field label={d.labelPlacement}>
            <select
              name="placement"
              defaultValue={isArtist ? "discover" : "events_top"}
              className="input h-10 w-full"
            >
              {AD_PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {labelFor(p.value)} — {formatEuro(p.price)}
                  {d.perWeek}
                </option>
              ))}
            </select>
          </Field>
          <Field label={d.labelSlogan} className="sm:col-span-2">
            <input
              name="title"
              defaultValue={isArtist && artist ? d.defaultTitle : ""}
              className="input h-10 w-full"
            />
          </Field>
          <Field label={d.labelImage} className="sm:col-span-2">
            <input name="image_url" className="input h-10 w-full" />
          </Field>
          <Field
            label={isArtist ? d.labelTargetArtist : d.labelTargetBrand}
            className="sm:col-span-2"
          >
            <input
              name="target_url"
              defaultValue={artist ? `/artists/${artist.id}` : ""}
              className="input h-10 w-full"
            />
          </Field>
          <Field label={d.labelStart}>
            <input name="starts_at" type="date" className="input h-10 w-full" />
          </Field>
          <Field label={d.labelEnd}>
            <input name="ends_at" type="date" className="input h-10 w-full" />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
            >
              {d.submit}
            </button>
          </div>
        </form>
      </section>

      {/* Mijn advertenties */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">{d.myAds}</h2>
        {ads.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{d.emptyAds}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {ads.map((ad) => (
              <li
                key={ad.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {ad.brand_name}
                    {ad.title ? (
                      <span className="font-normal text-muted">
                        {" "}
                        — {ad.title}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {labelFor(ad.placement)} ·{" "}
                    {ad.active ? (
                      <span className="text-brand">{d.active}</span>
                    ) : (
                      d.paused
                    )}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <form action={toggleAd}>
                    <input type="hidden" name="ad_id" value={ad.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={String(ad.active)}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                    >
                      {ad.active ? d.pause : d.activate}
                    </button>
                  </form>
                  <form action={deleteAd}>
                    <input type="hidden" name="ad_id" value={ad.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-500/50 hover:text-red-400"
                    >
                      {d.delete}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}
