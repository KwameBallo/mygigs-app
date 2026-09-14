# Huisregels tegen de app gelegd

Controle van 7 september 2026: klopt wat er in de huisregels staat met wat de
app daadwerkelijk doet? Per regel de belofte, wat er in de code staat, en het
oordeel. Regels zonder app-functie zijn gedragsregels: die hoeven nergens in de
code te staan, ze horen alleen niet te verwijzen naar knoppen die niet bestaan.

## Kort

| Regel | Belofte | Oordeel |
|---|---|---|
| 1 No Alcohol | gedragsregel | klopt |
| 2 Afmelden 24 uur vooraf | "via de afmeldknop" | gebouwd op 7 september |
| 2 PS | review bij No-Show | **klopt half** |
| 3 Kledingvoorschriften | "bij de boeking doorgegeven" | **geen veld voor** |
| 4 Op tijd aanwezig | schema | klopt, inclusief check-in |
| 5 We want more! | "prijs wordt automatisch doorberekend" | **bestaat niet** |
| 6 Respect | gedragsregel | klopt |
| 7 AVG Bescherming | gedragsregel | klopt |
| 8 Film overeenkomst | gedragsregel | klopt |

En van de vier beloftes van MyGigs op het slotscherm zijn er twee nog niet waar
te maken. Zie onderaan.

## Regel 2: de afmeldknop

**Gebouwd op 7 september 2026.** Op de boekingskaart in het DJ-dashboard, in
het uitgeklapte deel, staat nu "Ik kan niet komen". Die opent een scherm dat
eerst laat zien hoeveel uur er nog te gaan zijn en wat dat betekent, vraagt om
een reden uit een lijst plus een optionele toelichting, en laat de DJ
bevestigen dat de organisator direct bericht krijgt.

Wat er daarna gebeurt:

| | |
|---|---|
| Boeking | status `cancelled`, met `cancelled_by`, `cancel_reason_code`, `cancel_reason`, `cancelled_at` en `cancel_notice_hours` |
| Agenda | het tijdvak komt vrij, want de overlapcheck telt alleen accepted, paid en completed |
| Uitbetaling | een ingeplande uitbetaling gaat naar `cancelled` |
| Organisator | mail: de DJ kan niet komen, wij zoeken een vervanger, je geld komt terug. Zonder de reden, die is voor ons |
| MyGigs | mail naar `SUPPORT_EMAIL` met reden, uren vooraf, bedrag en of er terugbetaald moet worden |
| Audit | `booking.cancel_by_artist` in `audit_log` |

Bewust een eigen server action (`cancelBookingAsArtist`) en niet via
`updateBookingStatus`: daar blijft `cancelled` verboden, zodat een afmelding
nooit zonder reden en zonder bericht kan plaatsvinden.

**Nog niet gebouwd:** automatisch een vervanger zoeken onder beschikbare DJ's,
en de daadwerkelijke terugbetaling. Dat laatste kan pas als er een echte
betaalprovider hangt; tot die tijd is de mail naar support het startsein.

## Regel 2 PS: review bij een No-Show

Half waar.

- **Wel:** de klant kan een review achterlaten. `submitReview()` staat dat toe
  bij status `completed`, of `paid` met een datum in het verleden.
- **Niet:** er is geen No-Show om aan te klikken. Een review is één tot vijf
  sterren plus een tekstvak, meer niet. Het woord no-show komt in de hele
  reviewflow niet voor.
- **Niet:** "binnen 24 uur" klopt niet met de app. Het reviewverzoek gaat
  ongeveer drie uur na het einde van het optreden de deur uit
  (`/api/cron/review-requests`), en daarna staat er geen termijn op.
- **Let op:** is er nooit betaald, dan staat de boeking op `accepted` en kan de
  klant helemaal geen review achterlaten. Juist bij een no-show is dat een gat.

**Nodig:** een keuze No-Show in het reviewformulier, of de PS anders
formuleren.

## Regel 3: kledingvoorschriften

Het boekingsformulier (`book-form.tsx`) heeft deze velden: gelegenheid, datum,
tijden, locatie, apparatuur, zakelijke gegevens en een vrij tekstvak
(`message`). Een dresscode of thema kan alleen in dat tekstvak of in de chat.
De DJ krijgt dus geen los veld te zien waar hij zich aan moet houden.

