import Link from "next/link"

export const metadata = {
  title: "Algemene voorwaarden · MyGigs",
}

export default function VoorwaardenPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <Link
        href="/"
        className="text-sm text-muted transition hover:text-foreground"
      >
        ← Terug
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Algemene voorwaarden
      </h1>
      <p className="mt-2 text-sm text-muted">Laatst bijgewerkt: 17 juli 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
        <Section title="1. Over MyGigs">
          MyGigs is een online platform dat organisatoren en particulieren
          (&ldquo;boekers&rdquo;) in contact brengt met DJ&apos;s en artiesten.
          MyGigs bemiddelt bij de totstandkoming en afwikkeling van boekingen,
          maar voert de optredens niet zelf uit. De overeenkomst voor een
          optreden komt tot stand tussen de boeker en de DJ.
        </Section>
        <Section title="2. Je account">
          Om te boeken maak je een account aan met juiste en volledige gegevens.
          Je bent zelf verantwoordelijk voor het geheimhouden van je
          wachtwoord. Je bevestigt je e-mailadres voordat je kunt boeken of
          betalen.
        </Section>
        <Section title="3. Boeken en de overeenkomst">
          Een boeking is een aanvraag aan een DJ. Zodra de DJ de aanvraag
          accepteert, ontstaat er een overeenkomst tussen jou en de DJ tegen de
          getoonde gage en voorwaarden.
        </Section>
        <Section title="4. Betaling en escrow">
          Betalingen verlopen uitsluitend digitaal via het platform (bijv. iDEAL
          of creditcard). Contante betaling is niet toegestaan. Na acceptatie
          betaal je het bedrag; MyGigs houdt dit veilig in escrow en betaalt de
          DJ pas ná het optreden uit. MyGigs rekent servicekosten die bij de
          prijs worden getoond.
        </Section>
        <Section title="5. Annuleren en niet-verschijnen">
          Annuleringsvoorwaarden worden bij de boeking getoond. Verschijnt de DJ
          zonder geldige reden niet, dan krijg je het betaalde bedrag terug.
        </Section>
        <Section title="6. Afspraken buiten het platform">
          Communicatie en betaling lopen via MyGigs. Het is niet toegestaan om
          de bemiddeling te omzeilen door buiten het platform af te rekenen of
          contactgegevens uit te wisselen om de servicekosten te ontlopen.
        </Section>
        <Section title="7. Aansprakelijkheid">
          MyGigs bemiddelt en is niet aansprakelijk voor de uitvoering van het
          optreden door de DJ. Onze aansprakelijkheid is beperkt voor zover
          wettelijk toegestaan.
        </Section>
        <Section title="8. Wijzigingen">
          MyGigs kan deze voorwaarden aanpassen. Bij wezenlijke wijzigingen
          vragen we opnieuw je akkoord.
        </Section>
        <Section title="9. Toepasselijk recht">
          Op deze voorwaarden is Nederlands recht van toepassing.
        </Section>
        <Section title="10. Contact">
          Vragen? Mail{" "}
          <a
            href="mailto:support@mygigs.nl"
            className="font-medium text-brand hover:underline"
          >
            support@mygigs.nl
          </a>
          .
        </Section>
      </div>
    </main>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5">{children}</p>
    </section>
  )
}
