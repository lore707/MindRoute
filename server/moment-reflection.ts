// ─────────────────────────────────────────────────────────────────────────
// Diario — "AI Reflection" per una singola nota salvata (stile Apple Journal).
// Generata LAZY: solo quando l'utente espande la nota, poi cache in-process.
// Una frase breve, calda, ancorata al momento reale (titolo + luogo): mai
// inventa fatti, riflette su ciò che c'è. Fact-locked come il ritratto.
// ─────────────────────────────────────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// cache per (momentRowId + lang): la riflessione non cambia finché non cambia
// la nota. Cap morbido per non crescere all'infinito.
const cache = new Map<string, string>();

export async function momentReflection(
  userId: number,
  momentRowId: number,
  lang: "en" | "it",
): Promise<string | null> {
  const key = `${momentRowId}:${lang}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const moments = await storage.getSavedMoments(userId).catch(() => []);
  const m = moments.find((x: any) => x.id === momentRowId);
  const snap = m?.momentSnapshot;
  if (!snap?.title) return null;

  const where = [snap.location_name, snap.destination_name].filter(Boolean).join(", ");
  const facts = [
    `Titolo del momento: "${snap.title}"`,
    where ? `Luogo: ${where}` : "",
  ].filter(Boolean).join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      system:
        (lang === "it"
          ? "Sei l'assistente di MindRoute. Data una nota di diario di viaggio salvata da una persona, scrivi UNA sola frase di riflessione, calda e non banale, in italiano, seconda persona singolare. "
          : "You are MindRoute's assistant. Given a travel-journal note a person saved, write ONE single reflective sentence, warm and non-obvious, in ENGLISH, second person. ") +
        "Rifletti SOLO su ciò che la nota e il luogo suggeriscono: non inventare fatti, dettagli, emozioni o eventi non presenti. " +
        "Niente aggettivi vuoti (unico, speciale, magico), niente emoji, niente virgolette. Solo la frase, nient'altro.",
      messages: [{
        role: "user",
        content: `${facts}\n\n${lang === "it" ? "Scrivi la frase di riflessione." : "Write the reflection sentence."}`,
      }],
    });
    const block = message.content[0];
    const text = block.type === "text" ? block.text.trim().replace(/^["']|["']$/g, "") : "";
    if (!text) return null;
    cache.set(key, text);
    if (cache.size > 400) cache.delete(cache.keys().next().value as string);
    return text;
  } catch (e) {
    console.warn("[moment-reflection] Haiku failed:", e);
    return null;
  }
}
