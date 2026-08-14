# Betaalprovider voor MyGigs — Mollie Connect of Stripe Connect

Datum: 14 augustus 2026. Status: besluitstuk, nog niet geïmplementeerd.
Tarieven gecontroleerd op de officiële prijspagina's van beide partijen.

## Wat MyGigs nodig heeft

1. **Escrow.** Geld staat vast bij MyGigs tot na het optreden en gaat daarna binnen
   vijf werkdagen naar de DJ. Dat betekent: betaling nu innen, uitbetaling later
   beslissen.
2. **Commissie.** 7% voor MyGigs, "verder geen verrassingen" — de klant mag geen
   losse providerkosten op zijn bon zien.
3. **iDEAL eerst.** Nederlandse markt, particuliere organisatoren.
4. **DJ's zijn geen bedrijven.** Vaak ZZP of hobbyist. Onboarding moet simpel zijn
   en de identiteitscontrole (KYC) moet bij de provider liggen, niet bij MyGigs.
5. **Abonnementen.** DJ-abonnementen bestaan al in het schema (`0004`) en op
   `/subscribe`; de provider moet ook terugkerende incasso aankunnen.

## Vergelijking

| | Mollie Connect | Stripe Connect |
|---|---|---|
| iDEAL | € 0,32 per transactie | € 0,29 per transactie |
| Kaarten (EER, consument) | 1,80% + € 0,25 | 1,5% + € 0,25 |
| Vaste maandkosten | geen | geen voor het platform zelf |
| Kosten per aangesloten DJ | geen | $ 2 per maand per actief account (alleen als MyGigs de tarieven bepaalt) |
| Uitbetaling naar DJ | inbegrepen in de routering | 0,25% + $ 0,25 per uitbetaling |
| Escrow-mechanisme | Delayed Routing: geld wordt vastgehouden, tot **90 dagen** om te verdelen | Separate charges & transfers: geld op platformsaldo, later overboeken |
| KYC van de DJ | Mollie doet de verificatie; onboarding vooraf ingevuld via Client Links | Stripe doet de verificatie; Express-onboarding |
| Bijzonderheid | Delayed Routing moet door Mollie worden vrijgeschakeld; verplicht bruto-afrekenen, kosten maandelijks gefactureerd | Rijker gereedschap: Billing, Radar, Tax |

## Rekenvoorbeeld: boeking van € 300, commissie € 21

**Mollie** — iDEAL € 0,32. Verder geen kosten per DJ of per uitbetaling.
Netto marge ≈ **€ 20,68 per boeking**.

**Stripe** — iDEAL € 0,29 plus uitbetaling van € 279 à 0,25% + € 0,25 = € 0,95.
Netto ≈ € 19,76 per boeking, plus $ 2 per maand voor elke DJ die dat maand een
uitbetaling krijgt. Bij 20 actieve DJ's is dat ± € 37 per maand extra.

Bij 100 boekingen per maand scheelt dat ruwweg **€ 130 per maand** in het voordeel
van Mollie. Bij lage volumes is het verschil klein; het schaalt tegen je op zodra
het aantal DJ's groeit.

## Aanbeveling: Mollie Connect

Drie redenen, in volgorde van gewicht:

1. **Delayed Routing is precies jouw escrow.** Je int nu, en beslist tot 90 dagen
   later wie wat krijgt. Bij Stripe bouw je hetzelfde na met losse charges en
   transfers — werkt prima, maar het is meer eigen logica en meer dat kan
   afwijken.
2. **Geen kosten per aangesloten DJ.** Jouw model leunt op veel DJ's met soms
   weinig gigs. Een vast bedrag per actief account straft precies dat.
3. **iDEAL-first en Nederlands.** Support, facturatie en documentatie sluiten aan
   op een NL-marktplaats met KOR-facturen en btw.

Kies Stripe als je binnen een jaar naar het buitenland wilt, of als je zwaar wilt
leunen op abonnementen, fraudefilters en automatische btw. Die gereedschapskist is
duidelijk rijker — maar je betaalt er per DJ voor.

## Wat er moet gebeuren (bij Mollie)

**Vooraf, buiten de code**

- Mollie-account op naam van MyGigs, en Delayed Routing laten vrijschakelen. Dit
  is een aanvraag, geen knop — plan er doorlooptijd voor in.
- Bruto-afrekenen betekent dat kosten maandelijks apart gefactureerd worden. Even
  afstemmen met je boekhouding, want je factuurlogica gaat nu uit van netto.

**Database (migratie 0032)**

- `payments`: `provider`, `provider_payment_id`, `route_id`, `provider_status`.
- `payouts`: `provider_transfer_id`, `routed_at`.
- `artists`: `mollie_organization_id`, `onboarding_status`, `can_receive_payments`.
- Indexen op de provider-ID's; RLS-policies gelijk aan de bestaande tabellen.

**Routes**

- `POST /api/payments/create` — betaling aanmaken met delayed routing, klant
  doorsturen naar de betaalpagina van Mollie.
- `POST /api/webhooks/mollie` — statuswijzigingen; altijd de betaling opnieuw
  ophalen bij Mollie in plaats van de payload vertrouwen.
- `POST /api/cron/release-escrow` — na afloop van de gig én bevestiging door de
  klant het bedrag routeren: 93% naar de DJ, 7% naar MyGigs.
- `GET /api/connect/onboarding` + callback — DJ koppelt of maakt zijn
  Mollie-organisatie; status tonen op het DJ-dashboard.

**Frontend**

- `pay-form.tsx`: de gesimuleerde betaling en de hardgecodeerde banklijst eruit.
  Mollie regelt de bankkeuze zelf op de betaalpagina.
- DJ-profiel: blokkeer boekingen accepteren tot `can_receive_payments` waar is.

**Opruimen**

- `app/api/webhooks/stripe/route.ts` (nu een stub die 501 teruggeeft) verwijderen,
  en de Stripe Connect-vermelding in `CLAUDE.md` vervangen door Mollie.

## Nog te verifiëren voordat je begint

- Accepteert Mollie MyGigs als marktplaats, en op welke termijn wordt Delayed
  Routing vrijgeschakeld?
- Mogen DJ's zonder KVK-inschrijving een Mollie-organisatie krijgen, of moet je
  voor hobbyisten een andere route bedenken?
- Blijft de 7%-belofte kloppen als de providerkosten maandelijks gefactureerd
  worden in plaats van per transactie ingehouden?
