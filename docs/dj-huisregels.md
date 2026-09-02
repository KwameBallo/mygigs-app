# MyGigs huisregels voor DJ's

Status: voorstel, 2 september 2026. Jouw drie regels zijn de kern, hieronder
aangevuld tot een lijst die ook de veiligheid van gasten en de zekerheid van de
organisator dekt.

## De regels

Formulering is bewust kort en in de jij-vorm. Elke regel heeft één zin met het
waarom erbij, want een regel die je niet snapt houd je niet.

**1. Je draait nuchter.**
Geen alcohol en geen drugs voor of tijdens je optreden. Je bent er om te
presteren, en de organisator betaalt voor je beste set.

**2. Je meldt je uiterlijk 24 uur van tevoren af.**
Lukt het echt niet, dan doe je dat via de knop in de app. Zo weten de
organisator én MyGigs het tegelijk, en kunnen wij nog een vervanger zoeken.

**3. Je kleedt je naar het thema.**
Staat er een dresscode bij de boeking, dan volg je die. Bij twijfel vraag je het
in de chat, niet op de avond zelf.

**4. Je bent op tijd.**
Minimaal 45 minuten voor aanvang aanwezig, zodat je rustig kunt opbouwen en
soundchecken. Je checkt in via de app zodra je er bent.

**5. Je draait zelf.**
Je stuurt geen vervanger zonder dat MyGigs en de organisator daarmee akkoord
zijn. De organisator heeft jou geboekt, niet iemand anders.

**6. Je houdt je aan de afgesproken tijden.**
Begin- en eindtijd staan in de boeking. Langer doordraaien mag, maar leg het
eerst vast in de app zodat het ook betaald en verzekerd is.

**7. Je bent respectvol naar gasten en personeel.**
Geen intimidatie, discriminatie of ongewenste avances, op geen enkele manier.
Eén melding hierover is genoeg voor ons om je profiel direct te pauzeren.

**8. Je volgt de regels van de locatie.**
Geluidsnormen, eindtijd, rookbeleid en aanwijzingen van de beveiliging of de
geluidstechnicus. Zij zijn verantwoordelijk voor de vergunning.

**9. Je apparatuur is veilig.**
Deugdelijke kabels, niets in looppaden, niets dat kan omvallen. Schade die jij
veroorzaakt is voor jouw rekening.

**10. Je regelt alles via MyGigs.**
Betalingen, wijzigingen en afspraken lopen via het platform. Geen contante
deals buiten de app om, want dan vervallen je bescherming, je factuur en je
reviews.

**11. Je gaat netjes om met gegevens.**
Adres, telefoonnummer en plattegrond van de klant gebruik je alleen voor deze
boeking. Niet delen, niet bewaren, niet hergebruiken.

**12. Je filmt met toestemming.**
Content maken mag en is goed voor je profiel, maar vraag het aan de organisator
en film geen herkenbare gasten die dat niet willen.

## Wat MyGigs daar tegenover zet

Regels die alleen één kant op werken voelen als een bureau. Zet er daarom dit
onder, zichtbaar op dezelfde pagina:

- Je gage staat vast en veilig op het platform voordat je draait.
- Je wordt binnen vijf werkdagen na het optreden uitbetaald, met factuur.
- Zegt de organisator af binnen 24 uur, dan houd jij je gage.
- Bij een geschil kijkt MyGigs mee en horen we altijd beide kanten.

## Waar de regels staan

1. **Bij aanmelden als DJ.** Een vinkje "ik ken en volg de huisregels", met de
   versie en de datum in de database. Zonder akkoord geen zichtbaar profiel.
2. **Op je profielpagina**, inklapbaar, altijd terug te lezen.
3. **In het scherm waar je een boeking accepteert.** Alleen regel 1 tot en met 4
   in het kort, want dat zijn de regels die op de avond zelf misgaan.
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
| Melding over regel 1 of regel 7 | Profiel direct op pauze, wij onderzoeken en horen beide kanten |
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
