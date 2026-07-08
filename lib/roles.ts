import type { Database } from "@/types/database"
import type { IconName } from "@/components/icons"

export type UserRole = Database["public"]["Enums"]["user_role"]

// Twee duidelijke kanten van het platform:
// - Organisator (booker): ontdekt feesten en boekt DJ's voor een event.
// - DJ / Artiest: maakt een profiel aan en wordt geboekt.
export const ROLE_LABEL: Record<string, string> = {
  booker: "Organisator",
  artist: "DJ",
  both: "Organisator & DJ",
  admin: "Beheerder",
}

export const ROLE_ICON: Record<string, IconName> = {
  booker: "map",
  artist: "user",
  both: "user",
  admin: "settings",
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}

export function roleIcon(role: string): IconName {
  return ROLE_ICON[role] ?? "user"
}

export function isArtistRole(role: string | undefined): boolean {
  return role === "artist" || role === "both"
}
