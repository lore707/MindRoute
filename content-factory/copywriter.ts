/**
 * Copywriter — turns a Plan into slide copy + caption via Claude, grounded on
 * real anchors (experience bank / catalog editorial data). The model is told
 * to NEVER invent places: every concrete name must come from the grounding
 * block, same anti-slop philosophy as itinerary generation.
 */
import Anthropic from "@anthropic-ai/sdk";
import { PERSONAS, type Plan } from "./planner";

const MODEL = "claude-sonnet-4-6";

export interface PlaceSlideCopy {
  kind: "place";
  index: string;       // "01" | "Giorno 1" | …
  title: string;       // place / day title
  area: string;        // kicker line above the title
  body: string;        // 1–2 sentences
  chips: string[];     // 0–3 short chips ("gratis", "all'alba", …)
  imageQuery: string;  // Unsplash search query, English
}

export interface StatementSlideCopy {
  kind: "statement";
  theme: "cream" | "ink";
  kicker?: string;
  text: string;
  accent?: string;     // exact substring of text to highlight in coral italic
}

export interface CopyResult {
  slug: string;
  cover: { kicker: string; title: string; imageQuery: string };
  slides: Array<PlaceSlideCopy | StatementSlideCopy>;
  cta: { title: string; subtitle: string };
  caption: string;
  hashtags: string[];
}

const STYLE_RULES = `
REGOLE DI STILE (vincolanti):
- Italiano. Tono MindRoute: editoriale, caldo, secco. Niente "scopri la magia di", niente "gemma nascosta", niente punti esclamativi a raffica, MAX 1 emoji nella caption.
- Il lettore va preso sul personale ("tu"), come fa il quiz di MindRoute.
- cover.title: massimo 70 caratteri, è il hook — deve fermare lo scroll.
- place.title: massimo 28 caratteri. place.body: massimo 150 caratteri, 1-2 frasi concrete e sensoriali.
- chips: 0-3 per slide, massimo 16 caratteri l'una, minuscole (es. "gratis", "all'alba", "vista città").
- imageQuery: in INGLESE, specifica per il luogo (es. "Fushimi Inari torii gates"), 2-5 parole.
- caption: 400-700 caratteri, righe brevi separate da \\n, apre col hook, chiude con "Il quiz è nel link in bio."
- hashtags: 12-15, mix italiano/inglese, generici travel + specifici del contenuto, senza #fyp.

REGOLA ANTI-INVENZIONE (la più importante):
Ogni nome proprio di luogo che usi DEVE comparire nel blocco GROUNDING qui sotto. Se non c'è, non esiste.

Rispondi SOLO con JSON valido, nessun testo prima o dopo, schema:
{
  "slug": "kebab-breve",
  "cover": { "kicker": "...", "title": "...", "imageQuery": "..." },
  "slides": [ ... ],
  "cta": { "title": "...", "subtitle": "..." },
  "caption": "...",
  "hashtags": ["#...", ...]
}`;

function groundingFromBank(plan: Plan): string {
  const lines = plan.bank!.experiences.map(e =>
    `- ${e.name} | zona: ${e.area} | tipo: ${e.type} | prezzo: ${e.priceBand} | momento: ${e.bestTime} | nota: ${e.why}`);
  return `GROUNDING — ancore reali di ${plan.bank!.city}:\n${lines.join("\n")}`;
}

