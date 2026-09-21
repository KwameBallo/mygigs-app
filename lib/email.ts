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
  replyTo?: string
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
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
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

// Bericht uit het klantenservice-formulier naar de support-inbox. Het adres van
// de afzender komt in reply_to zodat support direct kan antwoorden. Levert in
// Resend-testmodus alleen af bij de accounteigenaar tot het domein geverifieerd is.
export async function sendSupportMessage(opts: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const to = process.env.SUPPORT_EMAIL || "info@mygigs.nl"
  const rows =
    row("Naam", opts.name) +
    row("E-mail", opts.email) +
    (opts.subject ? row("Onderwerp", opts.subject) : "")
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b0c;font-family:Segoe UI,Arial,sans-serif;color:#f5f4f2">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:22px;font-weight:800">My<span style="color:#ff6f14">Gigs</span><span style="color:#ff6f14">.</span></div>
    <div style="margin-top:24px;background:#161618;border:1px solid #2a2a2e;border-radius:18px;padding:24px">
      <h1 style="margin:0 0 12px;font-size:20px">Nieuw klantenservice-bericht</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#cfcfd4">${rows}</table>
      <p style="margin:16px 0 0;white-space:pre-wrap;font-size:14px;color:#cfcfd4">${esc(opts.message)}</p>
    </div>
  </div></body></html>`
  return sendEmail({
    to,
    subject: `Klantenservice: ${opts.subject || "nieuwe vraag"}`,
    html,
    replyTo: opts.email,
  })
}

// Alert naar support: een gebruiker heeft de flag-drempel bereikt (herhaald
// contactgegevens delen in de chat = mogelijk misbruik / off-platform lokken).
export async function sendFlagAlertToSupport(opts: {
  name: string
  email: string
  count: number
  reason: string
  snippet: string
}) {
  const to = process.env.SUPPORT_EMAIL || "info@mygigs.nl"
  const rows =
    row("Gebruiker", opts.name) +
    row("E-mail", opts.email) +
    row("Aantal flags", String(opts.count), true) +
    row("Reden", opts.reason) +
    row("Fragment", opts.snippet)
  return sendEmail({
    to,
    subject: `Flag-alert: ${opts.name} (${opts.count}×)`,
    html: shell("Gebruiker bereikte de flag-drempel", rows, {
      href: `${siteUrl()}/admin`,
      label: "Bekijk in admin",
    }),
  })
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
    ? `Betaalbewijs: je boeking van ${opts.djName} is betaald`
    : `Payment receipt: your booking of ${opts.djName} is paid`
  const title = nl ? "Betaling geslaagd ✓" : "Payment successful ✓"
  const rows =
    row(nl ? "DJ" : "DJ", opts.djName) +
    row(nl ? "Wanneer" : "When", opts.when) +
    (opts.place ? row(nl ? "Locatie" : "Location", opts.place) : "") +
    row(nl ? "Betaald bedrag" : "Amount paid", opts.amount, true) +
    row(
      nl ? "Status" : "Status",
      nl
        ? "Veilig in escrow, uitbetaling ná het optreden"
        : "Held safely in escrow, paid out after the performance",
    )
  const cta = {
    href: `${siteUrl()}/bookings`,
    label: nl ? "Bekijk je boeking" : "View your booking",
  }
  return sendEmail({ to: opts.to, subject, html: shell(title, rows, cta) })
}

// Nieuwe aanvraag binnen, naar de DJ.
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
    ? `Nieuwe aanvraag${opts.occasion ? `: ${opts.occasion}` : ""}`
    : `New request${opts.occasion ? `: ${opts.occasion}` : ""}`
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

// Aanvraag geaccepteerd door de DJ, naar de boeker (met betaal-CTA).
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

// Boeking betaald & bevestigd, naar de DJ (met uitbetaal-info).
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

// Na het optreden: vraag de boeker om een review (belangrijk voor de
// naamsbekendheid van de DJ). CTA linkt naar de review-pagina van de boeking.
export async function sendReviewRequestToBooker(opts: {
  to: string
  locale: "nl" | "en"
  djName: string
  when: string
  bookingId: string
}) {
  const nl = opts.locale === "nl"
  const rows =
    row(nl ? "DJ" : "DJ", opts.djName) +
    (opts.when ? row(nl ? "Optreden" : "Performance", opts.when) : "")
  return sendEmail({
    to: opts.to,
    subject: nl
      ? `Hoe was ${opts.djName}? Laat een review achter`
      : `How was ${opts.djName}? Leave a review`,
    html: shell(
      nl ? "Laat een review achter ⭐" : "Leave a review ⭐",
      rows,
      {
        href: `${siteUrl()}/bookings/${opts.bookingId}/review`,
        label: nl ? "Review plaatsen" : "Write a review",
      },
    ),
  })
}

// Maandelijkse terugblik naar de DJ: wat heb je afgelopen maand gedaan?
// Alleen aantallen/plaatsen/verdiensten, geen klantgegevens (AVG).
export async function sendMonthlyRecapToDJ(opts: {
  to: string
  locale: "nl" | "en"
  monthLabel: string
  gigs: number
  cities: string
  earned: string
}) {
  const nl = opts.locale === "nl"
  const subject = nl
    ? `Je maand in het kort: ${opts.monthLabel}`
    : `Your month in review: ${opts.monthLabel}`
  const rows =
    row(nl ? "Optredens" : "Gigs", String(opts.gigs), true) +
    (opts.cities ? row(nl ? "Waar" : "Where", opts.cities) : "") +
    row(nl ? "Verdiend" : "Earned", opts.earned, true)
  return sendEmail({
    to: opts.to,
    subject,
    html: shell(
      nl
        ? `Je gigs van ${opts.monthLabel} 🎧`
        : `Your gigs in ${opts.monthLabel} 🎧`,
      rows,
      {
        href: `${siteUrl()}/dashboard`,
        label: nl ? "Bekijk je gigs" : "View your gigs",
      },
    ),
  })
}

// De DJ heeft zich afgemeld, naar de organisator. Deze mail moet twee dingen
// doen: eerlijk zijn dat het optreden niet doorgaat, en meteen laten zien dat
// het niet zijn probleem is om op te lossen. De reden van de DJ staat er
// bewust NIET in: die is voor MyGigs, niet voor de klant.
export async function sendCancelledByDJToBooker(opts: {
  to: string
  locale: "nl" | "en"
  djName: string
  when: string
  place: string
  /** Was er al betaald? Dan komt het bedrag terug. */
  refund: boolean
}) {
  const nl = opts.locale === "nl"
  const subject = nl
    ? `${opts.djName} kan helaas niet komen`
    : `${opts.djName} is unable to make it`
  const rows =
    row("DJ", opts.djName) +
    row(nl ? "Wanneer" : "When", opts.when) +
    (opts.place ? row(nl ? "Locatie" : "Location", opts.place) : "") +
    row(
      nl ? "Wat wij doen" : "What we do",
      nl
        ? "We zoeken een vervanger voor je"
        : "We are looking for a stand-in for you",
      true,
    ) +
    (opts.refund
      ? row(
          nl ? "Je betaling" : "Your payment",
          nl
            ? "Komt volledig terug op je rekening"
            : "Will be refunded in full",
          true,
        )
      : "")
  return sendEmail({
    to: opts.to,
    subject,
    html: shell(
      nl ? "Je boeking gaat niet door" : "Your booking is cancelled",
      rows,
      {
        href: `${siteUrl()}/discover`,
        label: nl ? "Bekijk andere DJ's" : "Browse other DJs",
      },
    ),
  })
}

// Diezelfde afmelding, maar dan naar de eigen inbox. Hier staat wél de reden
// in, plus of er nog geld terug moet. Zolang de betaalprovider gesimuleerd is,
// is deze mail het enige wat een terugbetaling in gang zet.
export async function sendCancelAlertToSupport(opts: {
  djName: string
  when: string
  place: string
  occasion: string
  reason: string
  noticeHours: number
  amount: string
  refundNeeded: boolean
  bookingId: string
}) {
  const to = process.env.SUPPORT_EMAIL || "info@mygigs.nl"
  const late = opts.noticeHours < 24
  const rows =
    row("DJ", opts.djName) +
    row("Wanneer", opts.when) +
    (opts.occasion ? row("Gelegenheid", opts.occasion) : "") +
    row("Locatie", opts.place) +
    row("Reden", opts.reason) +
    row(
      "Vooraf gemeld",
      `${opts.noticeHours} uur${late ? " (te laat)" : ""}`,
      late,
    ) +
    row("Bedrag", opts.amount) +
    row(
      "Actie",
      opts.refundNeeded
        ? "Handmatig terugbetalen aan de klant"
        : "Geen betaling gedaan, niets terug te storten",
      opts.refundNeeded,
    )
  return sendEmail({
    to,
    subject: `Afmelding door ${opts.djName}${late ? " (binnen 24 uur)" : ""}`,
    html: shell("Een DJ heeft zich afgemeld", rows, {
      href: `${siteUrl()}/admin`,
      label: "Bekijk in admin",
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

// ------------------------------------------------------------------
// Aanmeldbot: "je profiel staat klaar". Gaat naar een DJ van wie de beheerder
// een aanmelding heeft goedgekeurd. De link opent de opeispagina, waar hij zijn
// profiel ziet, een wachtwoord kiest en het met één klik online zet.
//
// Heeft de DJ zich niet zelf aangemeld, dan is deze mail ook de melding die de
// AVG vraagt: we zeggen waar zijn gegevens vandaan komen en hoe hij ze laat
// verwijderen.
// ------------------------------------------------------------------

export async function sendDjClaimMail(opts: {
  to: string
  stageName: string
  city: string | null
  genres: string[]
  claimUrl: string
  selfSubmitted: boolean
  sourceNote: string | null
  expiresOn: string
}) {
  const p = (text: string, color = "#cfcfd4", size = 15) =>
    `<p style="margin:0 0 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:${size}px;line-height:1.65;color:${color};">${text}</p>`

  const facts = [opts.city, opts.genres.slice(0, 3).join(", ")].filter(Boolean).join(" &middot; ")
  const factsEsc = [opts.city ? esc(opts.city) : "", esc(opts.genres.slice(0, 3).join(", "))]
    .filter(Boolean)
    .join(" &middot; ")

  const origin = opts.selfSubmitted
    ? p("Bedankt voor je aanmelding. We hebben je profiel voor je klaargezet: je hoeft alleen nog een wachtwoord te kiezen en op opeisen te klikken.")
    : p(
        "We zijn je tegengekomen en denken dat je goed past bij MyGigs, het platform waar organisatoren rechtstreeks DJ's boeken. " +
          "Daarom hebben we alvast een profiel voor je klaargezet. Het staat nog niet online: dat gebeurt pas als jij het opeist.",
      )

  const avg = opts.selfSubmitted
    ? ""
    : p(
        `Dit profiel is samengesteld uit openbare informatie${
          opts.sourceNote ? ` (${esc(opts.sourceNote.slice(0, 200))})` : ""
        }. Wil je dit niet? Open de link en kies onderaan <strong style="color:#f5f4f2;">Verwijder mijn gegevens</strong>. Dan halen we alles direct weg.`,
        "#8b8b93",
        13,
      )

  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Je profiel staat klaar</title></head>
<body style="margin:0;padding:0;background:#0b0b0c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0b0c;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
  <tr><td align="center" style="padding:0 0 24px;"><img src="${siteUrl()}/mail-logo.png" width="132" alt="MyGigs" style="display:block;width:132px;height:auto;border:0;"></td></tr>
  <tr><td style="background:#161618;border-radius:18px;padding:32px 28px;">
    <h1 style="margin:0 0 4px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#f5f4f2;">Je DJ-profiel staat klaar</h1>
    <p style="margin:0 0 20px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#8b8b93;">${esc(opts.stageName)}${facts ? ` &middot; ${factsEsc}` : ""}</p>
    ${origin}
    ${p("Na het opeisen vinden organisatoren je op de kaart, zien ze je tarief en kunnen ze je direct boeken. Aanmelden en een profiel hebben is gratis.")}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td align="center" bgcolor="#ff6f14" style="border-radius:999px;">
      <a href="${encodeURI(opts.claimUrl)}" style="display:inline-block;padding:14px 30px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#000000;text-decoration:none;border-radius:999px;">Bekijk en claim je profiel</a>
    </td></tr></table>
    ${p(`Deze link is persoonlijk en werkt tot ${esc(opts.expiresOn)}. Stuur hem niet door.`, "#8b8b93", 13)}
    ${avg}
  </td></tr>
  <tr><td style="padding:20px 6px 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8b8b93;">
    Vragen? Mail ons op <a href="mailto:info@mygigs.nl" style="color:#ff8a3d;text-decoration:none;">info@mygigs.nl</a>. We helpen je graag verder.
  </td></tr>
  <tr><td style="padding:24px 6px 0;"><p style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:#6c6c74;">
    Dit is een automatisch bericht. Je kunt er niet op antwoorden.<br>
    MyGigs &middot; <a href="${siteUrl()}/privacy" style="color:#8b8b93;text-decoration:none;">Privacyverklaring</a>
    &middot; <a href="${siteUrl()}/voorwaarden" style="color:#8b8b93;text-decoration:none;">Algemene voorwaarden</a>
  </p></td></tr>
</table></td></tr></table></body></html>`

  return sendEmail({
    to: opts.to,
    subject: `${opts.stageName}, je DJ-profiel op MyGigs staat klaar`,
    html,
  })
}
