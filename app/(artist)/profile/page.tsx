import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getGenres } from "@/lib/data/artists"
import { PROVINCES } from "@/lib/utils/provinces"
import { saveArtistProfile } from "./actions"
import { SyncSocials } from "./sync-button"
import { GenrePicker } from "./genre-picker"
import { MediaManager } from "./media-manager"

const EQUIPMENT = ["Microfoon", "Draaitafel", "Speakers", "Verlichting", "Bass"]

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/profile")

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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {artist ? "Mijn profiel" : "Maak je DJ-profiel"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Dit is wat boekers zien en waarop ze filteren.
      </p>

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
          <h2 className="text-sm font-medium">Foto&apos;s &amp; video&apos;s</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">
            Laat boekers je sfeer zien — voeg foto&apos;s en korte video&apos;s
            van je sets toe.
          </p>
          <MediaManager artistId={artist.id} userId={user.id} initial={media} />
        </section>
      )}

      <form action={saveArtistProfile} className="mt-8 flex flex-col gap-5">
        <Field label="DJ-naam" required>
          <input
            name="stage_name"
            required
            defaultValue={artist?.stage_name ?? ""}
            placeholder="DJ Voorbeeld"
            className="input h-11"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Provincie (thuisbasis)">
            <select
              name="province"
              defaultValue={artist?.province ?? ""}
              className="input h-11"
            >
              <option value="">Kies provincie</option>
              {PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Woonplaats (optioneel)">
            <input
              name="home_city"
              defaultValue={artist?.home_city ?? ""}
              placeholder="Amsterdam"
              className="input h-11"
            />
          </Field>
        </div>

        <Field label="Richtprijs / basis gage (€)">
          <input
            name="base_gage"
            type="number"
            min={0}
            step={50}
            defaultValue={artist?.base_gage ?? 0}
            className="input h-11"
          />
          <span className="text-xs text-muted">
            Wordt gebruikt als voorstel; per provincie stel je hieronder je
            precieze bedrag in.
          </span>
        </Field>

        {/* Genres — zoek & kies meerdere stijlen */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Genres / stijlen</legend>
          <GenrePicker genres={genres} initial={selectedGenres} />
        </fieldset>

        {/* Apparatuur */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            Apparatuur die je meeneemt
          </legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((item) => (
              <label
                key={item}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm transition has-[:checked]:border-brand has-[:checked]:bg-brand/10"
              >
                <input
                  type="checkbox"
                  name="equipment_items"
                  value={item}
                  defaultChecked={(artist?.equipment_items ?? []).includes(item)}
                  className="accent-brand"
                />
                {item}
              </label>
            ))}
          </div>
          <input
            name="equipment"
            defaultValue={artist?.equipment ?? ""}
            placeholder="Details (optioneel): bv. Pioneer CDJ-3000, DJM-900"
            className="input h-11"
          />
        </fieldset>

        {/* Prijs + bereik per provincie */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">
            Prijs per provincie
          </legend>
          <span className="-mt-1 text-xs text-muted">
            Vink de provincies aan waar je optreedt en zet je totaalbedrag
            (incl. reiskosten). Niet aangevinkt = daar niet boekbaar.
          </span>
          <div className="mt-1 flex flex-col gap-2">
            {PROVINCES.map((p) => {
              const active = p.name in rates
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`prov_${p.name}`}
                      defaultChecked={active}
                      className="accent-brand"
                    />
                    {p.name}
                  </label>
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      €
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      name={`gage_${p.name}`}
                      defaultValue={rates[p.name] ?? ""}
                      placeholder={String(artist?.base_gage ?? "")}
                      className="input h-10 w-full pl-7"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>

        <Field label="Bio">
          <textarea
            name="bio"
            rows={4}
            defaultValue={artist?.bio ?? ""}
            placeholder="Vertel boekers wie je bent en wat je brengt."
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
        <span className="-mt-2 text-xs text-muted">
          Sla op en klik daarna op &ldquo;Synchroniseer nu&rdquo; om je volgers
          op te halen.
        </span>

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
          {artist ? "Opslaan" : "Profiel aanmaken"}
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
