import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

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

const affiliateLinksSchema = z.record(z.string(), z.string()).optional();

const itineraryDaySchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  morning: z.string(),
  lunch: z.string(),
  afternoon: z.string(),
  evening: z.string(),
  affiliateLinks: affiliateLinksSchema,
});

const generatedDestinationSchema = z.object({
  name: z.string(),
  whyYours: z.string(),
  experiencePreview: z.string(),
  practicalInfo: z.string(),
  imageUrl: z.string().url(),
});

const generatedItinerarySchema = z.object({
  destinationName: z.string(),
  days: z.array(itineraryDaySchema),
  budgetSummary: z.string(),
  packingList: z.string(),
  bestTime: z.string(),
  gettingThere: z.string(),
  closingMessage: z.string(),
  topAffiliateLinks: z.record(z.string(), z.string()).optional(),
});

const generatedResponseSchema = z.object({
  destinations: z.array(generatedDestinationSchema).min(1),
  itineraries: z.array(generatedItinerarySchema).min(1),
});

type GeneratedDestination = z.infer<typeof generatedDestinationSchema>;
type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>;

// Normalizes and validates the AI JSON payload before the rest of the app uses it.
function parseModelResponse(responseText: string) {
  const cleanJson = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  return generatedResponseSchema.parse(JSON.parse(cleanJson));
}
function buildPrompt(input: ProfilingInput): string {
  const rawAnswers = (input.answers[0] === "path_a" || input.answers[0] === "path_b")
    ? input.answers.slice(1)
    : input.answers;

  // Se l'ultima risposta è un JSON strutturato, usalo come profilo forte per l'AI
  let structuredProfileBlock = "";
  let profileAnswers = rawAnswers;
  if (rawAnswers.length > 0) {
    const last = rawAnswers[rawAnswers.length - 1];
    try {
      const parsed = JSON.parse(last);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        structuredProfileBlock = JSON.stringify(parsed, null, 2);
        profileAnswers = rawAnswers.slice(0, -1);
      }
    } catch {
      // non è JSON, ignora
    }
  }

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
${structuredProfileBlock ? `Profilo strutturato (JSON):\n${structuredProfileBlock}\n\n` : ""}Risposte quiz: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}

COMPITO: Genera 1 sola destinazione perfettamente personalizzata con itinerario di ${days} giorni.

REGOLE:
- Analizza il profilo psicologico: bisogni emotivi, estetica, tolleranza al caos
- Destinazione non ovvia, sorprendente
- Tono personale, non da catalogo
- Mantieni le frasi corte e concrete
- Ogni campo deve essere sintetico
- Il budget totale stimato DEVE stare dentro il range indicato
- Rispondi SOLO con JSON valido, zero testo fuori dal JSON

LINK:
- Genera SOLO topAffiliateLinks finali
- Non generare affiliateLinks dentro i singoli giorni
- booking: link Booking di ricerca hotel in città
- skyscanner: link Skyscanner tratta principale
- getyourguide: link GetYourGuide esperienze città

JSON RICHIESTO:
{
  "destinations": [
    {
      "name": "Città, Paese",
      "imageUrl": "https://images.unsplash.com/photo-[ID]?w=600&h=400&fit=crop",
      "whyYours": "1 frase breve sul perché psicologico",
      "experiencePreview": "1 frase breve evocativa in prima persona",
      "practicalInfo": "costi, voli, periodo in 1 riga breve"
    }
  ],
  "itineraries": [
    {
      "destinationName": "Città, Paese",
      "days": [
        {
          "dayNumber": 1,
          "title": "Titolo breve",
          "morning": "Massimo 10 parole",
          "lunch": "Massimo 10 parole",
          "afternoon": "Massimo 10 parole",
          "evening": "Massimo 10 parole"
        }
      ],
      "budgetSummary": "1 riga breve con totale stimato dentro budget",
      "packingList": "5 item separati da virgola",
      "bestTime": "massimo 8 parole",
      "gettingThere": "massimo 12 parole con aeroporto IATA se utile",
      "closingMessage": "1 frase finale breve",
      "topAffiliateLinks": {
        "booking": "https://www.booking.com/search.html?ss=NOMEHOTEL+CITTA&aid=304142",
        "skyscanner": "https://www.skyscanner.net/transport/flights/IATA_PARTENZA/IATA_ARRIVO/YYYYMMDD/YYYYMMDD/",
        "getyourguide": "https://www.getyourguide.com/s/?q=CITTA+esperienze"
      }
    }
  ]
}

Genera esattamente ${days} giorni nell'itinerario.`;
}

export async function generateDestinations(input: ProfilingInput): Promise<{
  destinations: GeneratedDestination[];
  itineraries: Map<string, GeneratedItinerary>;
}> {
  const prompt = buildPrompt(input);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2800,
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

  const parsed = parseModelResponse(responseText);

  const itineraries = new Map<string, GeneratedItinerary>();
  for (const itin of parsed.itineraries) {
    itineraries.set(itin.destinationName, itin);
  }

  return {
    destinations: parsed.destinations,
    itineraries,
  };
}







