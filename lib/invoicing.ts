import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { VAT_RATE } from "@/lib/utils/pricing"

// MyGigs als afzender van de commissie-factuur (placeholder-gegevens; vervang
// door de echte KvK/btw zodra bekend).
const MYGIGS = {
  name: "MyGigs B.V.",
  address: "Amsterdam, Nederland",
  vat: "NL000000000B00",
  kvk: "00000000",
}

const KOR_NOTE = "Kleineondernemersregeling — geen btw in rekening gebracht."

function r2(n: number) {
  return Math.round(n * 100) / 100
}

// Genereert (idempotent) de twee facturen bij een betaalde boeking:
// 1. dj_sale       — verkoopfactuur DJ -> klant (gage + apparatuur = boeking.total)
// 2. mg_commission — commissie-factuur MyGigs -> DJ (7% + 21% btw)
// Draait met de service-role; de nummering is sequentieel per scope+jaar.
export async function generateInvoicesForBooking(bookingId: string) {
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle()
  if (!booking) return

  // Idempotent PER SOORT: genereer alleen de factuur-soort die nog ontbreekt,
  // zodat een half mislukte poging bij retry alsnog compleet wordt (FIX #15).
  const { data: existing } = await admin
    .from("invoices")
    .select("kind")
    .eq("booking_id", bookingId)
  const has = new Set((existing ?? []).map((e) => e.kind))
  if (has.has("dj_sale") && has.has("mg_commission")) return

  const [{ data: artist }, { data: billing }, { data: booker }] = await Promise.all([
    admin.from("artists").select("stage_name").eq("id", booking.artist_id).maybeSingle(),
    admin.from("artist_billing").select("*").eq("artist_id", booking.artist_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", booking.booker_id).maybeSingle(),
  ])

  const year = new Date(booking.created_at).getFullYear()
  const artistShort = booking.artist_id.replace(/-/g, "").slice(0, 6).toUpperCase()
  const isBusiness = booking.booking_type === "zakelijk"
  const djVatRegistered = billing?.is_vat_registered ?? false
  const issuerName = billing?.invoice_name || artist?.stage_name || "DJ"
  const issued: string[] = []

  // --- 1. Verkoopfactuur DJ -> klant ---
  if (!has.has("dj_sale")) {
    const saleGross = Number(booking.total)
    let saleNet = saleGross
    let saleVat = 0
    let saleNote: string | null = null
    if (djVatRegistered) {
      saleNet = r2(saleGross / (1 + VAT_RATE))
      saleVat = r2(saleGross - saleNet)
    } else {
      saleNote = KOR_NOTE
    }
    const recipientName = isBusiness
      ? booking.company_name || booker?.full_name || "Klant"
      : booker?.full_name || "Particuliere klant"
    const description =
      `Optreden${artist?.stage_name ? ` ${artist.stage_name}` : ""}` +
      (booking.occasion ? ` — ${booking.occasion}` : "")

    const { data: saleNumber } = await admin.rpc("next_invoice_number", {
      p_scope: `dj_sale:${booking.artist_id}`,
      p_prefix: artistShort,
      p_year: year,
    })

    await admin.from("invoices").insert({
      booking_id: bookingId,
      kind: "dj_sale",
      number: saleNumber as string,
      issuer_name: issuerName,
      issuer_address: billing?.invoice_address ?? null,
      issuer_vat: billing?.vat_number ?? null,
      issuer_kvk: billing?.kvk_number ?? null,
      recipient_name: recipientName,
      recipient_address: null,
      recipient_vat: isBusiness ? booking.vat_number : null,
      description,
      net: saleNet,
      vat_rate: djVatRegistered ? VAT_RATE : 0,
      vat_amount: saleVat,
      gross: saleGross,
      vat_note: saleNote,
      artist_id: booking.artist_id,
      booker_id: booking.booker_id,
    })
    issued.push("dj_sale")
  }

  // --- 2. Commissie-factuur MyGigs -> DJ (7% gage + 21% btw) ---
  if (!has.has("mg_commission")) {
    const commNet = Number(booking.service_fee)
    const commVat = r2(commNet * VAT_RATE)
    const commGross = r2(commNet + commVat)

    const { data: commNumber } = await admin.rpc("next_invoice_number", {
      p_scope: "mg_commission",
      p_prefix: "MG-C",
      p_year: year,
    })

    await admin.from("invoices").insert({
      booking_id: bookingId,
      kind: "mg_commission",
      number: commNumber as string,
      issuer_name: MYGIGS.name,
      issuer_address: MYGIGS.address,
      issuer_vat: MYGIGS.vat,
      issuer_kvk: MYGIGS.kvk,
      recipient_name: issuerName,
      recipient_address: billing?.invoice_address ?? null,
      recipient_vat: billing?.vat_number ?? null,
      description: "Bemiddelingscommissie MyGigs (7%)",
      net: commNet,
      vat_rate: VAT_RATE,
      vat_amount: commVat,
      gross: commGross,
      vat_note: null,
      artist_id: booking.artist_id,
      booker_id: booking.booker_id,
    })
    issued.push("mg_commission")
  }

  if (issued.length > 0) {
    await logAudit({
      action: "invoice.issued",
      targetType: "booking",
      targetId: bookingId,
      metadata: { kinds: issued },
    })
  }
}
