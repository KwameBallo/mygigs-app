# MyGigs agents

Plan voor de automatische hulpjes die MyGigs draaiende houden zodra er
betalende klanten zijn. Opgesteld 23 september 2026.

## Uitgangspunten

1. **Twee soorten werk.** Vaste regels doen we met gewone code op een
   tijdschema. Alleen waar een oordeel nodig is zetten we AI in. Dat is
   goedkoper, sneller en voorspelbaarder.
2. **Geen agent raakt geld aan.** Uitbetalen, terugbetalen en prijzen wijzigen
   blijft handwerk. Agents bereiden voor, jij drukt op de knop.
3. **Geen agent keurt zelf een DJ goed.** De AVG vraagt bij besluiten over
   mensen om een mens in de lus. De agent geeft een advies met onderbouwing.
4. **Alles komt in het audit-log**, net als de knoppen in het beheerscherm nu.
5. **Noodknop per agent.** Eén schakelaar in de database zet een agent stil
   zonder de rest te raken.
6. **Uitgavenplafond** op de AI-sleutel, zodat een lus nooit je tegoed opmaakt.

## Waar het draait

Zoals de bestaande taken: een route onder `app/api/agents/<naam>`, beveiligd met
`CRON_SECRET`, gestart door de planner van Vercel. De service-role-sleutel en de
AI-sleutel blijven aan de serverkant. Elke run schrijft een regel in
`agent_runs`, zodat je altijd kunt zien wat er gebeurd is en wat het kostte.

## De agents

| Naam | Taak | Wat hij doet | Wanneer | AI nodig |
| --- | --- | --- | --- | --- |
| Wolf | waakhond | Fouten, vastgelopen boekingen, mislukte betalingen en taken die niet draaien opsporen en melden | elk kwartier | nee |
| Nova | boekingsbewaker | Herinneren aan het optreden, en aanvragen die blijven liggen opvolgen en sluiten | elk kwartier | nee |
| Kas | geldloper | Betalingen, escrow en uitbetalingen naast elkaar leggen en afwijkingen melden | dagelijks | nee |
| Fleur | klantcontact | Binnenkomende vragen lezen, antwoord voorstellen, moeilijke gevallen naar jou | elke 10 minuten | ja |
| Sam | poortwachter | Nieuwe DJ-aanmeldingen beoordelen op echtheid en volledigheid, advies geven | bij elke aanmelding | ja |
| Juno | kwaliteit | Reviews ophalen, klachten signaleren, slapende profielen wakker maken | wekelijks | deels |
| Rio | groei | Berichten voor social media voorbereiden, passende DJ's zoeken | wekelijks | ja |
| Bo | opruimer | Afgewezen aanmeldingen en oude gegevens verwijderen volgens de AVG | dagelijks | nee |

De naam staat in `agent_settings.display_name` en is los van de sleutel waarmee
de code werkt. Een agent hernoemen is dus één regel SQL en breekt niets.

## Wat we eerst bouwen

**Stap 1: Wolf, de waakhond.** Voorkomt dat je klanten kwijtraakt zonder het te weten.
Hij kijkt naar:

- taken die hadden moeten draaien maar niet gedraaid hebben
- boekingen die vastzitten in een status die niet klopt
- betalingen die zijn gestart maar niet afgerond
- mails die niet verstuurd konden worden
- fouten in de app, via de logregels van Vercel

Bij iets wat aandacht vraagt stuurt hij één bericht, niet tien. Dezelfde
melding komt hooguit één keer per dag terug.

**Stap 2: Nova, de boekingsbewaker.** Gebouwd, draait elk kwartier.

Herinneren aan een optreden, naar de DJ én de boeker:

| Moment | Toon |
| --- | --- |
| 48 uur ervoor | het komt eraan |
| 24 uur ervoor | morgen is het zo ver |
| 3 uur ervoor | praktisch: op tijd vertrekken, aankomst in de app zetten |

Aanvragen die blijven liggen:

| Situatie | Na | Actie |
| --- | --- | --- |
| DJ reageert niet | 4 uur | por naar de DJ |
| DJ reageert niet | 24 uur | laatste kans naar de DJ, boeker hoort dat we erachteraan zitten |
| DJ reageert niet | 48 uur | aanvraag wordt gesloten, boeker krijgt bericht en een link naar Ontdek |
| Optreden voorbij, geen review | 2 dagen | reviewverzoek (bestond al) |

Keuzes die daarbij horen:

- Elk moment heeft een eigen kolom op `bookings`, die Nova claimt met een update
  die alleen slaagt als de kolom nog leeg is. Dubbele mail kan dus niet, ook
  niet als twee runs elkaar overlappen, en een gemiste run haalt ze vanzelf in.
- **Sluiten staat aan.** Uitzetten kan zonder code te wijzigen:
  `update agent_settings set config = config || '{"auto_close": false}' where agent = 'boekingsbewaker';`
