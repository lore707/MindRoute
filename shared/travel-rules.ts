import type { TraitVector } from "./traits";

export type TravelRule = {
  id: string;
  title: { it: string; en: string };
  body: { it: string; en: string };
  prompt: string;
  source: "current" | "learned";
};

export type TravelRuleInput = {
  vector?: TraitVector | Record<string, number> | null;
  pace?: string | null;
  avoid?: string[] | null;
  seek?: string[] | null;
};

const text = (values: string[] | null | undefined) => (values ?? []).join(" ").toLowerCase();

export function deriveTravelRules(input: TravelRuleInput, max = 4): TravelRule[] {
  const rules: TravelRule[] = [];
  const vector = input.vector ?? null;
  const pace = (input.pace ?? "").toLowerCase();
  const avoid = text(input.avoid);
  const seek = text(input.seek);
  const add = (rule: TravelRule) => {
    if (!rules.some((item) => item.id === rule.id)) rules.push(rule);
  };

  if (pace === "slow") {
    add({
      id: "slow-days",
      title: { it: "Giornate con piu respiro", en: "More breathing room" },
      body: { it: "Massimo due momenti principali e spazio libero ogni giorno.", en: "No more than two anchor moments, with free time every day." },
      prompt: "Use no more than two anchor moments per day and preserve a meaningful unplanned block every day.",
      source: "current",
    });
  } else if (pace === "intense") {
    add({
      id: "full-days",
      title: { it: "Giornate dense, senza tempi morti", en: "Full days without dead time" },
      body: { it: "Piu esperienze, ma raggruppate per zona per restare realistiche.", en: "More experiences, grouped by area so the plan stays realistic." },
      prompt: "Build energetic days with several experiences, but cluster them geographically and keep transfer times realistic.",
      source: "current",
    });
  } else if (vector && vector.structure >= 0.62) {
    add({
      id: "spontaneous-space",
      title: { it: "Tempo non programmato protetto", en: "Protected unplanned time" },
      body: { it: "Meno prenotazioni rigide e almeno una fascia aperta al giorno.", en: "Fewer rigid bookings and at least one open block each day." },
      prompt: "Protect spontaneity: avoid reservation-heavy days and leave at least one open block per day.",
      source: "learned",
    });
  } else if (vector && vector.structure <= 0.36) {
    add({
      id: "clear-structure",
      title: { it: "Una struttura chiara", en: "A clear structure" },
      body: { it: "Orari, spostamenti e alternative devono essere definiti in anticipo.", en: "Timing, transfers and alternatives should be clear in advance." },
      prompt: "Provide a clear daily structure with explicit timing, transfers, booking needs and one fallback option.",
      source: "learned",
    });
  }

  if (/trasfer|transfer|transit|cambio|spostament/.test(avoid)) {
    add({
      id: "few-transfers",
      title: { it: "Pochi cambi di base", en: "Fewer base changes" },
      body: { it: "Una base principale quando possibile e tragitti brevi tra le tappe.", en: "One main base where possible and short journeys between stops." },
      prompt: "Minimize transfers: prefer one main base, never add a base change unless it materially improves the trip.",
      source: "current",
    });
  }

  if (/mattin|morning|svegl|early/.test(avoid)) {
    add({
      id: "late-starts",
      title: { it: "Partenze senza sveglie forzate", en: "No forced early starts" },
      body: { it: "Le giornate iniziano dopo le 9 salvo necessita reali.", en: "Days start after 9 unless an early departure is genuinely necessary." },
      prompt: "Avoid starts before 09:00 unless transport or access rules make them genuinely necessary.",
      source: "current",
    });
  }

  if (/affoll|crowd|turistic|tourist/.test(avoid)) {
    add({
      id: "low-crowd",
      title: { it: "Meno folla, piu contesto locale", en: "Fewer crowds, more local texture" },
      body: { it: "Quartieri vissuti e orari intelligenti al posto delle code.", en: "Lived-in neighbourhoods and smarter timing instead of queues." },
      prompt: "Reduce crowd exposure through local neighbourhoods, off-peak timing and alternatives to the most congested sights.",
      source: "current",
    });
  }

  if (/cibo|food|gastr|ristor|mercat|market|local/.test(seek)) {
    add({
      id: "food-led",
      title: { it: "Il cibo guida una parte del viaggio", en: "Food shapes part of the journey" },
      body: { it: "Mercati, indirizzi locali e pasti con un motivo preciso.", en: "Markets, local addresses and meals chosen for a clear reason." },
      prompt: "Make food a real narrative layer: include local markets and specific eating moments with cultural context, not generic restaurant filler.",
      source: "learned",
    });
  }

  if (vector && vector.social <= 0.32) {
    add({
      id: "quiet-social",
      title: { it: "Piu spazio personale", en: "More personal space" },
      body: { it: "Meno attivita di gruppo e serate che funzionano anche senza compagnia.", en: "Fewer group activities and evenings that work without company." },
      prompt: "Prioritize personal space: avoid group-dependent activities and nightlife-led evenings.",
      source: "learned",
    });
  }

  if (vector && vector.matter >= 0.67) {
    add({
      id: "nature-anchor",
      title: { it: "La natura come momento centrale", en: "Nature as a central moment" },
      body: { it: "Almeno un paesaggio importante, vissuto senza fretta.", en: "At least one meaningful landscape, experienced without rushing." },
      prompt: "Give nature a central role with at least one substantial landscape experience and enough time to inhabit it rather than just photograph it.",
      source: "learned",
    });
  } else if (vector && vector.matter <= 0.33) {
    add({
      id: "human-texture",
      title: { it: "Citta, cultura e vita quotidiana", en: "Cities, culture and daily life" },
      body: { it: "Quartieri, storia e persone prima dei semplici panorami.", en: "Neighbourhoods, history and people before scenery alone." },
      prompt: "Prioritize human texture: neighbourhoods, history, architecture and everyday local life over scenery-only moments.",
      source: "learned",
    });
  }

  return rules.slice(0, max);
}

export function formatTravelRulesBlock(input: TravelRuleInput): string {
  const rules = deriveTravelRules(input, 5);
  if (!rules.length) return "";
  return `

TRAVEL RULES - concrete consequences of what this traveller said and what MindRoute learned
These rules must be visible in the actual schedule, not merely mentioned in the introduction. Current-trip constraints always override learned rules.
${rules.map((rule) => `- ${rule.prompt}`).join("\n")}
After drafting, verify that every rule can be pointed to in at least one concrete itinerary decision.
`;
}
