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

  return `Sei il motore di MindRoute, piattaforma di travel profiling psicologico.

PROFILO UTENTE:
Percorso: ${path}
Budget: ${input.budget} | Da: ${input.departure} | Giorni: ${input.days} | Periodo: ${input.leaveDate}
Compagni: ${input.companions || "non specificato"} | Vincoli: ${input.constraints || "nessuno"}
Risposte quiz: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}

COMPITO: Genera 3 destinazioni personalizzate con itinerari di ${input.days} giorni ciascuno.

REGOLE:
- Analizza il profilo psicologico: bisogni emotivi, estetica, tolleranza al caos
- Destinazioni diverse tra loro, paesi diversi, non ovvie
- Tono personale, non da catalogo
- Ogni giorno: massimo 1 riga per morning/lunch/afternoon/evening
- Rispondi SOLO con JSON valido, zero testo fuori dal JSON

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
          "morning": "Attività mattutina",
          "lunch": "Piatto e posto",
          "afternoon": "Attività pomeridiana",
          "evening": "Serata",
          "affiliateLinks": {
            "booking": "https://www.booking.com/searchresults.html?ss=CITTA&aid=304142",
            "getyourguide": "https://www.getyourguide.com/s/?q=CITTA",
            "tripadvisor": "https://www.tripadvisor.com/Search?q=CITTA"
          }
        }
      ],
      "budgetSummary": "hotel X€, pasti Y€, totale stimato Z€",
      "packingList": "item1, item2, item3, item4, item5",
      "bestTime": "periodo consigliato",
      "gettingThere": "come arrivare, aeroporto IATA",
      "closingMessage": "frase finale poetica personalizzata",
      "topAffiliateLinks": {
        "booking": "https://www.booking.com/searchresults.html?ss=CITTA&aid=304142",
        "skyscanner": "https://www.skyscanner.net/transport/flights/any/IATA/",
        "getyourguide": "https://www.getyourguide.com/s/?q=CITTA"
      }
    }
  ]
}

Genera esattamente ${input.days} giorni per ogni itinerario.`;
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
    max_tokens: 8000,
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