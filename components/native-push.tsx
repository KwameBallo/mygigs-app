"use client"

import { useEffect } from "react"

// Native push-registratie voor de iOS/Android-app (Capacitor). Doet niets in een
// gewone browser: web-push loopt via PushOptin. Vraagt toestemming, registreert
// bij APNs/FCM, en stuurt de device-token naar de server.
export function NativePush() {
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor?.isNativePlatform?.()) return

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
        if (!active || perm.receive !== "granted") return

        await PushNotifications.addListener("registration", async (token) => {
          try {
            await fetch("/api/push/native", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform() === "android" ? "android" : "ios",
              }),
            })
          } catch {}
        })

        await PushNotifications.addListener("registrationError", () => {})

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
      } catch {
        // Stil: zonder native plugin of toestemming blijft de app gewoon werken.
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return null
}
