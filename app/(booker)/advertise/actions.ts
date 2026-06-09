"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { AD_PLACEMENTS } from "@/lib/data/ads"

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim()
}

function optStr(formData: FormData, key: string): string | null {
  const v = str(formData, key)
  return v || null
}

export async function createAd(formData: FormData) {
  const brand = str(formData, "brand_name")
  if (!brand) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const placementRaw = str(formData, "placement")
  const placement = AD_PLACEMENTS.some((p) => p.value === placementRaw)
    ? (placementRaw as (typeof AD_PLACEMENTS)[number]["value"])
    : "events_top"

  await supabase.from("ads").insert({
    created_by: user.id,
    brand_name: brand,
    title: optStr(formData, "title"),
    image_url: optStr(formData, "image_url"),
    target_url: optStr(formData, "target_url"),
    placement,
    starts_at: optStr(formData, "starts_at"),
    ends_at: optStr(formData, "ends_at"),
    active: true,
  })

  revalidatePath("/advertise")
  revalidatePath("/events")
}

export async function toggleAd(formData: FormData) {
  const id = str(formData, "ad_id")
  const active = str(formData, "active") === "true"
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("ads")
    .update({ active: !active })
    .eq("id", id)
    .eq("created_by", user.id)

  revalidatePath("/advertise")
  revalidatePath("/events")
}

export async function deleteAd(formData: FormData) {
  const id = str(formData, "ad_id")
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("ads").delete().eq("id", id).eq("created_by", user.id)

  revalidatePath("/advertise")
  revalidatePath("/events")
}
