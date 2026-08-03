import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { getGenres } from "@/lib/data/artists"
import { PROVINCES } from "@/lib/utils/provinces"
import { saveArtistProfile, saveArtistBilling } from "./actions"
import { SyncSocials } from "./sync-button"
import { GenrePicker } from "./genre-picker"
import { MediaManager } from "./media-manager"
import { AvatarUploader } from "./avatar-uploader"
import { ProvinceMap } from "./province-map"
import { EquipmentPicker } from "./equipment-picker"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const { billing: billingStatus } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/profile")

  // Het DJ-profiel is alleen voor goedgekeurde DJ's. Organisatoren moeten eerst
  // een aanvraag doen die een beheerder goedkeurt.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (me?.role !== "artist" && me?.role !== "both") redirect("/dj-aanvraag")

  const { t } = await getI18n()
  const p = t.profile
  const d = t.dashboard

  const [{ data: artist }, genres] = await Promise.all([
    supabase.from("artists").select("*").eq("user_id", user.id).maybeSingle(),
    getGenres(),
  ])

  let selectedGenres: number[] = []
  const rates: Record<string, number> = {}
  let media: { id: string; url: string; kind: string; path: string | null }[] = []
  let billing: {
    invoice_name: string | null
    invoice_address: string | null
    kvk_number: string | null
    vat_number: string | null
    is_vat_registered: boolean
  } | null = null
  if (artist) {
    const [{ data: ag }, { data: pr }, { data: md }, { data: bl }] =
      await Promise.all([
        supabase.from("artist_genres").select("genre_id").eq("artist_id", artist.id),
        supabase
          .from("artist_province_rates")
          .select("province, gage")
          .eq("artist_id", artist.id),
        supabase
          .from("artist_media")
          .select("id, url, kind, path")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("artist_billing")
          .select("invoice_name, invoice_address, kvk_number, vat_number, is_vat_registered")
          .eq("artist_id", artist.id)
          .maybeSingle(),
      ])
    selectedGenres = (ag ?? []).map((r) => r.genre_id)
    for (const r of pr ?? []) rates[r.province] = r.gage
    media = md ?? []
    billing = bl
  }
  // Val terug op de primaire genre_id als er nog geen meervoudige genres zijn.
  if (selectedGenres.length === 0 && artist?.genre_id) {
    selectedGenres = [artist.genre_id]
  }
  const equipmentPrices: Record<string, number> =
    (artist?.equipment_prices as Record<string, number> | null) ?? {}

  // Profielvolledigheid: elke ontbrekende stap kost boekingen. (Verplaatst van
  // het dashboard naar hier, zodat de checklist bij het profiel zelf staat.)
  const hasSocial = !!(
    artist?.instagram_url ||
    artist?.tiktok_url ||
    artist?.spotify_url ||
    artist?.soundcloud_url ||
    artist?.mixcloud_url
  )
  const checks = artist
    ? [
        { label: d.checkPhoto, done: !!artist.avatar_url },
        { label: d.checkBio, done: !!artist.bio },
        { label: d.checkGage, done: artist.base_gage > 0 },
        { label: d.checkGenre, done: selectedGenres.length > 0 },
        { label: d.checkCity, done: !!artist.home_city },
        { label: d.checkSocial, done: hasSocial },
      ]
    : []
  const doneCount = checks.filter((c) => c.done).length
  const completePct = checks.length
    ? Math.round((doneCount / checks.length) * 100)
    : 0
  const missingChecks = checks.filter((c) => !c.done)

  const initials = (artist?.stage_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {artist ? p.titleEdit : p.titleCreate}
      </h1>
      <p className="mt-2 text-sm text-muted">{p.subtitle}</p>

      {artist && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-brand">
            <span className="flex h-2 w-2 rounded-full bg-green-400" />
            {p.liveBadge}
          </div>
          <Link
            href={`/artists/${artist.id}`}
            className="ml-auto rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-black transition hover:bg-brand-strong"
          >
            {p.viewPublic}
          </Link>
        </div>
      )}

      {/* Profielvolledigheid: alleen tonen als nog niet 100%. */}
      {artist && completePct < 100 && (
        <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/5 p-5">
          <p className="font-semibold">{d.completeTitle}</p>
          <p className="mt-0.5 text-sm text-muted">
            {d.completeBody.replace("{pct}", String(completePct))}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${completePct}%` }}
            />
          </div>
          {missingChecks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {missingChecks.map((c) => (
                <span
                  key={c.label}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted"
                >
                  + {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {artist && (
        <div className="mt-6">
          <SyncSocials
            instagramFollowers={artist.instagram_followers ?? 0}
            spotifyFollowers={artist.spotify_followers ?? 0}
            tiktokFollowers={artist.tiktok_followers ?? 0}
          />
        </div>
      )}

      {artist && (
        <section className="mt-8" data-tour="profile-billing">
          <h2 className="text-sm font-medium">{p.billingHeading}</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">{p.billingHint}</p>

          {/* Uitleg KVK-inschrijving + KOR (tijdelijk) bij het opzetten als DJ. */}
          <div className="mb-4 rounded-2xl border border-brand/30 bg-brand/5 p-4 text-xs leading-relaxed text-muted">
            <p className="text-sm font-medium text-foreground">
              {p.kvkInfoTitle}
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              <li>{p.kvkInfo1}</li>
              <li>{p.kvkInfo2}</li>
              <li>{p.kvkInfo3}</li>
            </ul>
            <p className="mt-2.5 italic">{p.kvkInfoDisclaimer}</p>
          </div>

          {billingStatus === "ok" && (
            <div className="mb-3 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm text-green-300">
              {p.billingSaved}
            </div>
          )}
          {billingStatus === "err" && (
            <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {p.billingError}
            </div>
          )}
          <form
            action={saveArtistBilling}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{p.billingName}</span>
              <input
                name="invoice_name"
                defaultValue={billing?.invoice_name ?? ""}
                placeholder={p.billingNamePlaceholder}
                className="input h-10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{p.billingAddress}</span>
              <input
                name="invoice_address"
                defaultValue={billing?.invoice_address ?? ""}
                placeholder={p.billingAddressPlaceholder}
                className="input h-10"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">{p.billingKvk}</span>
                <input
                  name="kvk_number"
                  defaultValue={billing?.kvk_number ?? ""}
                  placeholder="12345678"
                  className="input h-10"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">{p.billingVat}</span>
                <input
                  name="vat_number"
                  defaultValue={billing?.vat_number ?? ""}
                  placeholder="NL000000000B00"
                  className="input h-10"
                />
              </label>
            </div>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                name="is_vat_registered"
                defaultChecked={billing?.is_vat_registered ?? false}
                className="h-4 w-4 accent-brand"
              />
              <span className="text-sm">{p.billingVatRegistered}</span>
            </label>
            <p className="text-xs text-muted">{p.billingKorNote}</p>
            <button
              type="submit"
              className="mt-1 h-11 self-start rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
            >
              {p.billingSave}
            </button>
          </form>
        </section>
      )}

      {artist && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">{p.photoHeading}</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">{p.photoHint}</p>
          <AvatarUploader
            userId={user.id}
            initialUrl={artist.avatar_url}
            initials={initials}
          />
        </section>
      )}

      {artist && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">{p.mediaHeading}</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">{p.mediaHint}</p>
          <MediaManager artistId={artist.id} userId={user.id} initial={media} />
        </section>
      )}

      <form action={saveArtistProfile} className="mt-8 flex flex-col gap-5">
        <Field label={p.djName} required>
          <input
            name="stage_name"
            required
            defaultValue={artist?.stage_name ?? ""}
            placeholder={p.djNamePlaceholder}
            className="input h-11"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={p.province}>
            <select
              name="province"
              defaultValue={artist?.province ?? ""}
              className="input h-11"
            >
              <option value="">{p.chooseProvince}</option>
              {PROVINCES.map((prov) => (
                <option key={prov.name} value={prov.name}>
                  {prov.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={p.homeCity}>
            <input
              name="home_city"
              defaultValue={artist?.home_city ?? ""}
              placeholder={p.homeCityPlaceholder}
              className="input h-11"
            />
          </Field>
        </div>

        <Field label={p.baseGage}>
          <input
            name="base_gage"
            type="number"
            min={0}
            step={50}
            defaultValue={artist?.base_gage ?? 0}
            className="input h-11"
          />
          <span className="text-xs text-muted">{p.baseGageHint}</span>
        </Field>

        {/* Genres — zoek & kies meerdere stijlen */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{p.genresHeading}</legend>
          <GenrePicker genres={genres} initial={selectedGenres} />
        </fieldset>

        {/* Apparatuur — met huurprijs per item */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            {p.equipmentHeading}
          </legend>
          <span className="-mt-1 mb-1 text-xs text-muted">
            {p.equipmentHint}
          </span>
          <EquipmentPicker
            initialItems={artist?.equipment_items ?? []}
            initialPrices={equipmentPrices}
          />
          <input
            name="equipment"
            defaultValue={artist?.equipment ?? ""}
            placeholder={p.equipmentDetailsPlaceholder}
            className="input mt-1 h-11"
          />
        </fieldset>

        {/* Prijs + bereik per provincie */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            {p.pricePerProvinceHeading}
          </legend>
          <span className="-mt-1 text-xs text-muted">
            {p.pricePerProvinceHint}
          </span>
          <div className="mt-2">
            <ProvinceMap initial={rates} />
          </div>
        </fieldset>

        <Field label={p.bio}>
          <textarea
            name="bio"
            rows={4}
            defaultValue={artist?.bio ?? ""}
            placeholder={p.bioPlaceholder}
            className="input py-3"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Instagram">
            <input
              name="instagram_url"
              defaultValue={artist?.instagram_url ?? ""}
              placeholder="https://instagram.com/jouwnaam"
              className="input h-11"
            />
          </Field>
          <Field label="TikTok">
            <input
              name="tiktok_url"
              defaultValue={artist?.tiktok_url ?? ""}
              placeholder="https://tiktok.com/@jouwnaam"
              className="input h-11"
            />
          </Field>
        </div>
        <span className="-mt-2 text-xs text-muted">{p.socialSaveHint}</span>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Spotify">
            <input
              name="spotify_url"
              defaultValue={artist?.spotify_url ?? ""}
              placeholder="https://..."
              className="input h-11"
            />
          </Field>
          <Field label="SoundCloud">
            <input
              name="soundcloud_url"
              defaultValue={artist?.soundcloud_url ?? ""}
              placeholder="https://..."
              className="input h-11"
            />
          </Field>
          <Field label="Mixcloud">
            <input
              name="mixcloud_url"
              defaultValue={artist?.mixcloud_url ?? ""}
              placeholder="https://..."
              className="input h-11"
            />
          </Field>
        </div>

        <button
          type="submit"
          className="mt-2 h-12 rounded-full bg-brand px-6 font-medium text-black transition hover:bg-brand-strong"
        >
          {artist ? p.save : p.create}
        </button>
      </form>
    </main>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      {children}
    </label>
  )
}
