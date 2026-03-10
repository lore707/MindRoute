import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ProfilingInput {
  answers: string[];
  budget: string;
  departure: string;
  days: number;
  leaveDate: string;
  companions?: string;
  constraints?: string;
}

function buildPrompt(input: ProfilingInput): string {
  const profileAnswers = (input.answers[0] === "path_a" || input.answers[0] === "path_b")
    ? input.answers.slice(1)
    : input.answers;

  const path = input.answers[0] === "path_b" ? "Path B (ha già un'idea di zona)" : "Path A (aperto a sorprese)";
  const days = Math.min(input.days, 7);

  // Budget massimo per persona
  const budgetMap: Record<string, string> = {
    "< €500": "massimo 500€ a persona tutto incluso",
    "€500 – €1.500": "tra 500€ e 1.500€ a persona tutto incluso, non superare mai 1.500€",
    "€1.500 – €3.000": "tra 1.500€ e 3.000€ a persona tutto incluso, non superare mai 3.000€",
    "No limits": "budget illimitato, punta alla qualità"
  };
  const budgetText = budgetMap[input.budget] || input.budget;

  // Stima date di check-in/check-out per i link
  const period = input.leaveDate || "estate 2025";

  return `Sei il motore di MindRoute, piattaforma di travel profiling psicologico.

PROFILO UTENTE:
Percorso: ${path}
Budget: ${budgetText} — RISPETTA QUESTO VINCOLO, è fondamentale
Parti da: ${input.departure} | Giorni: ${days} | Periodo: ${period}
Compagni: ${input.companions || "non specificato"} | Vincoli: ${input.constraints || "nessuno"}
Risposte quiz: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}

COMPITO: Genera 1 sola destinazione perfettamente personalizzata con itinerario di ${days} giorni.

REGOLE:
- Analizza il profilo psicologico: bisogni emotivi, estetica, tolleranza al caos
- Destinazione non ovvia, sorprendente
- Tono personale, non da catalogo
- Ogni giorno: 1 riga breve per morning/lunch/afternoon/evening
- Il budget totale stimato DEVE stare dentro il range indicato
- Rispondi SOLO con JSON valido, zero testo fuori dal JSON

ISTRUZIONI PER I LINK:
- Per gli hotel: usa il nome reale dell'hotel suggerito nel link Booking con date stimate
  Formato: https://www.booking.com/search.html?ss=NOMEHOTEL+CITTA&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&aid=304142
- Per i ristoranti: usa TheFork se disponibile in quella città, altrimenti Google Maps
  TheFork: https://www.thefork.it/ricerca/?cityName=CITTA&query=NOMERISTORANTE
  Google Maps: https://www.google.com/maps/search/NOMERISTORANTE+CITTA
- Per le esperienze: GetYourGuide con nome attività
  Formato: https://www.getyourguide.com/s/?q=NOMEATTIVITA+CITTA
- Per i voli: Skyscanner con date e aeroporti
  Formato: https://www.skyscanner.net/transport/flights/IATA_PARTENZA/IATA_ARRIVO/YYYYMMDD/YYYYMMDD/

JSON RICHIESTO:
{
  "destinations": [
    {
      "name": "Città, Paese",
      "imageUrl": "https://images.unsplash.com/photo-[ID]?w=600&h=400&fit=crop",
      "whyYours": "2 frasi sul perché psicologico",
      "experiencePreview": "1 frase evocativa in prima persona",
      "practicalInfo": "voli, costi, periodo in 1 riga"
    }
  ],
  "itineraries": [
    {
      "destinationName": "Città, Paese",
      "days": [
        {
          "dayNumber": 1,
          "title": "Titolo breve",
          "morning": "Attività mattutina con nome specifico del posto",
          "lunch": "Nome ristorante specifico e piatto",
          "afternoon": "Attività pomeridiana con nome specifico",
          "evening": "Serata con nome specifico del posto",
          "affiliateLinks": {
            "booking": "https://www.booking.com/search.html?ss=NOMEHOTEL+CITTA&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&aid=304142",
            "restaurant": "https://www.thefork.it/ricerca/?cityName=CITTA&query=NOMERISTORANTE oppure Google Maps URL",
            "experience": "https://www.getyourguide.com/s/?q=NOMEATTIVITA+CITTA"
          }
        }
      ],
      "budgetSummary": "hotel X€/notte, pasti Y€/giorno, totale stimato Z€ — dentro il budget richiesto",
      "packingList": "item1, item2, item3, item4, item5",
      "bestTime": "periodo consigliato",
      "gettingThere": "come arrivare, aeroporto IATA",
      "closingMessage": "frase finale poetica personalizzata",
      "topAffiliateLinks": {
        "booking": "https://www.booking.com/search.html?ss=NOMEHOTEL+CITTA&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&aid=304142",
        "skyscanner": "https://www.skyscanner.net/transport/flights/IATA_PARTENZA/IATA_ARRIVO/YYYYMMDD/YYYYMMDD/",
        "getyourguide": "https://www.getyourguide.com/s/?q=CITTA+esperienze"
      }
    }
  ]
}

Genera esattamente ${days} giorni nell'itinerario.`;
}

export async function generateDestinations(input: ProfilingInput): Promise<{
  destinations: Array<{
    name: string;
    whyYours: string;
    experiencePreview: string;
    practicalInfo: string;
    imageUrl: string;
  }>;
  itineraries: Map<string, any>;
}> {
  const prompt = buildPrompt(input);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const cleanJson = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(cleanJson);

  const itineraries = new Map<string, any>();
  for (const itin of parsed.itineraries) {
    itineraries.set(itin.destinationName, itin);
  }

  return {
    destinations: parsed.destinations,
    itineraries,
  };
}