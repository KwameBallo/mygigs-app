import type { Enums } from "@/types/database"

export type ActType = Enums<"act_type">

export const ACT_LABEL: Record<ActType, string> = {
  dj: "DJ",
  band: "Band",
  singer: "Zanger / Zangeres",
  mc: "MC / Host",
  musician: "Muzikant",
  duo: "Duo",
  other: "Overig",
}

// Korte labels voor filter-chips en kaarten.
export const ACT_SHORT: Record<ActType, string> = {
  dj: "DJ",
  band: "Band",
  singer: "Zang",
  mc: "MC",
  musician: "Muzikant",
  duo: "Duo",
  other: "Overig",
}

export const ACT_TYPES: ActType[] = [
  "dj",
  "band",
  "singer",
  "mc",
  "musician",
  "duo",
  "other",
]

export function actLabel(value: string | null | undefined): string {
  if (value && value in ACT_LABEL) return ACT_LABEL[value as ActType]
  return ACT_LABEL.dj
}
