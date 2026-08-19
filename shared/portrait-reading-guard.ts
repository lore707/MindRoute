/**
 * portrait-reading-guard.ts — il lucchetto sui fatti.
 *
 * Le letture del Ritratto sono affermazioni intime ("da lì hai cominciato a
 * partire da solo"). Un modello che parla della vita di qualcuno inventa con
 * sicurezza: un nome di posto mai visitato, un anno mai vissuto, un numero
 * arrotondato per far suonare meglio la frase. E il lettore non ha modo di
 * accorgersene — sono cose SUE, se le trova scritte le crede.
 *
 * Chiedere al modello di non inventare non basta: va VERIFICATO. Qui la
 * risposta viene accettata solo se ogni nome proprio e ogni numero che
 * contiene erano già fra i fatti che gli abbiamo dato. Tutto il resto si
 * rifiuta, e si torna al testo statico — che sarà meno personale, ma è vero.
 *
 * Logica pura: si verifica da riga di comando (script/verify-portrait.ts).
 * ─────────────────────────────────────────────────────────────── */

export type ReadingFacts = {
  /** Nomi che il modello PUÒ usare (destinazioni dei viaggi dell'utente). */
  places: string[];
  /** Numeri che il modello PUÒ usare (anni, conteggi). */
  numbers: number[];
};

export type GuardResult =
  | { ok: true; text: string }
  | { ok: false; reason: string; offending?: string };

/* Parole che iniziano per maiuscola senza essere nomi propri: mesi, giorni e
 * qualche termine che l'italiano e l'inglese capitalizzano comunque. */
const CAPITALIZED_OK = new Set([
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio",
  "agosto", "settembre", "ottobre", "novembre", "dicembre",
  "gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "jan", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
  "mindroute",
]);

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Ogni parola dei nomi consentiti, così "Isole Faroe" autorizza "Faroe". */
function allowedTokens(places: string[]): Set<string> {
  const out = new Set<string>();
  for (const p of places) {
    for (const piece of norm(p).split(/[\s,\/&()-]+/)) {
      if (piece.length >= 2) out.add(piece);
    }
  }
  return out;
}

/**
 * Accetta la frase solo se non contiene specifici che non le abbiamo dato.
 *
 * · nomi propri  → ogni parola maiuscola NON a inizio frase deve venire dai
 *                  luoghi consentiti (o essere un mese);
 * · numeri       → ogni cifra deve essere fra quelle fornite. Un "3 viaggi"
 *                  inventato è indistinguibile da uno vero, per chi legge;
 * · lunghezza    → fuori misura significa che il modello ha divagato.
 */
export function guardReading(
  raw: string,
  facts: ReadingFacts,
  opts: { minChars?: number; maxChars?: number } = {},
): GuardResult {
  const { minChars = 40, maxChars = 280 } = opts;

  const text = String(raw ?? "")
    .trim()
    .replace(/^["'«»]+|["'«»]+$/g, "")
    .replace(/\s+/g, " ");

  if (text.length < minChars) return { ok: false, reason: "troppo corta" };
  if (text.length > maxChars) return { ok: false, reason: "troppo lunga" };
  // Un modello che si mette a spiegare cosa sta facendo non sta scrivendo
  // una lettura: sta parlando di sé.
  if (/^(ecco|here|sure|certo|come richiesto|as requested)\b/i.test(text)) {
    return { ok: false, reason: "preambolo del modello" };
  }

  const allowed = allowedTokens(facts.places);

  // ── nomi propri ──
  // Si scorrono le parole tenendo conto di dove finisce una frase: la prima
  // parola di ogni frase è maiuscola per grammatica, non perché sia un nome.
  // Niente `\p{Lu}`: il target TypeScript del progetto non supporta le
  // property escape Unicode. Il confronto maiuscola/minuscola funziona lo
  // stesso sugli accenti (È !== è), che e' cio' che serve in italiano.
  const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
  const strip = (w: string) => w.replace(/^[^0-9A-Za-zÀ-ÖØ-öø-ÿ]+/, "").replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ]+$/, "");

  const words = text.split(/\s+/);
  let sentenceStart = true;
  for (const w of words) {
    const bare = strip(w);
    const endsSentence = /[.!?…]$/.test(w);
    if (!bare) { if (endsSentence) sentenceStart = true; continue; }

    if (isUpper(bare.charAt(0)) && !sentenceStart) {
      const n = norm(bare);
      if (!allowed.has(n) && !CAPITALIZED_OK.has(n)) {
        return { ok: false, reason: "nome proprio non fornito", offending: bare };
      }
    }
    sentenceStart = endsSentence;
  }

  // ── numeri ──
  const allowedNums = new Set(facts.numbers.map(n => String(Math.round(n))));
  for (const n of text.match(/\d+/g) ?? []) {
    if (!allowedNums.has(n)) {
      return { ok: false, reason: "numero non fornito", offending: n };
    }
  }

  return { ok: true, text };
}
