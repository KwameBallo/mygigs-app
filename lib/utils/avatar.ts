// Profielfoto's: één plek die bepaalt welke variant waar geladen wordt.
//
// De DJ levert één foto aan, snijdt die vierkant bij, en de browser slaat drie
// maten op: 160 voor lijstjes en avatars, 512 voor kaarten, 1200 voor het
// profiel zelf. Deze helper zet dat om in een srcset, zodat de browser per
// scherm de kleinste passende variant kiest.

export const AVATAR_WIDTHS = [160, 512, 1200] as const
export type AvatarWidth = (typeof AVATAR_WIDTHS)[number]
export type AvatarVariants = Partial<Record<`${AvatarWidth}`, string>>

// Kolommen zijn pas na migratie 0032 in types/database.ts aanwezig; tot die
// tijd lezen we ze defensief uit de rij.
type MaybeAvatarRow = {
  avatar_url?: string | null
  avatar_variants?: unknown
  avatar_blur?: unknown
}

export function parseVariants(value: unknown): AvatarVariants {
  if (!value || typeof value !== "object") return {}
  const out: AvatarVariants = {}
  for (const w of AVATAR_WIDTHS) {
    const url = (value as Record<string, unknown>)[String(w)]
    if (typeof url === "string" && url.startsWith("http")) {
      out[`${w}`] = url
    }
  }
  return out
}

export type AvatarSource = {
  /** Beste enkele bron, ook voor browsers zonder srcset-ondersteuning. */
  src: string | null
  /** Kandidaten per breedte, leeg als er nog geen varianten zijn. */
  srcSet?: string
  /** Vervaagde mini-placeholder als data-URI. */
  blur?: string
}

/**
 * Kiest de bronnen voor een profielfoto.
 * `prefer` is de breedte die je op het grootste scherm nodig hebt.
 */
export function avatarSource(
  row: MaybeAvatarRow | null | undefined,
  prefer: AvatarWidth = 512,
): AvatarSource {
  if (!row) return { src: null }

  const variants = parseVariants(row.avatar_variants)
  const blur = typeof row.avatar_blur === "string" ? row.avatar_blur : undefined

  const entries = AVATAR_WIDTHS.map((w) => [w, variants[`${w}`]] as const).filter(
    (e): e is readonly [AvatarWidth, string] => Boolean(e[1]),
  )

  if (entries.length === 0) {
    // Oude profielen: nog één losse foto zonder varianten.
    return { src: row.avatar_url ?? null, blur }
  }

  const exact = variants[`${prefer}`]
  const fallback = entries[entries.length - 1][1]

  return {
    src: exact ?? fallback,
    srcSet: entries.map(([w, url]) => `${url} ${w}w`).join(", "),
    blur,
  }
}

/** Initialen als er (nog) geen foto is. */
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
