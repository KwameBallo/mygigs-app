export type AssistantMode = "dj" | "consument"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type DjOption = {
  stage_name: string
  genre: string | null
  city: string | null
  gage: number | null
  rating: number | null
}

// Kernpunten uit de algemene voorwaarden voor artiesten op MyGigs.
const DJ_TERMS = [
  "Aanmelden en een profiel maken is gratis.",
  "MyGigs rekent 7% commissie per boeking; die wordt ingehouden op je gage.",
  "Betalingen lopen via escrow: het geld van de boeker staat vast tot na het optreden.",
  "Uitbetaling volgt na een succesvol afgerond optreden.",
  "De gage die je instelt is je tarief; de boeker betaalt dat bedrag, jij ontvangt het minus 7%.",
  "Je bent zelf verantwoordelijk voor juiste profielinformatie en het nakomen van geaccepteerde boekingen.",
]

const DJ_SYSTEM =
  "Je bent de profielcoach van MyGigs voor DJ's en artiesten. " +
  "Je helpt iemand een sterk, boekbaar artiestprofiel op te bouwen. " +
  "Geef concrete, persoonlijke tips die passen bij deze persoon: een pakkende artiestnaam, " +
  "een sterke bio van 2-3 zinnen (lever een kant-en-klaar voorbeeld dat ze direct kunnen plakken), " +
  "het best passende genre, een realistische gage op basis van ervaring, volgers en regio, " +
  "en welke socials, demo's en foto's ze moeten tonen. " +
  "Stel maximaal 1-2 gerichte vragen als belangrijke info ontbreekt. " +
  "Wijs de DJ ook op de belangrijkste algemene voorwaarden, vooral bij vragen over geld, " +
  "gage, uitbetaling of aanmelden. Vat ze kort en duidelijk samen, verzin geen extra regels. " +
  "De algemene voorwaarden voor artiesten zijn:\n" +
  DJ_TERMS.map((t) => `- ${t}`).join("\n") +
  "\nAntwoord kort en concreet in het Nederlands. Gebruik geen em-dash."

function consumentSystem(djs: DjOption[]): string {
  const list =
    djs.length > 0
      ? djs
          .map(
            (d) =>
              `- ${d.stage_name} | ${d.genre ?? "onbekend genre"} | ${
                d.city ?? "onbekende stad"
              } | gage ${d.gage != null ? "EUR " + d.gage : "op aanvraag"}${
                d.rating ? " | rating " + d.rating.toFixed(1) : ""
              }`,
          )
          .join("\n")
      : "(nog geen DJ's beschikbaar)"

  return (
    "Je bent de boekingsassistent van MyGigs. " +
    "Je helpt een consument binnen zijn budget en wensen de juiste DJ te vinden. " +
    "Vraag kort naar gelegenheid, datum, stad, genre en prijsklasse als die ontbreken. " +
    "Beveel daarna 1 tot 3 passende DJ's aan UIT de onderstaande lijst die binnen het budget vallen. " +
    "Noem per aanrader de naam (vetgedrukt), genre, stad en gage, plus een korte reden waarom die past. " +
    "Verzin geen DJ's die niet in de lijst staan. Als niets binnen het budget past, zeg dat eerlijk en " +
    "noem het dichtstbijzijnde alternatief. Antwoord kort in het Nederlands. Gebruik geen em-dash.\n\n" +
    "Beschikbare DJ's:\n" +
    list
  )
}

function fallbackReply(mode: AssistantMode): string {
  if (mode === "dj") {
    return (
      "De AI-coach staat nu even uit, maar hier zijn de basics voor een sterk profiel:\n\n" +
      "1. Kies een korte, herkenbare artiestnaam.\n" +
      "2. Schrijf een bio van 2-3 zinnen: wie je bent, je sound, en waar je al gedraaid hebt.\n" +
      "3. Kies 1 hoofdgenre zodat boekers je makkelijk vinden.\n" +
      "4. Zet een realistische gage neer op basis van je ervaring en volgers.\n" +
      "5. Koppel je Instagram, Spotify en een demo-set.\n\n" +
      "Goed om te weten (algemene voorwaarden):\n" +
      DJ_TERMS.map((t) => `- ${t}`).join("\n")
    )
  }
  return (
    "De AI-assistent staat nu even uit. Tip: gebruik op de Ontdek-pagina de filters voor " +
    "genre, stad en budget om snel een passende DJ binnen je prijsklasse te vinden."
  )
}

export async function assistantReply(
  mode: AssistantMode,
  messages: ChatMessage[],
  djs: DjOption[] = [],
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return fallbackReply(mode)

  const system = mode === "dj" ? DJ_SYSTEM : consumentSystem(djs)

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system,
        messages: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!res.ok) return fallbackReply(mode)
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ""
    return text.trim() || fallbackReply(mode)
  } catch {
    return fallbackReply(mode)
  }
}
