const nl = {
  backToBookings: "← Terug naar boekingen",
  print: "Download / print PDF",
  tagline: "Het boekingsplatform voor DJ's en events.",
  invoice: "Factuur",
  date: "Datum: {date}",
  from: "Van",
  fromName: "MyGigs B.V.",
  fromCity: "Amsterdam, Nederland",
  fromVat: "BTW: NL000000000B00",
  billTo: "Factuur aan",
  companyUnknown: "Bedrijfsnaam onbekend",
  vatLabel: "BTW: {vat}",
  description: "Omschrijving",
  amountExclVat: "Bedrag (excl. BTW)",
  performance: "Optreden {name}",
  defaultDj: "DJ",
  subtotal: "Subtotaal",
  vat: "BTW ({rate})",
  total: "Totaal",
  footer:
    "Betaling verloopt via MyGigs. Het bedrag staat veilig in escrow tot na het optreden. Deze factuur is automatisch gegenereerd en geldig zonder handtekening.",
}

const en: typeof nl = {
  backToBookings: "← Back to bookings",
  print: "Download / print PDF",
  tagline: "The booking platform for DJs and events.",
  invoice: "Invoice",
  date: "Date: {date}",
  from: "From",
  fromName: "MyGigs B.V.",
  fromCity: "Amsterdam, Netherlands",
  fromVat: "VAT: NL000000000B00",
  billTo: "Bill to",
  companyUnknown: "Company name unknown",
  vatLabel: "VAT: {vat}",
  description: "Description",
  amountExclVat: "Amount (excl. VAT)",
  performance: "Performance {name}",
  defaultDj: "DJ",
  subtotal: "Subtotal",
  vat: "VAT ({rate})",
  total: "Total",
  footer:
    "Payment is handled via MyGigs. The amount is held securely in escrow until after the performance. This invoice is generated automatically and valid without a signature.",
}

export const dict = { nl, en }