function buildPrompt(plan: Plan): string {
  const personaLabel = PERSONAS[plan.persona!];

  if (plan.pillar === "deep-dive") {
    return `Crea un carosello Instagram/TikTok per MindRoute (SaaS che profila la tua personalità di viaggio con un quiz e genera itinerari su misura).

FORMATO: "${plan.bank!.city.split(",")[0]} in 5 luoghi veri" — 1 cover + 5 slide "place" + CTA.
- Scegli i 5 luoghi più diversi tra loro dal grounding (mai 2 dello stesso tipo se evitabile).
- index: "01".."05". area: la zona dal grounding (+ città se serve). body: riscrivi la nota in italiano, concreta, seconda persona dove naturale.
- chips dai campi prezzo/momento (es. "gratis", "all'alba").
- cover.imageQuery: vista iconica della città.

${groundingFromBank(plan)}

${STYLE_RULES}`;
  }

  if (plan.pillar === "itinerario-30s") {
    return `Crea un carosello Instagram/TikTok per MindRoute (SaaS che profila la tua personalità di viaggio con un quiz e genera itinerari su misura).

FORMATO: "${plan.bank!.city.split(",")[0]} in 3 giorni, in 30 secondi" — 1 cover + 3 slide "place" (una per giorno) + CTA.
- index: "Giorno 1".."Giorno 3". title: il tema del giorno (max 28 char). area: le zone toccate.
- body: "Mattina: … · Pomeriggio: … · Sera: …" usando SOLO ancore del grounding (max 160 caratteri, abbrevia i nomi se serve ma riconoscibili).
- Ogni giorno geograficamente coerente (zone vicine insieme).
- imageQuery di ogni giorno: l'ancora visivamente più forte di quel giorno.

${groundingFromBank(plan)}

${STYLE_RULES}`;
  }

  if (plan.pillar === "tre-posti") {
    const blocks = plan.catalogPicks!.map(d => {
      const why = d.whyYoursTemplates[plan.persona!] || d.experiencePreview;
      return `- ${d.name} | keywords: ${d.keywords.slice(0, 8).join(", ")} | perché per questa persona: ${why} | esperienze: ${d.experiencePreview}`;
    }).join("\n");
    return `Crea un carosello Instagram/TikTok per MindRoute (SaaS che profila la tua personalità di viaggio con un quiz e genera itinerari su misura).

FORMATO: "3 posti per ${personaLabel}" — 1 cover + 3 slide "place" (una per destinazione) + CTA.
- index: "01".."03". title: nome della destinazione (senza paese se lungo). area: il paese o la regione.
- body: il motivo per CUI questa destinazione parla a "${personaLabel}", con UN elemento concreto dal grounding.
- cover.title deve nominare la persona (es. "3 posti per ${personaLabel}").
- imageQuery per ogni destinazione: il suo paesaggio firma.

GROUNDING — destinazioni:
${blocks}

${STYLE_RULES}`;
  }

  // quiz-bait
  const personaList = Object.entries(PERSONAS).map(([tag, label]) => `- ${tag}: ${label}`).join("\n");
  return `Crea un carosello Instagram/TikTok per MindRoute (SaaS che profila la tua personalità di viaggio con un quiz di 7 domande e genera itinerari su misura).

FORMATO tipografico (niente foto): 1 cover + 4 slide "statement" + CTA.
- Tema: "il modo in cui viaggi dice chi sei". Ogni statement collega un comportamento di viaggio riconoscibile a un tratto di personalità — il lettore deve riconoscersi in almeno uno.
- La cover qui è una slide statement travestita: cover.title = il hook, cover.imageQuery = vista cinematografica generica di viaggio (es. "airplane window sunset clouds").
- slides: SOLO kind "statement". theme alternato: "cream", "ink", "cream", "ink". kicker breve (es. "TIPO 01"). text max 130 caratteri. accent = la sottostringa ESATTA di text da evidenziare in corallo.
- Le 5 personalità MindRoute (non nominarle con i tag inglesi, descrivile):
${personaList}

GROUNDING: nessun luogo necessario — non nominare luoghi specifici.

${STYLE_RULES}`;
}

function extractJson(text: string): CopyResult {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Copywriter: nessun JSON nella risposta:\n${text.slice(0, 400)}`);
  return JSON.parse(cleaned.slice(start, end + 1)) as CopyResult;
}

export async function writeCopy(plan: Plan): Promise<CopyResult> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY dall'ambiente
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    temperature: 0.8,
    messages: [{ role: "user", content: buildPrompt(plan) }],
  });
  const text = res.content.filter(b => b.type === "text").map(b => (b as { text: string }).text).join("");
  const copy = extractJson(text);

  // Hard guards so a sloppy generation can't break the renderer.
  if (!copy.cover?.title || !Array.isArray(copy.slides) || copy.slides.length < 3) {
    throw new Error(`Copywriter: JSON incompleto (slides=${copy.slides?.length ?? 0})`);
  }
  copy.slug = (copy.slug || "contenuto").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
  copy.hashtags = (copy.hashtags ?? []).map(h => (h.startsWith("#") ? h : `#${h}`));
  return copy;
}
