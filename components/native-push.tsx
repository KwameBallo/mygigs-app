"use client"

import { useEffect } from "react"

// Native push-registratie voor de iOS/Android-app (Capacitor). Doet niets in een
// gewone browser: web-push loopt via PushOptin. Vraagt toestemming, registreert
// bij APNs/FCM, en stuurt de device-token naar de server.
export function NativePush() {
  useEffect(() => {
    let active = true
    // TIJDELIJKE diagnose: toont op het toestel waar de push-registratie strandt.
    const note = (m: string) => {
      try {
        window.alert("Push: " + m)
      } catch {}
    }
    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor?.isNativePlatform?.()) return
        note("native actief, start registratie")

        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        )

        let perm = await PushNotifications.checkPermissions()
        if (
          perm.receive === "prompt" ||
          perm.receive === "prompt-with-rationale"
        ) {
          perm = await PushNotifications.requestPermissions()
        }
        if (!active) return
        if (perm.receive !== "granted") {
          note("geen toestemming (" + perm.receive + ")")
          return
        }

        await PushNotifications.addListener("registration", async (token) => {
          try {
            const res = await fetch("/api/push/native", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform() === "android" ? "android" : "ios",
              }),
            })
            note("token ontvangen, server antwoordde " + res.status)
          } catch (e) {
            note("versturen token mislukt: " + (e as Error).message)
          }
        })

        await PushNotifications.addListener("registrationError", (err) => {
          note("registratiefout: " + JSON.stringify(err))
        })

        // Tik op een melding: open de meegestuurde url.
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const url = action?.notification?.data?.url
            if (typeof url === "string" && url.startsWith("/")) {
              window.location.href = url
            }
          },
        )

        await PushNotifications.register()
      } catch (e) {
        note("fout: " + (e as Error).message)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return null
}
