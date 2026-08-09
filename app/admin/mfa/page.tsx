import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth"
import { getI18n } from "@/lib/i18n"
import { dict } from "../i18n"
import { MfaClient } from "./mfa-client"

export const dynamic = "force-dynamic"

export default async function AdminMfaPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== "admin") redirect("/admin/login")

  const supabase = await createClient()
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  // Al bevestigd voor deze sessie → niks te doen.
  if (aal?.currentLevel === "aal2") redirect("/admin")

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const verified = factors?.totp?.find((f) => f.status === "verified") ?? null
  const mode = verified ? "challenge" : "enroll"

  const { locale } = await getI18n()
  const d = dict[locale]

  return (
    <div className="safe-top flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <MfaClient
        mode={mode}
        factorId={verified?.id ?? null}
        labels={{
          enrollTitle: d.mfaEnrollTitle,
          enrollIntro: d.mfaEnrollIntro,
          start: d.mfaStart,
          scan: d.mfaScan,
          secretLabel: d.mfaSecretLabel,
          challengeTitle: d.mfaChallengeTitle,
          challengeIntro: d.mfaChallengeIntro,
          codeLabel: d.mfaCodeLabel,
          verify: d.mfaVerify,
          busy: d.mfaBusy,
          invalid: d.mfaInvalid,
        }}
      />
    </div>
  )
}
