"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"

// AVG — recht op verwijdering: wist het account en (via cascade) de gekoppelde
// gegevens. Best-effort: bij een FK-conflict wordt niets half verwijderd.
export async function deleteAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  // Audit vóór verwijderen (daarna is de gebruiker weg) (A.8.15).
  await logAudit({
    actorId: user.id,
    action: "account.delete",
    targetType: "profile",
    targetId: user.id,
  })

  const { data: artist } = await admin
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  // AVG art. 17: facturen behouden hun nummer + bedragen (fiscale bewaarplicht
  // 7 jaar), maar de persoonsgegevens erin worden geanonimiseerd (tombstone).
  const TOMB = "Verwijderd"
  const anon = {
    issuer_name: TOMB,
    issuer_address: null,
    issuer_vat: null,
    issuer_kvk: null,
    recipient_name: TOMB,
    recipient_address: null,
    recipient_vat: null,
  }
  await admin.from("invoices").update(anon).eq("booker_id", user.id)
  if (artist) {
    await admin.from("invoices").update(anon).eq("artist_id", artist.id)
    // DJ-facturatie-PII wissen + DJ-profiel anonimiseren. De boeking-historie van
    // klanten blijft bestaan; alleen de persoonsgegevens van de DJ verdwijnen.
    await admin.from("artist_billing").delete().eq("artist_id", artist.id)
    await admin
      .from("artists")
      .update({
        stage_name: "Verwijderde DJ",
        bio: null,
        avatar_url: null,
        instagram_url: null,
        tiktok_url: null,
        spotify_url: null,
        soundcloud_url: null,
        mixcloud_url: null,
      })
      .eq("id", artist.id)
  }

  // Verwijder het account. Cascade wist profiel/boekingen/gesprekken/berichten/
  // betalingen; facturen- en payout-FK's gaan naar null (behouden, geanonimiseerd).
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error("deleteAccount failed:", error.message)
    redirect("/settings?error=delete")
  }

  await supabase.auth.signOut()
  redirect("/?deleted=1")
}

export async function updateAccount(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim()
  const gender = String(formData.get("gender") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("profiles")
    .update({
      full_name: full_name || null,
      gender: gender || null,
      phone: phone || null,
    })
    .eq("id", user.id)

  revalidatePath("/settings")
}

// E-mailvoorkeur: de gebruiker kiest zelf of MyGigs e-mails mag sturen.
// In-app meldingen blijven altijd; alleen de e-mails worden bij opt-out overgeslagen.
export async function updateEmailPrefs(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const emailOn = formData.get("email_on") != null
  await supabase
    .from("profiles")
    .update({ email_opt_out: !emailOn })
    .eq("id", user.id)

  await logAudit({
    actorId: user.id,
    action: "prefs.email",
    targetType: "profile",
    targetId: user.id,
    metadata: { email_opt_out: !emailOn },
  })

  revalidatePath("/settings")
}

// Bedrijfs-/factuurgegevens die bij elke zakelijke boeking hergebruikt worden.
export async function updateCompanyDetails(formData: FormData) {
  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim()
    return v === "" ? null : v
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from("profiles")
    .update({
      company_name: str("company_name"),
      vat_number: str("vat_number"),
      invoice_email: str("invoice_email"),
      invoice_address: str("invoice_address"),
    })
    .eq("id", user.id)

  revalidatePath("/settings")
}
