import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getGenres } from "@/lib/data/artists"
import { saveArtistProfile } from "./actions"
import { SyncSocials } from "./sync-button"

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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        {artist ? "Mijn profiel" : "Maak je artiestprofiel"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Dit is wat boekers zien op je publieke profiel.
      </p>

      {artist && (
        <div className="mt-6">
          <SyncSocials
            instagramFollowers={artist.instagram_followers ?? 0}
            spotifyFollowers={artist.spotify_followers ?? 0}
          />
        </div>
      )}

      <form action={saveArtistProfile} className="mt-8 flex flex-col gap-5">
        <Field label="Artiestnaam" required>
          <input
            name="stage_name"
            required
            defaultValue={artist?.stage_name ?? ""}
            placeholder="DJ Voorbeeld"
            className="input h-11"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Basis gage (€)">
            <input
              name="base_gage"
              type="number"
              min={0}
              step={50}
              defaultValue={artist?.base_gage ?? 0}
              className="input h-11"
            />
          </Field>
          <Field label="Genre">
            <select
              name="genre_id"
              defaultValue={artist?.genre_id ?? ""}
              className="input h-11"
            >
              <option value="">Kies genre</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Thuisstad">
          <input
            name="home_city"
            defaultValue={artist?.home_city ?? ""}
            placeholder="Amsterdam"
            className="input h-11"
          />
        </Field>

        <Field label="Bio">
          <textarea
            name="bio"
            rows={4}
            defaultValue={artist?.bio ?? ""}
            placeholder="Vertel boekers wie je bent en wat je brengt."
            className="input py-3"
          />
        </Field>

        <Field label="Apparatuur">
          <input
            name="equipment"
            defaultValue={artist?.equipment ?? ""}
            placeholder="Pioneer CDJ-3000, DJM-900"
            className="input h-11"
          />
        </Field>

        <Field label="Instagram">
          <input
            name="instagram_url"
            defaultValue={artist?.instagram_url ?? ""}
            placeholder="https://instagram.com/jouwnaam"
            className="input h-11"
          />
          <span className="text-xs text-muted">
            Sla op en klik daarna op &ldquo;Synchroniseer nu&rdquo; om je volgers op te halen.
          </span>
        </Field>

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
