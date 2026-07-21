import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getI18n } from "@/lib/i18n"
import { getGenres } from "@/lib/data/artists"
import { PROVINCES } from "@/lib/utils/provinces"
import { saveArtistProfile } from "./actions"
import { SyncSocials } from "./sync-button"
import { GenrePicker } from "./genre-picker"
import { MediaManager } from "./media-manager"
import { AvatarUploader } from "./avatar-uploader"
import { ProvinceMap } from "./province-map"
import { EquipmentPicker } from "./equipment-picker"

export default async function ProfilePage() {
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

  const [{ data: artist }, genres] = await Promise.all([
    supabase.from("artists").select("*").eq("user_id", user.id).maybeSingle(),
    getGenres(),
  ])

  let selectedGenres: number[] = []
  const rates: Record<string, number> = {}
  let media: { id: string; url: string; kind: string; path: string | null }[] = []
  if (artist) {
    const [{ data: ag }, { data: pr }, { data: md }] = await Promise.all([
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
    ])
    selectedGenres = (ag ?? []).map((r) => r.genre_id)
    for (const r of pr ?? []) rates[r.province] = r.gage
    media = md ?? []
  }
  // Val terug op de primaire genre_id als er nog geen meervoudige genres zijn.
  if (selectedGenres.length === 0 && artist?.genre_id) {
    selectedGenres = [artist.genre_id]
  }
  const equipmentPrices: Record<string, number> =
    (artist?.equipment_prices as Record<string, number> | null) ?? {}
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
