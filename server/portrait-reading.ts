/**
 * portrait-reading.ts — la lettura personalizzata di UNA tappa dell'evoluzione.
 *
 * Prima c'erano dieci paragrafi fissi, uno per asse × polo: chiunque si
 * muovesse verso la solitudine leggeva la stessa identica frase. Per un testo
 * che parla della vita interiore di qualcuno, "uguale per tutti" smette di
 * essere un ritratto e diventa un oroscopo.
 *
 * Qui la frase la scrive Haiku, ma NON può inventare:
 *   1. riceve SOLO fatti verificati (il viaggio, la data, i viaggi prima e
 *      dopo, le parole che l'utente ha scritto nel quiz);
 *   2. l'output passa da `guardReading`, che rifiuta ogni nome proprio e ogni
 *      numero che non fossero nei fatti forniti;
 *   3. se il controllo fallisce — o l'API non risponde, o manca la chiave —
 *      resta il testo statico del dizionario. Meno personale, ma vero.
 *
 * Il punto 2 è quello che conta: chiedere a un modello di non inventare non
 * basta, va verificato. Il lettore non ha modo di accorgersi che un dettaglio
 * sulla sua vita è falso — se lo trova scritto, ci crede.
 * ─────────────────────────────────────────────────────────────── */
import Anthropic from "@anthropic-ai/sdk";
import { guardReading, type ReadingFacts } from "@shared/portrait-reading-guard";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ReadingRequest = {
  lang: "it" | "en";
  /** Da → a, già in parole (poli dell'asse nella lingua dell'utente). */
  fromPole: string;
  toPole: string;
  /** Il viaggio attorno a cui il cambiamento si è visto. */
  atTrip: { dest: string; when: string | null } | null;
  /** I viaggi PRIMA e DOPO, in ordine: danno la traiettoria. */
  before: Array<{ dest: string; when: string | null }>;
  after: Array<{ dest: string; when: string | null }>;
  /** Le parole VERE dell'utente dal quiz. Mai parafrasate. */
  ownWords: string | null;
  seek: string[];
  tripCount: number;
  confirmedCount: number;
};

/* Cache in memoria: la lettura di una tappa cambia solo se cambiano i fatti. */
const cache = new Map<string, string>();
export const readingCacheKey = (userId: number, r: ReadingRequest): string =>
  [userId, r.lang, r.fromPole, r.toPole, r.atTrip?.dest ?? "-", r.atTrip?.when ?? "-",
   r.before.map(t => t.dest).join(","), r.after.map(t => t.dest).join(","),
   r.tripCount, r.confirmedCount].join("::");

/** Tutto ciò che il modello ha il permesso di nominare. */
export function factsFor(r: ReadingRequest): ReadingFacts {
  const places: string[] = [];
  if (r.atTrip) places.push(r.atTrip.dest);
  for (const t of [...r.before, ...r.after]) places.push(t.dest);

  const numbers: number[] = [r.tripCount, r.confirmedCount];
  // Gli anni citabili sono solo quelli che compaiono nelle date fornite.
  for (const t of [r.atTrip, ...r.before, ...r.after]) {
    const y = t?.when?.match(/\d{4}/)?.[0];
    if (y) numbers.push(Number(y));
  }
  return { places, numbers };
}

function buildPrompt(r: ReadingRequest): string {
  const line = (t: { dest: string; when: string | null }) => `${t.dest}${t.when ? ` (${t.when})` : ""}`;
  const facts: string[] = [];
  facts.push(`- Il profilo si è spostato da "${r.fromPole}" a "${r.toPole}".`);
  if (r.atTrip) facts.push(`- Lo spostamento si è visto attorno a: ${line(r.atTrip)}.`);
  if (r.before.length) facts.push(`- Viaggi PRIMA: ${r.before.map(line).join("; ")}.`);
  if (r.after.length) facts.push(`- Viaggi DOPO: ${r.after.map(line).join("; ")}.`);
  if (r.seek.length) facts.push(`- Parole che la persona ha scelto per dire cosa cerca: ${r.seek.join(", ")}.`);
  if (r.ownWords) facts.push(`- Frase scritta dalla persona stessa: "${r.ownWords}".`);
  facts.push(`- Viaggi totali: ${r.tripCount}. Confermati come fatti davvero: ${r.confirmedCount}.`);

  const it = r.lang === "it";
  return it
    ? `Sei l'assistente di MindRoute. Scrivi UNA lettura di 2 frasi (25-45 parole) che dica a questa persona cosa il cambiamento qui sotto dice DI LEI — non del viaggio.

FATTI — è tutto ciò che sai. Non hai altre informazioni:
${facts.join("\n")}

REGOLE VINCOLANTI:
- Puoi nominare SOLO i luoghi elencati nei fatti. Nessun altro posto, mai, nemmeno come esempio.
- Puoi usare SOLO i numeri elencati nei fatti. Non arrotondare, non aggiungerne.
- Non inventare emozioni, motivi o episodi che i fatti non dicono. Puoi interpretare, ma l'interpretazione deve reggersi su ciò che è elencato.
- Seconda persona singolare. Tono adulto e asciutto, mai da oroscopo.
- Niente aggettivi vuoti ("unico", "speciale", "incredibile"). Niente emoji. Niente virgolette.
- Se i fatti sono pochi, scrivi meno e resta più cauto. Meglio vago che falso.

Scrivi solo le due frasi, nient'altro.`
    : `You are the MindRoute assistant. Write ONE reading of 2 sentences (25-45 words) telling this person what the change below says ABOUT THEM — not about the trip.

FACTS — this is everything you know. You have no other information:
${facts.join("\n")}

BINDING RULES:
- You may name ONLY the places listed in the facts. No other place, ever, not even as an example.
- You may use ONLY the numbers listed in the facts. Do not round, do not add any.
- Do not invent emotions, reasons or episodes the facts do not state. You may interpret, but the interpretation must rest on what is listed.
- Second person singular. Adult, plain tone — never horoscope.
- No empty adjectives ("unique", "special", "incredible"). No emoji. No quotation marks.
- If the facts are thin, write less and stay cautious. Vague beats false.

Write only the two sentences, nothing else.`;
}

/**
 * La lettura personalizzata, o null se non si può garantirla vera.
 * null NON è un errore: il chiamante mostra il testo statico.
 */
export async function getPortraitReading(userId: number, r: ReadingRequest): Promise<string | null> {
  const key = readingCacheKey(userId, r);
  const hit = cache.get(key);
  if (hit !== undefined) return hit || null;

  if (!process.env.ANTHROPIC_API_KEY) return null;
  // Senza un viaggio a cui agganciarsi non c'è niente di personale da dire:
  // uscirebbe una parafrasi del testo statico, pagata.
  if (!r.atTrip && r.before.length === 0 && r.after.length === 0) return null;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 220,
      messages: [{ role: "user", content: buildPrompt(r) }],
    });
    const block = message.content[0];
    if (block.type !== "text") return null;

    const verdict = guardReading(block.text, factsFor(r));
    if (!verdict.ok) {
      // Visibile nei log: un rifiuto ricorrente è un prompt da correggere,
      // non rumore da ignorare.
      console.warn(`[portrait-reading] rifiutata (${verdict.reason}${verdict.offending ? `: "${verdict.offending}"` : ""})`);
      cache.set(key, ""); // non riproviamo a ogni apertura
      return null;
    }
    cache.set(key, verdict.text);
    return verdict.text;
  } catch (e) {
    console.warn("[portrait-reading] Haiku non ha risposto:", e);
    return null;
  }
}
