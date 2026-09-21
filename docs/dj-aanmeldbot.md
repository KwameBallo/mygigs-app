# DJ-aanmeldbot

Plan voor het automatisch aanmaken van DJ-profielen uit binnenkomende berichten.
Besproken op 20 september 2026. Nog niet gebouwd.

## Wat het moet doen

Zoveel mogelijk DJ's op MyGigs krijgen zonder dat een DJ een formulier van tien
velden hoeft in te vullen. De DJ stuurt losse informatie, wij maken er een
compleet profiel van. Kwame keurt elk profiel eerst goed voordat het meetelt.

## Keuzes die al gemaakt zijn

| Vraag | Keuze |
| --- | --- |
| Kanalen | E-mail naar aanmelden@mygigs.nl en Instagram-DM |
| Herkomst | Zowel DJ's die zichzelf aanmelden als DJ's die Kwame zelf vindt |
| Publicatie | Kwame keurt elk profiel handmatig goed |

## Wat technisch niet kan

Instagram werkt alleen als binnenkomend kanaal. De Instagram Messaging API
laat je uitsluitend antwoorden binnen 24 uur nadat iemand jou een bericht heeft
gestuurd. Zelf een DM beginnen naar een gevonden DJ kan niet via de API, en
handmatig automatiseren is in strijd met de voorwaarden van Meta. Instagram is
dus geen wervingskanaal, alleen een aanmeldkanaal.

## Wat de wet vraagt

Een DJ is meestal een eenmanszaak en wordt in de Telecommunicatiewet ongeveer
als een particulier behandeld. Eén nette mail met een duidelijke afmeldknop kan.
Een reeks herinneringen naar iemand die niet reageert, wordt spam.

Bij profielen van DJ's die er zelf niet om gevraagd hebben geldt bovendien:

- alleen openbare, zakelijke gegevens: artiestennaam, stad, genre, boekingsmail
  uit hun eigen site of Instagram-bio. Geen privénummers, geen geschraapte
  volgerslijsten
- de DJ moet binnen een maand horen dat er een profiel is, of bij het eerste
  contact
- één klik om het profiel te laten verwijderen, zonder in te loggen
- het profiel blijft onzichtbaar tot de DJ het zelf opeist

Dat laatste punt is een advies en geen keuze van Kwame. Reden: een site vol
profielen van DJ's die er niets van weten levert boze mails op in plaats van
aanmeldingen, en boekers die op een dood profiel klikken komen niet terug.
Opnieuw bespreken voordat we bouwen.

## Onderdelen

1. **Tabel `dj_leads`** met RLS. Velden: herkomst (mail, instagram, handmatig),
   het ruwe bericht, de uitgelezen velden, status, opeis-token, tijdstippen.
   Status doorloopt: nieuw, in behandeling, goedgekeurd, afgewezen, opgeëist.
2. **Binnenkomende mail** op aanmelden@mygigs.nl die in die tabel landt.
   TransIP levert de mailbox, dus of doorsturen naar een webhook, of een
   periodieke ophaler via IMAP.
3. **Uitlezer** die van vrije tekst of een Instagram-bio nette velden maakt:
   naam, stad, genres, tarief, bio, foto. De app heeft al AI aan boord in
   `lib/ai`, dat hergebruiken.
4. **Wachtrij in het beheerscherm**: ruw bericht links, uitgelezen velden
   rechts, aanpassen en goedkeuren.
5. **Bij goedkeuren**: profiel aanmaken plus een opeis-mail versturen. Pas als
   de DJ op die link klikt maken we het echte account met wachtwoord. Tot dat
   moment bestaat er geen inlog, dus valt er ook niets te kapen.
6. **Plakveld op de site**: "plak je Instagram-bio of SoundCloud-link", de bot
   vult de rest in. Waarschijnlijk het beste wervingskanaal, want het kost de
   DJ tien seconden.

## Volgorde

Eerst punt 1 tot en met 6 zonder Instagram. Dat kan zonder toestemming van
buitenaf en draait binnen een paar avonden.

Instagram komt erbij zodra Meta goedkeuring geeft. Daarvoor is nodig: een
Meta-ontwikkelaarsaccount, een zakelijk Instagram-profiel gekoppeld aan een
Facebook-pagina, en goedkeuring voor het beheren van berichten. Reken op weken.

## Randvoorwaarden

- `SUPABASE_SERVICE_ROLE_KEY` blijft aan de serverkant. Het aanmaken van
  accounts gebeurt nooit in de browser.
- Alle databasewijzigingen via een migratie in `supabase/migrations/`.
- RLS op `dj_leads` met expliciete regels. Alleen beheerders lezen de wachtrij.
- Snelheidsbegrenzing en ontdubbeling op e-mailadres en Instagram-naam, anders
  loopt de wachtrij vol met rommel.
- De privacyverklaring moet een alinea krijgen over hoe profielen ontstaan, met
  daarin de verwijderlink.

## Stand van zaken

**Gebouwd op 21 september 2026:**

- Migratie `0036_dj_leads.sql`: de tabel, ontdubbeling op mailadres en
  Instagram-naam, grenzen op alle velden, bron verplicht bij zelf gevonden
  DJ's, reden verplicht bij afwijzen. RLS aan zonder regels: alleen de server
  komt erbij. Getest in een lege Postgres, ook twee keer achter elkaar.
- `lib/ai/extract-dj.ts`: de uitlezer. Werkt zonder AI-sleutel met eenvoudige
  herkenning, en met `ANTHROPIC_API_KEY` leest Claude mee.
- `/admin/aanmeldingen`: de wachtrij met tabbladen per status, en een vak om
  zelf een DJ toe te voegen door zijn bio of bericht te plakken.
- `/admin/aanmeldingen/[id]`: origineel links, velden rechts, opslaan,
  goedkeuren, afwijzen met reden, weer openzetten. Waarschuwing als de DJ zich
  niet zelf aanmeldde, en als hij mogelijk al op MyGigs staat.
- Alle knoppen controleren zelf of je beheerder bent met bevestigde 2FA, en
  schrijven naar het audit-log.

**Nog te doen, in deze volgorde:**

1. Beslissen: profielen van zelf gevonden DJ's zichtbaar of verborgen tot ze
   zijn opgeeist. Bepaalt stap 2.
2. Goedkeuren laat nu alleen de status veranderen. Nog bouwen: het profiel in
   `artists` aanmaken en de opeismail versturen, met de opeispagina erbij.
3. Binnenkomende mail op aanmelden@mygigs.nl koppelen.
4. Plakveld op de site voor DJ's zelf.
5. Instagram, na goedkeuring door Meta.
6. Afgewezen aanmeldingen na een vaste termijn automatisch opruimen (AVG:
   niet langer bewaren dan nodig).

Losse vondst: het genre "Feest / Après-ski" staat met een kapotte è in de
database ("AprÃ¨s-ski"). Eén regel SQL om te herstellen.
