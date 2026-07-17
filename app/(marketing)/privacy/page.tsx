import Link from "next/link"

export const metadata = {
  title: "Privacybeleid · MyGigs",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <Link
        href="/"
        className="text-sm text-muted transition hover:text-foreground"
      >
        ← Terug
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Privacybeleid
      </h1>
      <p className="mt-2 text-sm text-muted">Laatst bijgewerkt: 17 juli 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
        <Section title="1. Wie zijn wij">
          MyGigs is verantwoordelijk voor de verwerking van je persoonsgegevens
          zoals beschreven in dit beleid. We gaan zorgvuldig met je gegevens om
          en houden ons aan de Algemene Verordening Gegevensbescherming (AVG).
        </Section>
        <Section title="2. Welke gegevens we verwerken">
          Bij het aanmaken van een account: je naam en e-mailadres, en een
          versleuteld wachtwoord. Bij het boeken: gegevens van je aanvraag
          (datum, locatie, gelegenheid, eventueel bedrijfs- en factuurgegevens)
          en betaalgegevens die via onze betaalprovider worden verwerkt.
        </Section>
        <Section title="3. Waarvoor en op welke grondslag">
          We gebruiken je gegevens om je account te beheren, boekingen en
          betalingen uit te voeren (uitvoering van de overeenkomst), om fraude
          te voorkomen en het platform te verbeteren (gerechtvaardigd belang),
          en waar nodig op basis van je toestemming.
        </Section>
        <Section title="4. Delen met anderen">
          Een DJ krijgt ná acceptatie van de boeking alléén je naam te zien —
          niet je telefoonnummer of e-mailadres. Verder delen we gegevens met
          onze betaalprovider en met technische dienstverleners (zoals hosting),
          uitsluitend voor zover nodig. We verkopen je gegevens nooit.
        </Section>
        <Section title="5. Bewaartermijn">
          We bewaren je gegevens zolang je een account hebt en zo lang als nodig
          voor de doeleinden hierboven of om aan wettelijke (bijv. fiscale)
          verplichtingen te voldoen.
        </Section>
        <Section title="6. Je rechten">
          Je hebt recht op inzage, correctie, verwijdering, beperking en bezwaar,
          en op dataportabiliteit. Ook kun je een klacht indienen bij de
          Autoriteit Persoonsgegevens. Neem contact met ons op om je rechten uit
          te oefenen.
        </Section>
        <Section title="7. Beveiliging">
          We nemen passende technische en organisatorische maatregelen om je
          gegevens te beschermen, waaronder versleutelde verbindingen en
          toegangsbeperking.
        </Section>
        <Section title="8. Cookies">
          We gebruiken functionele cookies die nodig zijn om in te loggen en het
          platform te laten werken.
        </Section>
        <Section title="9. Contact">
          Vragen over je privacy? Mail{" "}
          <a
            href="mailto:privacy@mygigs.nl"
            className="font-medium text-brand hover:underline"
          >
            privacy@mygigs.nl
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
