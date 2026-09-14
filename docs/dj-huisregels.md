# MyGigs huisregels voor DJ's

Status: vastgesteld door Kwame, 7 september 2026. Versie 2
(`HOUSE_RULES_VERSION` in `lib/rules.ts`). Acht regels, waarvan vijf
kernafspraken.

## De afspraken

Toon: afspraken tussen twee partijen, geen bevelen. De regels met de
aanduiding kernafspraak staan ook in het korte lijstje bij het accepteren
van een boeking.

**1. No Alcohol.** (kernafspraak)
We vragen je om zonder alcohol of drugs te draaien. Je kwaliteiten zijn on point en de atmosfeer tijdens je gig. Denk ook aan de veiligheid van jou en die van een ander.

**2. Afmelden 24 uur van tevoren.** (kernafspraak)
Kan je boeking door omstandigheden niet doorgaan? Laat dit zo snel mogelijk weten via de afmeldknop. Zo hebben we tijd om zo snel mogelijk een vervanger te vinden.
PS: Binnen 24 uur kan de klant een review achterlaten voor een No-Show.

**3. Kledingvoorschriften.** (kernafspraak)
Is er bij de boeking een dresscode of thema doorgegeven? Houd je daaraan, zo bezorg je de klant een prachtige dag. Ook jouw mening telt: geef vroegtijdig aan als je dat niet wilt.

**4. Op tijd aanwezig.** (kernafspraak)
Wees op tijd op de afgesproken locatie, volgens schema.

**5. We want more!**
Is je set geweldig en wil de klant je langer laten draaien? Geef dit aan in de app, dan passen we de betaling aan. Je verlengt simpelweg de tijd en de prijs wordt automatisch doorberekend.

**6. Respect voor gasten en personeel.** (kernafspraak)
Iedereen moet zich veilig voelen op de vloer. Let's make it happen!

**7. AVG Bescherming.**
De gegevens van de klant mogen niet gedeeld worden. Houd de gegevens privé.

**8. Film overeenkomst.**
Content maken voor je profiel is top! Bespreek dit met de klant om verwarring te voorkomen.

## Wat MyGigs daar tegenover zet

Regels die alleen één kant op werken voelen als een bureau. Zet er daarom dit
onder, zichtbaar op dezelfde pagina:

- Je gage staat vast en veilig op het platform voordat je draait.
- Je wordt binnen vijf werkdagen na het optreden uitbetaald, met factuur.
- Zegt de organisator af binnen 24 uur, dan houd jij je gage.
- Bij een geschil kijkt MyGigs mee en horen we altijd beide kanten.

## Waar de regels staan

1. **Als doorklikker op je profielpagina.** Eén afspraak per scherm, met de
   reden erbij. De akkoordknop staat pas op het laatste scherm, en de knop
   "Volgende" gaat per afspraak anderhalve seconde op slot. Zo is elke regel
   aantoonbaar in beeld geweest en is doorrammen geen optie. Datum en versie
   gaan bij akkoord de database in. Zonder akkoord geen zichtbaar profiel.
2. **Op je profielpagina**, na akkoord ingeklapt onder "Alle afspraken onder
   elkaar", altijd terug te lezen. De knop "Teruglezen" opent dezelfde
   doorklikker, dan zonder akkoordstap.
3. **In het scherm waar je een boeking accepteert.** Alleen de kernafspraken in
   het kort, want dat zijn de regels die op de avond zelf misgaan.
4. **Op het publieke DJ-profiel**, als geruststelling voor de organisator:
   "Deze DJ werkt volgens de MyGigs-huisregels."

Wijzig je later de regels, dan verhoog je het versienummer en vraag je opnieuw
akkoord. Dat is ook wat je nodig hebt als je je ooit op die regels wilt
beroepen.

## Afmelden: hoe de knop werkt

**Waar.** Op de boekingskaart in het DJ-dashboard, bij een geaccepteerde
boeking. Onopvallend, niet naast de knop waarmee je accepteert, zodat niemand
zich per ongeluk afmeldt.

**Wat de DJ ziet.**