- Wie `email_opt_out` aan heeft krijgt geen mail van Nova, ook niet vlak voor
  het optreden. Wel een melding op de telefoon als die aan staat.
- De oude taak `booking-reminders` is eruit. Die stuurde alleen een pushmelding
  en niemand had push aanstaan. Nova vult `reminder_sent_at` op het moment van
  24 uur, zodat Wolfs controle op gemiste herinneringen blijft kloppen.
- Een contractherinnering kan nog niet: er is geen contractfunctie in de app.
  Zodra die er is, hoort die regel hier weer thuis.
- Alternatieve DJ's meesturen bij een afgelopen aanvraag is nog niet gebouwd;
  de boeker krijgt nu een link naar Ontdek.

## Wat er in de database bij komt

Eén migratie, met:

- `agent_runs`: welke agent, wanneer gestart, hoe lang, hoeveel verwerkt,
  fouten, kosten
- `agent_alerts`: melding, ernst, wanneer voor het eerst gezien, of hij al
  gestuurd is, of jij hem hebt afgevinkt
- `agent_settings`: per agent aan of uit, hoe vaak, en de grenswaarden
- RLS aan zonder regels, net als bij `dj_leads`: alleen de server komt erbij

## Wat het kost

De waakhond, de boekingsbewaker, de geldloper en de opruimer zijn pure code en
kosten vrijwel niets. Klantcontact, poortwachter en groei gebruiken AI. Bij
minder dan honderd boekingen per maand kom je uit op een paar tientjes per
maand.

## Beheerscherm

Bij `/admin/agents` komt één pagina: per agent de laatste run, de stand van
zaken, de open meldingen en de schakelaar aan of uit. Zo zie je in tien
seconden of alles loopt.

**Nog niet gebouwd.** De knop in de meldingsmail wijst al naar `/admin/agents`,
dus zolang die pagina er niet is levert die knop een 404 op. Bij het bouwen
meteen controleren of die knop klopt.

## Open punten

Bijgewerkt 29 september 2026.

| Punt | Stand |
| --- | --- |
| `/admin/agents` bouwen | open, knop in de mail wacht erop |
| Nova, de boekingsbewaker | gebouwd, draait elk kwartier |
| Nova in het echt zien werken | open. Er staat geen boeking in de toekomst en geen openstaande aanvraag, dus ze heeft niets te doen. Kwame wil hier later een testboeking voor laten aanmaken: een boeking met een datum over twee dagen, en een aanvraag op `pending` met een `created_at` van vijf uur geleden. |
| Gedeelde teller via Upstash bevestigen | gekoppeld, nog niet aantoonbaar werkend; zoek in de logs op `[ratelimit]` |
| Testaccount opruimen | `ballokwame+test1@gmail.com` mag weg zodra het testen klaar is |

## Hoe de agents gestart worden

Niet via de planner van Vercel maar via **pg_cron in Supabase**, net als de
bestaande taken. Elke taak roept de route aan met de sleutel uit de vault:

```sql
select net.http_get(
  url := 'https://mygigs-app-t7ve.vercel.app/api/agents/<naam>',
  headers := jsonb_build_object(
    'Authorization',
    'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
  )
);
```

Daardoor gelden de beperkingen van het Hobby-abonnement van Vercel niet: Wolf
draait elk kwartier. `vercel.json` bevat bewust geen taken meer, zodat alles op
één plek staat en niets dubbel draait.

## De agents laten leren

Idee van Kwame, 29 september 2026: de agents moeten informatie delen en hun
werk daarmee verbeteren. Uitwerking, te bouwen ná `/admin/agents`.

Drie tabellen erbij:

| Tabel | Waarvoor |
| --- | --- |
| `agent_facts` | Wat een agent opvalt, leesbaar voor de anderen. Bijvoorbeeld: aanmeldingen van dit domein zijn bijna altijd nep. Met een houdbaarheidsdatum, want een waarneming veroudert. |
| `agent_outcomes` | Wat er gebeurde ná een actie. Nova port een DJ, en kijkt een dag later of hij reageerde. Zo ontstaat een percentage per grenswaarde. |
| `agent_proposals` | Een voorstel van een agent om een grenswaarde te wijzigen, met de cijfers erbij. Jij keurt goed of af in het beheerscherm. |

**Een agent past zijn eigen regels niet aan.** Hij stelt voor, jij beslist. Drie
redenen, en ze wegen alle drie:

1. Uitlegbaarheid. Bij een klacht of een AVG-vraag is "dat besloot het systeem
   zelf" geen antwoord. Elke wijziging hoort een moment te hebben waarop een
   mens ja zei.
2. Een fout versterkt zichzelf. Sluit Nova te snel, dan haken boekers af, ziet
   ze minder reacties, en sluit ze nog sneller. Zonder rem loopt dat weg.
3. Jij moet slimmer worden van die cijfers, niet alleen de agents. Het gaat om
   jouw bedrijf.

Zelfde afspraak als bij de DJ-goedkeuring, en om dezelfde reden.
