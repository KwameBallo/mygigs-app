# Profielfoto's, wat de DJ aanlevert en wat wij ermee doen

## Wat de DJ aanlevert

Eén foto. Meer niet. Wij snijden hem bij in de app.

**Eisen**

| | |
|---|---|
| Formaat | JPG, PNG, WEBP of HEIC (iPhone) |
| Grootte | minimaal 1000 bij 1000 pixels, liefst 2000. Maximaal 25 MB |
| Inhoud | één persoon, het gezicht groot in beeld |
| Rechten | eigen foto, of schriftelijke toestemming van de fotograaf |

**Wat werkt**

- Gezicht van schouders tot net boven het hoofd. Als het een pasfoto lijkt is
  het te strak, als je hele lijf erop staat is het te ruim.
- Licht op het gezicht. Achter de booth met een spot in je rug levert een
  silhouet op, en dat verkoopt niet.
- Clubfoto's mogen, sterker nog: die passen bij het merk. Zolang je maar
  herkenbaar bent.
- Recht in de camera of net ernaast. Ogen ongeveer op een derde van bovenaf,
  dat is wat de oranje hulplijn in de app aangeeft.

**Wat niet werkt**

- Groepsfoto's. De organisator moet in één oogopslag zien wie hij boekt.
- Een logo of platenhoes als profielfoto. Mensen boeken een mens.
- Flyers met tekst erop. De tekst valt weg zodra de foto klein wordt getoond.
- Schermafbeeldingen van Instagram. Die zijn al twee keer gecomprimeerd en
  daardoor zacht.
- Foto's doorgestuurd via WhatsApp. Die worden teruggeschaald naar circa 1600
  pixels en flink gecomprimeerd. Stuur het origineel uit je fotorollen.
- Zware filters of zwaar bewerkte huid. Op een boekingsplatform werkt dat
  tegen je: organisatoren willen weten wie er straks voor hun neus staat.

## Wat de app ermee doet

1. **Bijsnijden in de browser.** De DJ sleept en zoomt in een vierkant kader.
   Daarin staan drie hulplijnen: de cirkel is zijn avatar, de streepjeslijn is
   wat er in een kaartje overblijft, de oranje lijn is waar zijn ogen horen.
   Zo kan er niets meer per ongeluk worden afgesneden.

2. **Drie maten wegschrijven.** Uit dezelfde uitsnede komen 1200, 512 en 160
   pixels breed, als WEBP op kwaliteit 0,86. Kleine bron? Dan slaan we alleen
   de maten op die de foto echt aankan, want opblazen maakt niets scherper.

3. **Vervaagde placeholder.** Een plaatje van 20 pixels, ongeveer 600 bytes,
   gaat mee in de database. Dat staat er al terwijl de echte foto laadt, dus
   je ziet nooit een leeg grijs vlak.

4. **Metagegevens eruit.** Omdat de browser de foto opnieuw tekent, verdwijnt
   alle EXIF-informatie, inclusief de GPS-locatie die telefoons in foto's
   zetten. Dat scheelt een privacylek dat de meeste platformen wel hebben.

5. **De juiste maat op de juiste plek.** Elke afbeelding krijgt een srcset mee,
   zodat een kaartje van 300 pixels ook echt de 512 laadt en niet de 1200.

6. **Een jaar cachen.** De bestandsnaam bevat een tijdstempel, dus een foto
   verandert nooit stiekem. Daarom mag hij lang in de cache blijven staan.

7. **Opruimen.** Bij een nieuwe foto worden de oude bestanden verwijderd, ook
   die uit de vorige opzet. Geen wildgroei in de opslag.

## Wat dit oplevert

Een telefoonfoto van 4 MB werd tot nu toe ongewijzigd in een kaartje van 300
pixels geladen. Na deze wijziging is dat ongeveer 40 kB. Bij twintig DJ's op
het ontdekscherm scheelt dat tientallen megabytes per paginaweergave, en dat
merk je het hardst op een telefoon in een club met slecht bereik.
