# Beveiligingsbeleid — MyGigs

MyGigs neemt de beveiliging van gebruikersgegevens serieus. Dit beleid
beschrijft hoe je kwetsbaarheden meldt (responsible disclosure) en welke
technische maatregelen we hanteren.

## Een kwetsbaarheid melden
Vond je een beveiligingsprobleem? Mail **security@mygigs.nl** met een
beschrijving en stappen om het te reproduceren. Verzoek:
- Geef ons redelijk de tijd om het op te lossen vóór openbaarmaking.
- Geen toegang tot data van andere gebruikers meer dan nodig om het aan te tonen.
- Geen dienstverstoring (DoS), spam of social engineering.

We bevestigen ontvangst binnen 5 werkdagen en houden je op de hoogte.

## Technische maatregelen (samenvatting)
- Toegangscontrole via Row Level Security op alle databasetabellen.
- Geheimen alleen server-side; TLS/HSTS afgedwongen; security headers en CSP.
- Betalingen digitaal via een betaalprovider met escrow; geen contant.
- Privacy: minimale gegevensverzameling; contactgegevens worden niet tussen
  partijen gedeeld.
- Geautomatiseerd dependency-beheer (Dependabot).

Zie `docs/iso27002-control-mapping.md` voor de volledige control-mapping
richting ISO/IEC 27001/27002.
