import type { CapacitorConfig } from "@capacitor/cli"

// =============================================================
// Capacitor: de native schil om de MyGigs web app.
//
// De iOS app laadt de live site. Dat is bewust: MyGigs is server-rendered
// (server actions, Supabase), dus een statische export kan niet. De native
// laag voegt toe wat een echte app nodig heeft: meldingen, een icoon, een
// splash. De map in webDir is alleen een terugval als er geen verbinding is.
//
// appId ligt vast zodra we 'm in Apple registreren. Tot dan nog te wijzigen.
// =============================================================

const config: CapacitorConfig = {
  appId: "com.mygigs.app",
  appName: "MyGigs",
  webDir: "mobile",
  server: {
    url: "https://mygigs-app-t7ve.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0A0A0B",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0A0A0B",
      showSpinner: false,
    },
  },
}

export default config
