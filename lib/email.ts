import "server-only"

// Transactionele e-mail via Resend (REST API, geen extra dependency nodig).
// AVG/ISO: verzending gaat over TLS bij de provider, we sturen minimale gegevens
// (geen adres/betaalgegevens) en linken naar de app i.p.v. PII mee te sturen.
// Slaat stil over als er (nog) geen RESEND_API_KEY is ingesteld.

const RESEND_URL = "https://api.resend.com/emails"

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://mygigs-app-t7ve.vercel.app"
  )
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || "MyGigs <onboarding@resend.dev>"
  if (!key) {
    console.warn("e-mail overgeslagen: RESEND_API_KEY niet ingesteld")
    return { ok: false, skipped: true }
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    })
    if (!res.ok) {
      console.error("e-mail versturen mislukt:", res.status, await res.text())
      return { ok: false }
    }
    return { ok: true }
  } catch (e) {
    console.error("e-mail fout:", e)
    return { ok: false }
  }
}

// Alle gebruikerstekst wordt ge-escaped voordat het in de e-mail-HTML komt,
// zodat een naam/gelegenheid/locatie geen HTML/links kan injecteren (FIX #12).
function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function shell(title: string, bodyRows: string, cta: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0b0b0c;font-family:Segoe UI,Arial,sans-serif;color:#f5f4f2">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:22px;font-weight:800">My<span style="color:#ff6f14">Gigs</span><span style="color:#ff6f14">.</span></div>
    <div style="margin-top:24px;background:#161618;border:1px solid #2a2a2e;border-radius:18px;padding:24px">
      <h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#cfcfd4">${bodyRows}</table>
      <a href="${encodeURI(cta.href)}" style="display:inline-block;margin-top:20px;background:#ff6f14;color:#000;font-weight:700;text-decoration:none;border-radius:999px;padding:11px 20px">${esc(cta.label)}</a>
    </div>
    <p style="margin-top:18px;font-size:11px;color:#8b8b93">Automatische e-mail van MyGigs. Reageer niet op dit bericht.</p>
  </div></body></html>`
}

function row(label: string, value: string, strong = false) {
  return `<tr><td style="padding:5px 0;color:#8b8b93">${esc(label)}</td><td style="padding:5px 0;text-align:right;${strong ? "font-weight:800;color:#ff8a3d" : ""}">${esc(value)}</td></tr>`
}

// Betaalbewijs naar de (hoofd)boeker na een geslaagde betaling.
export async function sendPaymentReceipt(opts: {
  to: string
  locale: "nl" | "en"
  djName: string
  when: string
  place: string
  amount: string
}) {
  const nl = opts.locale === "nl"
  const subject = nl
    ? `Betaalbewijs — je boeking van ${opts.djName} is betaald`
    : `Payment receipt — your booking of ${opts.djName} is paid`
  const title = nl ? "Betaling geslaagd ✓" : "Payment successful ✓"
  const rows =
    row(nl ? "DJ" : "DJ", opts.djName) +
    row(nl ? "Wanneer" : "When", opts.when) +
    (opts.place ? row(nl ? "Locatie" : "Location", opts.place) : "") +
    row(nl ? "Betaald bedrag" : "Amount paid", opts.amount, true) +
    row(
      nl ? "Status" : "Status",
      nl
        ? "Veilig in escrow — uitbetaling ná het optreden"
        : "Held safely in escrow — paid out after the performance",
    )
  const cta = {
    href: `${siteUrl()}/bookings`,
    label: nl ? "Bekijk je boeking" : "View your booking",
  }
  return sendEmail({ to: opts.to, subject, html: shell(title, rows, cta) })
}

// Nieuwe aanvraag binnen — naar de DJ.
export async function sendNewRequestToDJ(opts: {
  to: string
  locale: "nl" | "en"
  occasion: string
  when: string
  place: string
  gage: string
}) {
  const nl = opts.locale === "nl"
  const subject = nl
    ? `Nieuwe aanvraag${opts.occasion ? ` — ${opts.occasion}` : ""}`
    : `New request${opts.occasion ? ` — ${opts.occasion}` : ""}`
  const rows =
    (opts.occasion ? row(nl ? "Gelegenheid" : "Occasion", opts.occasion) : "") +
    row(nl ? "Wanneer" : "When", opts.when) +
    (opts.place ? row(nl ? "Locatie" : "Location", opts.place) : "") +
    row(nl ? "Gage" : "Fee", opts.gage, true)
  return sendEmail({
    to: opts.to,
    subject,
    html: shell(nl ? "Je hebt een nieuwe aanvraag 🎉" : "You have a new request 🎉", rows, {
      href: `${siteUrl()}/dashboard`,
      label: nl ? "Bekijk aanvraag" : "View request",
    }),
  })
}

// Aanvraag geaccepteerd door de DJ — naar de boeker (met betaal-CTA).
export async function sendAcceptedToBooker(opts: {
  to: string
  locale: "nl" | "en"
  djName: string
  when: string
  place: string
  amount: string
}) {
  const nl = opts.locale === "nl"
  const subject = nl
    ? `${opts.djName} heeft je aanvraag geaccepteerd`
    : `${opts.djName} accepted your request`
  const rows =
    row("DJ", opts.djName) +
    row(nl ? "Wanneer" : "When", opts.when) +
    (opts.place ? row(nl ? "Locatie" : "Location", opts.place) : "") +
    row(nl ? "Te betalen" : "To pay", opts.amount, true)
  return sendEmail({
    to: opts.to,
    subject,
    html: shell(nl ? "Je aanvraag is geaccepteerd ✓" : "Your request was accepted ✓", rows, {
      href: `${siteUrl()}/bookings`,
      label: nl ? "Betaal je boeking" : "Pay your booking",
    }),
  })
}

// Boeking betaald & bevestigd — naar de DJ (met uitbetaal-info).
export async function sendBookingConfirmedToDJ(opts: {
  to: string
  locale: "nl" | "en"
  when: string
  place: string
  payout: string
}) {
  const nl = opts.locale === "nl"
  const subject = nl ? "Boeking betaald & bevestigd" : "Booking paid & confirmed"
  const rows =
    row(nl ? "Wanneer" : "When", opts.when) +
    (opts.place ? row(nl ? "Locatie" : "Location", opts.place) : "") +
    row(nl ? "Jouw uitbetaling" : "Your payout", opts.payout, true) +
    row(
      nl ? "Uitbetaling" : "Payout",
      nl ? "Binnen 5 werkdagen na het optreden" : "Within 5 business days after the performance",
    )
  return sendEmail({
    to: opts.to,
    subject,
    html: shell(nl ? "Boeking bevestigd ✓" : "Booking confirmed ✓", rows, {
      href: `${siteUrl()}/dashboard`,
      label: nl ? "Bekijk boeking" : "View booking",
    }),
  })
}

// E-mailadres van een gebruiker ophalen via de service-role (auth.users).
// Respecteert de e-mailvoorkeur: heeft de gebruiker e-mails uitgezet (opt-out),
// dan geven we null terug en wordt er niets verstuurd.
export async function getUserEmail(userId: string): Promise<string | null> {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const admin = createAdminClient()
  const { data: prof } = await admin
    .from("profiles")
    .select("email_opt_out")
    .eq("id", userId)
    .maybeSingle()
  if (prof?.email_opt_out) return null
  const { data } = await admin.auth.admin.getUserById(userId)
  return data.user?.email ?? null
}
