const nl = {
  brandTagline: "Be the star you want to be",
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
  paidViaMyGigs:
    "Betaald via MyGigs — het bedrag staat in escrow tot na het optreden en wordt binnen 5 werkdagen uitbetaald.",
  payoutTitle: "Uitbetalingsspecificatie",
  payoutHint:
    "Alleen zichtbaar voor jou — dit staat niet op de factuur aan de klant.",
  payoutGross: "Bruto boekingsbedrag",
  payoutCommission: "MyGigs-commissie (7%, excl. btw)",
  payoutNet: "Netto uitbetaling",
  payoutVatNote:
    "Over de commissie berekenen wij 21% btw ({vat}) via een aparte commissie-factuur — voor btw-plichtige DJ's verrekenbaar.",
  equip: {
    Microfoon: "Microfoon (huur)",
    Draaitafel: "Draaitafel (huur)",
    Speakers: "Speakers (huur)",
    Verlichting: "Verlichting (huur)",
    Bass: "Bass (huur)",
  } as Record<string, string>,
}

const en: typeof nl = {
  brandTagline: "Be the star you want to be",
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
  paidViaMyGigs:
    "Paid via MyGigs — held in escrow until after the performance and paid out within 5 business days.",
  payoutTitle: "Payout breakdown",
  payoutHint: "Only visible to you — this is not shown on the client invoice.",
  payoutGross: "Gross booking amount",
  payoutCommission: "MyGigs commission (7%, excl. VAT)",
  payoutNet: "Net payout",
  payoutVatNote:
    "We charge 21% VAT ({vat}) on the commission via a separate commission invoice — reclaimable for VAT-registered DJs.",
  equip: {
    Microfoon: "Microphone (rental)",
    Draaitafel: "Turntable (rental)",
    Speakers: "Speakers (rental)",
    Verlichting: "Lighting (rental)",
    Bass: "Bass (rental)",
  } as Record<string, string>,
}

export const dict = { nl, en }
