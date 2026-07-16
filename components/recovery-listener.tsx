"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// Zodra Supabase een wachtwoord-herstelsessie detecteert (na klikken op de
// resetmail), sturen we de gebruiker automatisch naar /reset-password.
export function RecoveryListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password")
      }
    })
    return () => data.subscription.unsubscribe()
  }, [router])

  return null
}
