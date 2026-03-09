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

  return `Sei il motore di raccomandazione di MindRoute, una piattaforma di travel profiling psicologico.

Il tuo compito è analizzare le risposte di profilazione e generare 3 destinazioni di viaggio perfettamente personalizzate con itinerari completi giorno per giorno.

## PROFILO UTENTE

Percorso: ${path}
Budget: ${input.budget}
Partenza da: ${input.departure}
Durata: ${input.days} giorni
Periodo: ${input.leaveDate}
Compagni: ${input.companions || "non specificato"}
Vincoli speciali: ${input.constraints || "nessuno"}

Risposte al quiz di profilazione:
${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join("\n")}

## ISTRUZIONI

1. Analizza le risposte per capire il profilo psicologico del viaggiatore — bisogni emotivi, tolleranza al caos, estetica, identità.
2. Scegli 3 destinazioni diverse tra loro, di paesi diversi, calibrate su questo profilo specifico.
3. Per ogni destinazione genera un itinerario giorno per giorno basato esattamente sul numero di giorni (${input.days}).
4. Il tono deve essere personale, psicologico, non da catalogo turistico.
5. I link affiliati devono essere URL reali e funzionanti pre-filtrati per la destinazione.

## FORMATO OUTPUT

Rispondi SOLO con un JSON valido, senza markdown, senza backtick, senza testo prima o dopo. Struttura esatta:

{
  "destinations": [
    {
      "name": "Nome Città, Paese",
      "imageUrl": "https://images.unsplash.com/photo-[ID]?w=600&h=400&fit=crop",
      "whyYours": "Spiegazione psicologica personalizzata di 2-3 frasi su perché questa destinazione è giusta per questo utente specifico",
      "experiencePreview": "Frase evocativa in prima persona che descrive l'esperienza sensoriale del viaggio",
      "practicalInfo": "Info pratiche concise: voli, costi, sicurezza, periodo migliore"
    }
  ],
  "itineraries": [
    {
      "destinationName": "Nome Città, Paese",
      "days": [
        {
          "dayNumber": 1,
          "title": "Titolo poetico del giorno",
          "morning": "Descrizione dettagliata attività mattutina con orari e suggerimenti specifici",
          "lunch": "Piatto locale specifico e dove mangiarlo con contesto culturale",
          "afternoon": "Attività pomeridiana con dettagli pratici",
          "evening": "Serata con atmosfera e cosa fare",
          "affiliateLinks": {
            "booking": "https://www.booking.com/searchresults.html?ss=CITTA&aid=304142",
            "getyourguide": "https://www.getyourguide.com/CITTA-l123/",
            "tripadvisor": "https://www.tripadvisor.com/Search?q=CITTA"
          }
        }
      ],
      "budgetSummary": "Stima dettagliata dei costi: hotel X€/notte, pasti Y€/giorno, attività principali",
      "packingList": "Lista oggetti essenziali separati da virgola",
      "bestTime": "Periodo migliore con motivazione",
      "gettingThere": "Come arrivare con codice IATA aeroporto e opzioni di trasporto",
      "closingMessage": "Frase finale poetica e personalizzata che risuona con il profilo psicologico dell'utente",
      "topAffiliateLinks": {
        "booking": "https://www.booking.com/searchresults.html?ss=CITTA&aid=304142",
        "skyscanner": "https://www.skyscanner.net/transport/flights/any/IATA/",
        "getyourguide": "https://www.getyourguide.com/CITTA-l123/"
      }
    }
  ]
}

Genera esattamente ${input.days} giorni per ogni itinerario. Le destinazioni devono essere sorprendenti e non ovvie — evita Parigi, Roma, Barcellona, Amsterdam a meno che non siano davvero la scelta psicologicamente più corretta per questo profilo.`;
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
    model: "claude-sonnet-4-5",
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

  // Clean and parse JSON
  const cleanJson = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(cleanJson);

  // Build itineraries map
  const itineraries = new Map<string, any>();
  for (const itin of parsed.itineraries) {
    itineraries.set(itin.destinationName, itin);
  }

  return {
    destinations: parsed.destinations,
    itineraries,
  };
}