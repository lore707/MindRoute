import type { Question, Translate } from "./types";

const drainChipKeys = ["guided", "crowded", "museums", "resort", "nightlife", "touristy", "transits", "mornings", "schedules", "smalltalk", "unfamiliarfood", "toomuchwalking", "tooisolated", "tooexpensive", "toolong"];
const drainSubsetKeys = ["guided", "crowded", "museums", "resort", "nightlife", "touristy", "transits", "mornings", "schedules", "smalltalk"];
const monthKeys = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pathAStyleChipKeys = ["wild", "quiet", "chaotic", "intimate", "solitary", "regenerating", "authentic", "quietluxury", "spiritual", "festive", "adventure", "romantic", "cultural", "explorative"];
const pathADistanceChipKeys = ["close", "continent", "far", "anywhere"];
const pathBGeoChipKeys = ["close", "europe", "asia", "americas", "africa", "oceania"];
const pathBTypeChipKeys = ["culture", "nature", "food", "beach", "city", "offgrid", "roadtrip", "trekking", "wellness", "discovery"];

function buildPathA(t: Translate): Question[] {
  return [
    { text: t("a.q1.text"), hint: t("a.q1.hint"), type: "chips", options: pathAStyleChipKeys.map((k) => t(`a.q1.chips.${k}`)), multi: true, max: 3, why: t("a.q1.why"), tags: ["vibe", "emotional tone", "trip color"], section: t("section.a.style") },
    { text: t("a.q2.text"), hint: t("a.q2.hint"), type: "text", placeholder: t("a.q2.placeholder"), why: t("a.q2.why"), tags: ["core need", "life phase", "emotional state"], section: t("section.a.need") },
    { text: t("a.q3.text"), hint: t("a.q3.hint"), type: "chips", options: drainChipKeys.map((k) => t(`chips.${k}`)), multi: true, addendum: t("a.q3.addendum"), why: t("a.q3.why"), tags: ["anti-patterns", "boundaries", "identity"], section: t("section.a.drains") },
    {
      text: t("a.q4.text"), hint: t("a.q4.hint"), type: "images", options: [
        { src: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=900&q=85", label: t("q4.medina"), sub: t("q4.medina.sub"), value: "medina" },
        { src: "https://images.unsplash.com/photo-1511497584788-876760111969?w=900&q=85", label: t("q4.nordic"), sub: t("q4.nordic.sub"), value: "nordic" },
        { src: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&q=85", label: t("q4.temple"), sub: t("q4.temple.sub"), value: "temple" },
        { src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=85", label: t("q4.desert"), sub: t("q4.desert.sub"), value: "desert" },
      ], why: t("a.q4.why"), tags: ["aesthetic signature", "visual instinct", "subconscious"], section: t("section.a.visual"),
    },
    { text: t("a.q5.text"), hint: t("a.q5.hint"), type: "slider", why: t("a.q5.why"), tags: ["chaos tolerance", "control need", "rhythm"], section: t("section.a.chaos") },
    { text: t("a.q6.text"), hint: t("a.q6.hint"), type: "text", placeholder: t("a.q6.placeholder"), why: t("a.q6.why"), tags: ["identity filter", "rejection", "self-knowledge"], section: t("section.a.rejection"), optional: true },
    { text: t("a.q7.text"), hint: t("a.q7.hint"), type: "chips", options: pathADistanceChipKeys.map((k) => t(`a.q7.chips.${k}`)), multi: false, why: t("a.q7.why"), tags: ["geography", "comfort zone", "openness"], section: t("section.a.distance") },
  ];
}

function buildPathB(t: Translate): Question[] {
  return [
    { text: t("b.q1.text"), hint: t("b.q1.hint"), type: "chips", options: pathBGeoChipKeys.map((k) => t(`b.q1.chips.${k}`)), multi: false, why: t("b.q1.why"), tags: ["geography", "constraint"], section: t("section.b.where") },
    {
      text: t("b.q2.text"),
      hint: t("b.q2.hint"),
      type: "chips",
      options: pathBTypeChipKeys.map((k) => t(`b.q2.chips.${k}`)),
      multi: true,
      max: 3,
      addendum: "Vuoi aggiungere qualcosa di specifico? (opzionale)",
      why: t("b.q2.why"),
      tags: ["trip type", "category", "combination"],
      section: t("section.b.type"),
    },
    {
      text: "Quale momento renderebbe questo viaggio davvero giusto?",
      hint: "Il momento che non vorresti perdere.",
      type: "chips",
      options: [
        "mangiare nei posti locali",
        "perdermi nei quartieri autentici",
        "vedere luoghi iconici",
        "stare immerso nella natura",
        "vivere qualcosa di completamente nuovo",
      ],
      multi: false,
      addendum: "Hai qualcosa di specifico in mente? (opzionale)",
      why: "Ci dice qual è il momento che deve assolutamente accadere perché il viaggio sia giusto per te.",
      tags: ["must-see", "motivation", "highlight"],
      section: t("section.b.specific"),
    },
    {
      text: t("b.q4.text"), hint: t("b.q4.hint"), type: "images", options: [
        { src: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=900&q=85", label: t("b.q4.seaside"), sub: t("b.q4.seaside.sub"), value: "seaside" },
        { src: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&q=85", label: t("b.q4.market"), sub: t("b.q4.market.sub"), value: "market" },
        { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=85", label: t("b.q4.trail"), sub: t("b.q4.trail.sub"), value: "trail" },
        { src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=85", label: t("b.q4.cafe"), sub: t("b.q4.cafe.sub"), value: "cafe" },
      ], why: t("b.q4.why"), tags: ["aesthetic", "atmosphere", "emotional tone"], section: t("section.b.atmosphere"),
    },
    { text: t("b.q5.text"), hint: t("b.q5.hint"), type: "slider", why: t("b.q5.why"), tags: ["rhythm", "control", "pace"], section: t("section.b.rhythm") },
    {
      text: "Come vorresti sentirti durante questo viaggio?",
      hint: "Non quello che vuoi fare, ma l’effetto che dovrebbe avere su di te.",
      type: "chips",
      options: [
        "Staccare davvero dalla routine",
        "Ritrovare energia e leggerezza",
        "Sentirmi libero e spontaneo",
        "Meravigliarmi di nuovo",
        "Sentire profondamente il luogo",
        "Uscire dalla mia zona di comfort",
      ],
      multi: true,
      addendum: "Vuoi aggiungere qualcosa di più personale? (opzionale)",
      why: "Definisce il tono emotivo del viaggio, oltre alle attività concrete.",
      tags: ["emotional need", "life phase", "core desire"],
      section: t("section.b.feeling"),
    },
    { text: t("b.q7.text"), hint: t("b.q7.hint"), type: "chips", options: drainSubsetKeys.map((k) => t(`chips.${k}`)), multi: true, addendum: t("b.q7.addendum"), why: t("b.q7.why"), tags: ["anti-patterns", "quick filter"], section: t("section.b.avoid") },
  ];
}

export function createProfilingContent(t: Translate) {
  return {
    questionsByPath: {
      a: buildPathA(t),
      b: buildPathB(t),
    },
    sliderLabels: [t("slider.s1"), t("slider.s2"), t("slider.s3"), t("slider.s4"), t("slider.s5"), t("slider.s6"), t("slider.s7")],
    microReactions: [t("micro.1"), t("micro.2"), t("micro.3"), t("micro.4"), t("micro.5"), t("micro.6"), t("micro.7")],
    months: monthKeys.map((k) => t(`months.${k}`)),
    analyzeTraits: [t("analyze.t1"), t("analyze.t2"), t("analyze.t3"), t("analyze.t4"), t("analyze.t5"), t("analyze.t6")],
  };
}

