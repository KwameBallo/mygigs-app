import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RecoveryListener } from "@/components/recovery-listener";
import { I18nProvider } from "@/components/i18n-provider";
import { getI18n } from "@/lib/i18n";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyGigs — Boek DJ's rechtstreeks",
  description:
    "Het boekingsplatform voor DJ's en events. Boek rechtstreeks, met transparante tarieven en veilige betaling via escrow.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyGigs",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getI18n();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <RecoveryListener />
        <I18nProvider locale={locale} dict={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