1. Knop: *Ik kan niet komen*.
2. Een scherm dat eerst laat zien hoeveel uur er nog tot het optreden zit, en
   wat dat betekent: meer dan 24 uur is vervelend maar netjes, minder dan 24 uur
   telt als late afmelding en is zichtbaar in je betrouwbaarheid.
3. Een verplichte reden, uit een lijst plus een tekstvak: ziekte, ongeval,
   dubbele boeking, vervoer, privéomstandigheden, anders.
4. Bevestigen met een vinkje: "ik begrijp dat de organisator hier direct bericht
   van krijgt".

**Wat er daarna gebeurt, automatisch.**

| Wie | Krijgt |
|---|---|
| Organisator | Push en e-mail: geannuleerd door de DJ, met de reden en de mededeling dat MyGigs een vervanger zoekt. Het bedrag komt terug uit escrow |
| MyGigs | Melding in de admin met boeking, DJ, reden en hoeveel uur van tevoren |
| Andere DJ's | Bij minder dan 72 uur: bericht aan beschikbare DJ's in dezelfde provincie met hetzelfde genre en een passend tarief |
| De DJ zelf | Bevestiging, plus wat dit betekent voor zijn betrouwbaarheid |

**Statussen in de database.** De boeking gaat naar `cancelled`, met erbij wie
annuleerde (`cancelled_by`), waarom (`cancel_reason`), wanneer
(`cancelled_at`) en hoeveel uur van tevoren (`cancel_notice_hours`). Dat laatste
veld is belangrijk: daarmee kun je later zonder rekenwerk zien of het op tijd
was.

## Betrouwbaarheid en gevolgen

Dit is een voorstel, geen wet. Kies wat je wilt en dan bouwen we het.

| Situatie | Gevolg |
|---|---|
| Afmelden, meer dan 24 uur van tevoren | Geen sanctie. Telt wel mee in je afmeldpercentage |
| Afmelden, minder dan 24 uur van tevoren | Eén tik. Zichtbaar in je interne betrouwbaarheidsscore |
| Niet komen opdagen | Twee tikken, profiel op pauze tot je MyGigs hebt gesproken. Organisator krijgt alles terug |
| Melding over regel 1 of regel 6 | Profiel direct op pauze, wij onderzoeken en horen beide kanten |
| Drie tikken in twaalf maanden | Profiel offline tot een gesprek |

Tikken vervallen na twaalf maanden. Toon de DJ zijn eigen stand, zodat het geen
zwarte doos is.

Wat ik **niet** zou doen in de eerste versie: een boete rekenen bij een late
afmelding. Dat kan alleen als het netjes in je algemene voorwaarden staat, het
levert discussie op bij ziekte, en je hebt er nog geen incassoproces voor. Een
zichtbare betrouwbaarheidsscore werkt bij marktplaatsen aantoonbaar beter dan
een boete, want het raakt direct het aantal boekingen.

## Wat er gebouwd moet worden

**Migratie 0033**

- `artists`: `rules_accepted_at timestamptz`, `rules_version int`.
- `bookings`: `cancelled_by text` (artist of booker of admin), `cancel_reason text`,
  `cancel_reason_code text`, `cancelled_at timestamptz`, `cancel_notice_hours int`.
- `artist_strikes`: id, artist_id, booking_id, kind, weight, created_at,
  expires_at. Met RLS: de DJ leest alleen zijn eigen rijen.

**Code**

- `app/(artist)/dashboard/cancel-booking.tsx`: de knop met het bevestigingsscherm.
- `cancelBookingAsArtist()` in de bestaande dashboard-actions: status zetten,
  tikken bijschrijven, escrow vrijgeven richting de organisator, meldingen
  versturen.
- `lib/email.ts`: twee sjablonen, één voor de organisator en één voor MyGigs.
- Zoeken naar een vervanger: hergebruik de bestaande beschikbaarheidslogica en
  stuur een push naar de eerste tien passende DJ's.
- Huisregels als één bron in `lib/rules.ts`, zodat de tekst op alle vier de
  plekken uit hetzelfde bestand komt en er nooit twee versies rondlopen.
