const nl = {
  back: "Terug",
  print: "Print / opslaan als PDF",
  kindSale: "Verkoopfactuur",
  kindCommission: "Commissie-factuur",
  number: "Factuurnummer",
  date: "Factuurdatum",
  from: "Afzender",
  to: "Aan",
  vatLabel: "Btw-nr: {vat}",
  kvkLabel: "KVK: {kvk}",
  description: "Omschrijving",
  amountExcl: "Bedrag excl. btw",
  subtotal: "Subtotaal",
  vat: "Btw ({rate})",
  total: "Totaal",
  paidViaMyGigs: "Betaald via MyGigs — het bedrag staat in escrow tot na het optreden.",
  footer:
    "Factuur gegenereerd via MyGigs. Bewaar dit document voor je administratie (bewaarplicht 7 jaar).",
}

const en: typeof nl = {
  back: "Back",
  print: "Print / save as PDF",
  kindSale: "Sales invoice",
  kindCommission: "Commission invoice",
  number: "Invoice number",
  date: "Invoice date",
  from: "From",
  to: "To",
  vatLabel: "VAT no: {vat}",
  kvkLabel: "CoC: {kvk}",
  description: "Description",
  amountExcl: "Amount excl. VAT",
  subtotal: "Subtotal",
  vat: "VAT ({rate})",
  total: "Total",
  paidViaMyGigs: "Paid via MyGigs — the amount is held in escrow until after the performance.",
  footer:
    "Invoice generated via MyGigs. Keep this document for your records (7-year retention).",
}

export const dict = { nl, en }
