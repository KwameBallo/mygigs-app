"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const fullName = String(formData.get("full_name") ?? "").trim()
  const role = (String(formData.get("role") ?? "booker") as Role) || "booker"

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  })

  if (error) {
    redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`)
  }

  // No session means email confirmation is required.
  if (!data.session) {
    redirect("/login?message=check-email")
  }

  // Ensure a profile row exists with the chosen role + name.
  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      role,
    })
  }

  redirect(destinationFor(role))
}
