"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, clientIpFromHeaders } from "@/lib/ratelimit"

// Aparte beheer-login: logt in en eist rol 'admin'. Een niet-admin wordt direct
// weer uitgelogd. Zelfde rate-limiting als de gewone login.
export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const ip = await clientIpFromHeaders()
  const rl = await rateLimit(`${ip}:${email.toLowerCase()}`, {
    limit: 8,
    windowSec: 300,
    scope: "login",
  })
  if (!rl.ok) redirect("/admin/login?error=too-many")

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error("admin signIn failed:", error.message)
    redirect("/admin/login?error=signin")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null }

  if (profile?.role !== "admin") {
    await supabase.auth.signOut()
    redirect("/admin/login?error=notadmin")
  }

  redirect("/admin")
}
