"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit, clientIpFromHeaders } from "@/lib/ratelimit"
import type { Database } from "@/types/database"

type Role = Database["public"]["Enums"]["user_role"]

function destinationFor(role: Role | undefined) {
  return role === "artist" || role === "both" ? "/dashboard" : "/discover"
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  // De gekozen tab: DJ-kant of organisator-kant. Bepaalt of het account
  // op déze kant mag inloggen (rol-scheiding).
  const chosenDj = String(formData.get("role") ?? "") === "artist"
  const tab = chosenDj ? "&type=dj" : ""

  // Rate limiting tegen brute-force/credential-stuffing (FIX #11).
  const ip = await clientIpFromHeaders()
  const rl = await rateLimit(`${ip}:${email.toLowerCase()}`, {
    limit: 8,
    windowSec: 300,
    scope: "login",
  })
  if (!rl.ok) redirect(`/login?error=too-many${tab}`)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Ruwe fout alleen server-side loggen; gebruiker krijgt een generieke
    // melding (voorkomt user-enumeratie en info-disclosure).
    console.error("signIn failed:", error.message)
    redirect(`/login?error=signin${tab}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }
  const role = profile?.role

  // Rol-scheiding: de gekozen kant moet bij het account passen. Een DJ-account
  // kan dus niet via de organisator-tab inloggen, en andersom. Bij mismatch
  // loggen we direct weer uit en sturen we naar de juiste tab. Admin mag beide.
  if (role !== "admin") {
    const isDjAccount = role === "artist" || role === "both"
    const isBookerAccount = role === "booker" || role === "both"
    if (chosenDj && !isDjAccount) {
      await supabase.auth.signOut()
      redirect("/login?error=use-organiser")
    }
    if (!chosenDj && !isBookerAccount) {
      await supabase.auth.signOut()
      redirect("/login?type=dj&error=use-dj")
    }
  }

  redirect(destinationFor(role))
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
  // Nieuwe accounts zijn ALTIJD 'booker'. DJ worden kan alleen via een aanvraag
  // die een beheerder goedkeurt — de signup kan dus geen DJ/admin aanmaken.
  const rawRole = String(formData.get("role") ?? "booker")
  const wantsDj = rawRole === "artist" || rawRole === "both"
  const role: Role = "booker"
  const gender = String(formData.get("gender") ?? "").trim() || null
  const phone = String(formData.get("phone") ?? "").trim() || null
  const acceptedTerms = formData.get("accept_terms") != null
  const isDj = wantsDj

  // Rate limiting tegen signup-misbruik / e-mail-bombing (FIX #11).
  const ip = await clientIpFromHeaders()
  const rl = await rateLimit(ip, { limit: 5, windowSec: 3600, scope: "signup" })
  if (!rl.ok) signupError("too-many", isDj)

  // Beide wachtwoorden moeten gelijk zijn (voorkomt typefouten).
  if (password !== passwordConfirm) {
    signupError("password-mismatch", isDj)
  }

  // AVG-grondslag: zonder akkoord op voorwaarden + privacybeleid geen account.
  if (!acceptedTerms) {
    signupError("terms", isDj)
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
    console.error("signUp failed:", error.message)
    signupError("signup", isDj)
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
    // Koos iemand de DJ-tab? Zet meteen een DJ-aanvraag klaar (ter goedkeuring).
    if (wantsDj) {
      await admin
        .from("dj_applications")
        .upsert(
          { user_id: data.user.id, status: "pending" },
          { onConflict: "user_id" },
        )
    }
  }

  // Geen sessie = e-mailbevestiging vereist.
  if (!data.session) {
    redirect("/login?message=check-email")
  }

  // DJ-intentie → naar de aanvraagpagina; anders naar Ontdek.
  redirect(wantsDj ? "/dj-aanvraag" : destinationFor(role))
}
