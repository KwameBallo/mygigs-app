// Eenmalig: de nep-DJ's opschonen naar 11 test-DJ's (plus Kwansa, die blijft
// buiten schot). De 11 krijgen een verborgen account zodat ze namens zichzelf
// een boeking kunnen accepteren en een chatbericht sturen, een naam met " T",
// een bedrag tussen 50 en 500, een provincie, genres en auto_accept aan.
//
// Draaien: node scripts/setup-test-djs.mjs
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]
    }),
)

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const PROVINCES = [
  "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg",
  "Noord-Brabant", "Noord-Holland", "Overijssel", "Utrecht", "Zeeland", "Zuid-Holland",
]

const KEEP = [
  { id: "d3753645-28c8-4fce-ac2a-3899e23192b5", name: "DJ Nova", gage: 150, prov: "Noord-Holland", genres: [8, 13] },
  { id: "79bdaa3a-08ae-4363-9fdd-2e5fdb024eab", name: "Lena Vale", gage: 250, prov: "Zuid-Holland", genres: [17, 5] },
  { id: "973372a1-986d-4905-be13-36febbea1d81", name: "Koba", gage: 100, prov: "Utrecht", genres: [7, 31] },
  { id: "cf8626dc-1c88-405c-8172-a37e8bc83c05", name: "Aisha K", gage: 350, prov: "Noord-Brabant", genres: [4, 15] },
  { id: "3d84293d-278c-4904-bd48-aed10120b7f7", name: "Nightframe", gage: 300, prov: "Gelderland", genres: [3, 37] },
  { id: "ab88c985-9bd0-45aa-857f-119fb6fa767a", name: "Diego Sol", gage: 450, prov: "Overijssel", genres: [6, 28] },
  { id: "be4d2fbe-f015-480f-82fd-c9c6c4812bc9", name: "MC Zenith", gage: 500, prov: "Limburg", genres: [29, 30] },
  { id: "8418d376-7cda-4168-9a4d-e7a2774bfb44", name: "Vibe Republic", gage: 400, prov: "Flevoland", genres: [19, 38] },
  { id: "5e689377-e36b-4a4c-8559-545a80a9258d", name: "DJ Pico", gage: 50, prov: "Groningen", genres: [35, 8] },
  { id: "a325b95e-70ae-4ab9-b387-b06ff34865e8", name: "Lisa Groove", gage: 200, prov: "Friesland", genres: [4, 27] },
  { id: "64cf078d-cec4-47f4-96d1-0d4d1ab475d7", name: "Jonas Beat", gage: 75, prov: "Drenthe", genres: [39, 10] },
]

const DELETE_IDS = [
  "31dc77a2-c99b-4d9f-af72-dc9de561cf7e", // Marlow
  "c2b65cc0-e6e5-43fb-af12-25a3f89f60fe", // Sander Rey
  "523d8760-90a6-4ca3-83ed-b5d44fbbfb39", // Fenna
  "10790b54-94f5-4975-82d5-4ac30cfdecd4", // Ravi B
  "d498572c-4494-4656-a3db-2e5b37fd7233", // Naomi Waves
  "3c175900-77dd-45f8-af6c-5ffd771ccab1", // Sem
  "f9d0d84a-4ca2-4251-84d9-2440bc4dced6", // Timo K
  "6f129a89-f165-482a-8bed-662e80663529", // Ravi Jr
  "e3aed54d-0ba5-40a8-a8c4-6a5f6052f324", // Milan D
  "9bfb7632-dcc4-4bb0-8e93-d3b8536c10d0", // Fleur
  "7043d9d0-98e5-4b57-a9bb-97bd3e6a6eb4", // Tiesto
  "018d945d-3f5e-4fdf-aee2-f8043d048b9e", // Martin Garrix
]

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "")

for (const dj of KEEP) {
  const testName = `${dj.name} T`
  const email = `${slug(dj.name)}.bot@mygigs.test`

  // 1) Verborgen account. De trigger maakt automatisch een profiel aan.
  const { data: made, error: uErr } = await admin.auth.admin.createUser({
    email,
    password: `${randomUUID()}Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: testName },
  })
  if (uErr) {
    console.error("account maken mislukt voor", dj.name, uErr.message)
    continue
  }
  const uid = made.user.id

  // 2) Profiel op rol artist.
  await admin.from("profiles").update({ role: "artist", full_name: testName }).eq("id", uid)

  // 3) De DJ zelf: koppelen, naam, bedrag, provincie, auto-accept, gear.
  await admin.from("artists").update({
    user_id: uid,
    stage_name: testName,
    base_gage: dj.gage,
    province: dj.prov,
    genre_id: dj.genres[0],
    auto_accept: true,
    has_sound: true,
    has_light: true,
  }).eq("id", dj.id)

  // 4) Genres.
  await admin.from("artist_genres").delete().eq("artist_id", dj.id)
  await admin.from("artist_genres").insert(dj.genres.map((g) => ({ artist_id: dj.id, genre_id: g })))

  // 5) Prijs per provincie: overal boekbaar tegen het basisbedrag.
  await admin.from("artist_province_rates").delete().eq("artist_id", dj.id)
  await admin.from("artist_province_rates").insert(
    PROVINCES.map((p) => ({ artist_id: dj.id, province: p, gage: dj.gage })),
  )

  console.log("klaar:", testName, "(" + dj.prov + ", " + dj.gage + ")")
}

// De 12 overbodige nep-DJ's weg, kinderrijen eerst.
for (const t of ["artist_genres", "artist_province_rates", "artist_media", "artist_availability", "favorites", "conversations"]) {
  const { error } = await admin.from(t).delete().in("artist_id", DELETE_IDS)
  if (error) console.error("opruimen", t, "mislukt:", error.message)
}
const { error: dErr } = await admin.from("artists").delete().in("id", DELETE_IDS)
if (dErr) console.error("DJ's verwijderen mislukt:", dErr.message)
else console.log("verwijderd:", DELETE_IDS.length, "nep-DJ's")

console.log("done")
