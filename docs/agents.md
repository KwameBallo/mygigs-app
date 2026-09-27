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
| Nova | boekingsbewaker | Aanvragen die blijven liggen opvolgen: DJ porren, boeker informeren, aanvraag sluiten | elk uur | nee |
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

**Stap 2: Nova, de boekingsbewaker.** Regels:

| Situatie | Na | Actie |
| --- | --- | --- |
| DJ heeft aanvraag niet geopend | 4 uur | pushmelding naar de DJ |
| DJ heeft niet gereageerd | 24 uur | mail naar de DJ, boeker krijgt bericht dat we erachteraan zitten |
| DJ heeft niet gereageerd | 48 uur | aanvraag sluiten, boeker krijgt drie alternatieven |
| Optreden over 7 dagen, contract niet getekend | dagelijks | beide partijen herinneren |
| Optreden voorbij, geen review | 2 dagen | reviewverzoek (bestaat al) |

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