**Nodig:** een veld `dresscode` op `bookings` plus een regel in het formulier,
of de regel herschrijven naar "staat er iets over kleding in de aanvraag of de
chat".

## Regel 4: op tijd aanwezig

Deze wordt wel gedekt. De boeking heeft `checkin_at`, `checkin_lat/lng`,
`checkin_distance_m` en `checkin_verified`, er is een straal waarbinnen de
check-in geldig is (`CHECKIN_RADIUS_M`), er is "ik ben onderweg" met een
verwachte aankomsttijd, en er gaat een herinnering uit
(`/api/cron/booking-reminders`). De klant bevestigt achteraf zelf dat de DJ er
was (`confirmDjAttendance`).

## Regel 5: We want more!

Deze belooft het meest en levert het minst. Er is in de hele app geen manier om
een lopende boeking te verlengen. `hours`, `gage` en `total` worden bij het
aanmaken van de boeking gezet en daarna door niemand meer aangepast: de DJ mag
alleen een status zetten, de boeker alleen annuleren, bevestigen of betalen. Er
is geen actie die tijd optelt en geen die de prijs herberekent.

Erger nog: op het moment dat er langer gedraaid wordt, is er meestal al
betaald. De betaling is één bedrag (`payments.status = 'held'`), de factuur is
al gemaakt en de uitbetaling staat al ingepland op het oude bedrag. Bijbetalen
raakt dus vier dingen tegelijk: boeking, betaling, factuur en uitbetaling.

**Nodig:** een verlengactie met bevestiging van beide kanten, een tweede
betaling, en een creditering of aanvullende factuur. Dat is echt werk. Tot die
tijd zou ik de regel eerlijk maken: langer draaien meld je in de app of in de
chat, en wij verrekenen het bij de uitbetaling.

## Regels 1, 6, 7 en 8

Gedragsregels, die hoeven niet in code te bestaan. Twee kanttekeningen:

- Er is geen meldknop bij een boeking. Een klacht over regel 1 of 6 loopt nu
  via de klantenservicepagina of via het markeren van een chat. Dat kan
  prima voor nu, maar weet dat er geen knop "meld een probleem" op de boeking
  zelf zit.
- Een profiel op pauze zetten kan alleen handmatig via de admin (`artists.online`
  op false). De strikes uit het eerdere voorstel bestaan niet: er is geen tabel
  `artist_strikes`.

## De vier beloftes op het slotscherm

| Belofte | Status |
|---|---|
| Je gage staat veilig op het platform voordat je draait | in de app-logica ja: bij betaling komt er een rij in `payments` met status `held`. Maar de betaalprovider is nog een simulatie (`provider: "mock"`), dus er staat nog geen echt geld vast |
| Binnen vijf werkdagen uitbetaald, met factuur | de factuur wordt echt gemaakt, de uitbetaling komt als `scheduled` in `payouts`. Er is geen proces dat die op `paid` zet: dat doe je nu met de hand |
| Zegt de organisator binnen 24 uur af, dan houd jij je gage | **niet geïmplementeerd.** `cancelBooking()` kijkt niet naar de datum en doet niets met geld |
| Bij een geschil kijkt MyGigs mee | klopt, via de klantenservice |

Nog iets buiten de huisregels: op de landingspagina staat een
"Niet-verschijn-garantie: komt de DJ niet opdagen, dan krijg je je volledige
bedrag terug". Er is geen terugbetaling in de code. De waarde `refunded` bestaat
wel in `payments.status`, maar niets zet hem. Dat is een belofte aan de klant,
dus die weegt zwaarder dan de rest van deze lijst.

## Volgorde die ik zou aanhouden

1. ~~De afmeldknop bouwen.~~ Gedaan op 7 september.
2. De tekst van regel 5 eerlijk maken, en het verlengen later bouwen.
3. No-Show als keuze in het reviewformulier, of de PS herschrijven.
4. Dresscode als veld bij de boeking, of regel 3 herschrijven.
5. Terugbetalen bij een no-show, want dat is de belofte aan de klant.
