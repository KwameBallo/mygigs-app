import { redirect } from "next/navigation"
import { getProfile } from "@/lib/auth"
import { getMyAds, AD_PLACEMENTS, placementLabel } from "@/lib/data/ads"
import { createAd, toggleAd, deleteAd } from "./actions"

export default async function AdvertisePage() {
  const profile = await getProfile()
  if (!profile) redirect("/login?next=/advertise")

  const ads = await getMyAds(profile.id)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Adverteren</h1>
      <p className="mt-1 text-sm text-muted">
        Plaats als merk een banner op de agenda en eventpagina&apos;s. Bereik
        bezoekers die op zoek zijn naar feesten en artiesten.
      </p>

      {/* Nieuwe advertentie */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-muted">Nieuwe advertentie</h2>
        <form
          action={createAd}
          className="mt-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2"
        >
          <Field label="Merknaam *">
            <input name="brand_name" required className="input h-10 w-full" />
          </Field>
          <Field label="Plek">
            <select name="placement" className="input h-10 w-full">
              {AD_PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Slogan / tekst" className="sm:col-span-2">
            <input name="title" className="input h-10 w-full" />
          </Field>
          <Field label="Afbeelding-URL (banner)" className="sm:col-span-2">
            <input name="image_url" className="input h-10 w-full" />
          </Field>
          <Field label="Doel-URL (klik)" className="sm:col-span-2">
            <input name="target_url" className="input h-10 w-full" />
          </Field>
          <Field label="Start (optioneel)">
            <input name="starts_at" type="date" className="input h-10 w-full" />
          </Field>
          <Field label="Einde (optioneel)">
            <input name="ends_at" type="date" className="input h-10 w-full" />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="h-10 rounded-full bg-brand px-5 font-medium text-black transition hover:bg-brand-strong"
            >
              Advertentie plaatsen
            </button>
          </div>
        </form>
      </section>

      {/* Mijn advertenties */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted">Mijn advertenties</h2>
        {ads.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nog geen advertenties geplaatst.
          </p>
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
                    {placementLabel(ad.placement)} ·{" "}
                    {ad.active ? (
                      <span className="text-brand">actief</span>
                    ) : (
                      "gepauzeerd"
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
                      {ad.active ? "Pauzeer" : "Activeer"}
                    </button>
                  </form>
                  <form action={deleteAd}>
                    <input type="hidden" name="ad_id" value={ad.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-red-500/50 hover:text-red-400"
                    >
                      Verwijder
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
