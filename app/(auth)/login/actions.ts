"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

type Role = Database["public"]["Enums"]["user_role"]

function destinationFor(role: Role | undefined) {
  return role === "artist" || role === "both" ? "/dashboard" : "/discover"
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  const profile = await supabase.auth
    .getUser()
    .then(({ data }) => data.user?.id)
    .then(async (id) => {
      if (!id) return null
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", id)
        .maybeSingle()
      return data
    })

  redirect(destinationFor(profile?.role))
}

// Versie van de voorwaarden/privacyverklaring waarmee akkoord is gegaan.
// Verhoog dit als de teksten wijzigen zodat je opnieuw akkoord kunt vragen.
const TERMS_VERSION = "2026-07-17"

function signupError(message: string, isDj: boolean): never {
  const params = new URLSearchParams({ mode: "signup", error: message })
  if (isDj) params.set("type", "dj")
  redirect(`/login?${params.toString()}`)
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const passwordConfirm = String(formData.get("password_confirm") ?? "")
  const fullName = String(formData.get("full_name") ?? "").trim()
  const role = (String(formData.get("role") ?? "booker") as Role) || "booker"
  const gender = String(formData.get("gender") ?? "").trim() || null
  const phone = String(formData.get("phone") ?? "").trim() || null
  const acceptedTerms = formData.get("accept_terms") != null
  const isDj = role === "artist" || role === "both"

  // Beide wachtwoorden moeten gelijk zijn (voorkomt typefouten).
  if (password !== passwordConfirm) {
    signupError("De wachtwoorden komen niet overeen.", isDj)
  }

  // AVG-grondslag: zonder akkoord op voorwaarden + privacybeleid geen account.
  if (!acceptedTerms) {
    signupError(
      "Je moet akkoord gaan met de voorwaarden en het privacybeleid.",
      isDj,
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        gender,
        phone,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      },
    },
  })

  if (error) {
    redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`)
  }

  // Profiel aanvullen met naam/rol/gender/telefoon. Via de service-role zodat
  // dit ook werkt als er (nog) geen sessie is — bijv. wanneer
  // e-mailbevestiging aan staat.
  if (data.user) {
    const admin = createAdminClient()
    await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      gender,
      phone,
    })
  }

  // Geen sessie = e-mailbevestiging vereist.
  if (!data.session) {
    redirect("/login?message=check-email")
  }

  redirect(destinationFor(role))
}
