import { destinationCatalog, type CatalogDestination, type PrimaryTag } from "./destination-catalog";

interface ProfilingInput {
  answers: string[];
  budget: string;
  departure: string;
  days: number;
  leaveDate: string;
  companions?: string;
  constraints?: string;
}

// ─── TAG DETECTION ────────────────────────────────────────────────────────────

function detectPrimaryTag(answers: string[]): PrimaryTag {
  const text = answers.join(" ").toLowerCase();
  const scores: Record<PrimaryTag, number> = { recovery: 0, explorer: 0, seeker: 0, social: 0, romantic: 0 };

  const patterns: Record<PrimaryTag, string[]> = {
    recovery: ["staccare","disconnettere","pausa","riposare","esaurito","esausta","stress","burnout","rallentare","silenzio","pace","rigenerare","ricaricare","respiro","disconnect","rest","slow","peace","recharge","exhausted","tired","relax","calm","quiet","reset","escape","healing"],
    explorer: ["scoprire","esplorare","avventura","nuovo","ignoto","diverso","sorpresa","inaspettato","lontano","nascosto","sconosciuto","discover","explore","adventure","new","unknown","different","unexpected","hidden","offbeat","wander"],
    seeker: ["significato","profondo","spirituale","capire","riflessione","trasformazione","crescita","cultura","storia","anima","essenziale","meaning","deep","spiritual","understand","reflection","transformation","growth","culture","history","soul","authentic","truth","philosophy"],
    social: ["divertirsi","festa","vivere","energia","gente","ballare","mangiare insieme","connessione","vita notturna","vibrante","caotico","spontaneo","fun","party","energy","people","dance","nightlife","vibrant","chaotic","spontaneous","celebrate","festive","lively"],
    romantic: ["romantico","coppia","insieme","amore","speciale","magico","intimo","ricordo","condividere","partner","fidanzato","fidanzata","romantic","couple","love","special","magical","intimate","share","anniversary","honeymoon"]
  };

  for (const [tag, words] of Object.entries(patterns) as [PrimaryTag, string[]][]) {
    for (const word of words) {
      if (text.includes(word)) scores[tag] += 2;
    }
  }

  let best: PrimaryTag = "explorer";
  let bestScore = -1;
  for (const [tag, score] of Object.entries(scores) as [PrimaryTag, number][]) {
    if (score > bestScore) { bestScore = score; best = tag; }
  }
  return best;
}

function detectSecondaryTags(answers: string[]): PrimaryTag[] {
  const tags = new Set<PrimaryTag>();
  const text = answers.join(" ").toLowerCase();

  const patterns: Record<PrimaryTag, string[]> = {
    recovery: ["rigenerante","silenzioso","lusso discreto","intimo","rigenerating","quiet","slow","healing"],
    explorer: ["selvaggio","caotico","esplorativo","avventuroso","wild","chaotic","explorative","adventure","offbeat"],
    seeker: ["spirituale","autentico","cultural","culturale","spiritual","authentic","mindful"],
    social: ["festoso","festive","vibrant","vibrante","nightlife"],
    romantic: ["romantico","romantic","intimate","couple"]
  };

  for (const [tag, words] of Object.entries(patterns) as [PrimaryTag, string[]][]) {
    for (const word of words) {
      if (text.includes(word)) { tags.add(tag); break; }
    }
  }
  return Array.from(tags);
}

function detectAntiPatterns(answers: string[]): string[] {
  const drains: string[] = [];
  const text = answers.join(" ").toLowerCase();
  const drainWords = ["crowded","affollati","touristy","turistici","guided","guidate","museums","musei","resort","nightlife","vita notturna","schedules","programmi rigidi"];
  for (const d of drainWords) {
    if (text.includes(d)) drains.push(d);
  }
  return drains;
}

function detectVisualAesthetic(answers: string[]): string {
  const text = answers.join(" ").toLowerCase();
  if (text.includes("medina")) return "medina";
  if (text.includes("nordic") || text.includes("nordico")) return "nordic";
  if (text.includes("temple") || text.includes("tempio")) return "temple";
  if (text.includes("desert") || text.includes("deserto")) return "desert";
  if (text.includes("seaside") || text.includes("mare")) return "seaside";
  if (text.includes("trail") || text.includes("sentiero")) return "trail";
  if (text.includes("cafe") || text.includes("caffè")) return "cafe";
  if (text.includes("market") || text.includes("mercato")) return "market";
  return "";
}

function detectChaosLevel(answers: string[]): "low" | "medium" | "high" {
  for (const a of answers) {
    const num = parseInt(a);
    if (!isNaN(num) && a.length <= 3) {
      if (num < 35) return "low";
      if (num > 65) return "high";
      return "medium";
    }
  }
  return "medium";
}

function detectDistancePref(answers: string[]): "close" | "continent" | "far" | "anywhere" {
  const text = answers.join(" ").toLowerCase();
  if (text.includes("anywhere") || text.includes("ovunque") || text.includes("sorprend")) return "anywhere";
  if (text.includes("far") || text.includes("lontano")) return "far";
  if (text.includes("continent") || text.includes("continente")) return "continent";
  if (text.includes("close") || text.includes("vicino")) return "close";
  return "anywhere";
}

// ─── SEASON / DURATION / COMPANIONS ──────────────────────────────────────────

const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTH_TO_SEASON: Record<string, string> = {
  jan:"winter",feb:"winter",mar:"spring",apr:"spring",may:"spring",
  jun:"summer",jul:"summer",aug:"summer",sep:"autumn",oct:"autumn",nov:"autumn",dec:"winter"
};

function parseSeasons(leaveDate: string): string[] {
  const found: string[] = [];
  const text = leaveDate.toLowerCase();

  const dm = leaveDate.match(/\d{4}-(\d{2})-\d{2}/);
  if (dm) {
    const mk = MONTH_KEYS[parseInt(dm[1]) - 1];
    if (mk) found.push(mk, MONTH_TO_SEASON[mk]);
  }

  if (found.length === 0) {
    const names: Record<string,string[]> = {
      jan:["jan","january","gennaio"],feb:["feb","february","febbraio"],
      mar:["mar","march","marzo"],apr:["apr","april","aprile"],
      may:["may","maggio"],jun:["jun","june","giugno"],
      jul:["jul","july","luglio"],aug:["aug","august","agosto"],
      sep:["sep","september","settembre"],oct:["oct","october","ottobre"],
      nov:["nov","november","novembre"],dec:["dec","december","dicembre"]
    };
    for (const [k,vs] of Object.entries(names)) {
      if (vs.some(v => text.includes(v))) found.push(k, MONTH_TO_SEASON[k]);
    }
    if (text.includes("spring")||text.includes("primavera")) found.push("spring","mar","apr","may");
    if (text.includes("summer")||text.includes("estate")) found.push("summer","jun","jul","aug");
    if (text.includes("autumn")||text.includes("autunno")) found.push("autumn","sep","oct","nov");
    if (text.includes("winter")||text.includes("inverno")) found.push("winter","dec","jan","feb");
    if (text.includes("anytime")||text.includes("qualsiasi")||text.includes("flexible")) {
      found.push("spring","summer","autumn","winter");
    }
  }
  return [...new Set(found)];
}

function getDurationKey(days: number): string {
  if (days <= 4) return "weekend";
  if (days <= 7) return "week";
  if (days <= 14) return "10-14";
  return "long";
}

function normalizeCompanions(raw?: string): string {
  if (!raw) return "";
  const t = raw.toLowerCase();
  if (t.includes("solo")||t.includes("alone")||t.includes("da solo")) return "solo";
  if (t.includes("couple")||t.includes("partner")||t.includes("coppia")) return "couple";
  if (t.includes("friends")||t.includes("amici")||t.includes("group")) return "friends";
  if (t.includes("family")||t.includes("famiglia")||t.includes("kids")) return "family";
  return t;
}

function isEuropean(departure: string): boolean {
  const EUROPEAN_CITIES = ["milan","milano","rome","roma","london","paris","berlin","madrid","barcelona","amsterdam","brussels","vienna","zurich","lisbon","munich","frankfurt","hamburg","dublin","copenhagen","stockholm","oslo","helsinki","athens","prague","warsaw","bucharest","budapest","naples","napoli","florence","firenze","venice","venezia","turin","torino","bologna","genova"];
  const lower = departure.toLowerCase();
  return EUROPEAN_CITIES.some(c => lower.includes(c));
}

// ─── SCORING ──────────────────────────────────────────────────────────────────

function scoreDestination(
  dest: CatalogDestination,
  primaryTag: PrimaryTag,
  secondaryTags: PrimaryTag[],
  antiPatterns: string[],
  visual: string,
  chaosLevel: "low"|"medium"|"high",
  distancePref: "close"|"continent"|"far"|"anywhere",
  input: ProfilingInput
): number {
  let score = 0;

  // Primary tag — most important
  if (dest.primaryTags.includes(primaryTag)) {
    score += dest.primaryTags[0] === primaryTag ? 50 : 35;
  }

  // Secondary tags
  for (const tag of secondaryTags) {
    if (dest.primaryTags.includes(tag)) score += 15;
  }

  // Visual aesthetic
  const aestheticMap: Record<string, string[]> = {
    medina: ["Morocco","Jordan","Tunisia","Turkey"],
    nordic: ["Norway","Iceland","Denmark","Sweden","Finland"],
    temple: ["Japan","Laos","India","Cambodia","Thailand"],
    desert: ["Morocco","Uzbekistan","Jordan","Chile","Argentina"],
    seaside: ["Portugal","Italy","Greece","Croatia"],
    trail: ["Iceland","Norway","Chile","Argentina","New Zealand"],
    cafe: ["Czech Republic","Portugal","France","Austria"],
    market: ["Georgia","Morocco","Mexico","Colombia","Albania"]
  };
  if (visual && (aestheticMap[visual]||[]).includes(dest.country)) score += 12;

  // Anti-patterns
  const highChaos = new Set(["Napoli, Italia","Marrakech, Marocco","Varanasi, India","Medellín, Colombia"]);
  const lowChaos = new Set(["Azzorre, Portogallo","Alentejo, Portogallo","Madeira, Portogallo","Isole Lofoten, Norvegia","Luang Prabang, Laos"]);

  if ((antiPatterns.includes("crowded")||antiPatterns.includes("affollati")) && highChaos.has(dest.name)) score -= 20;
  if ((antiPatterns.includes("nightlife")||antiPatterns.includes("vita notturna")) && new Set(["Medellín, Colombia","Napoli, Italia"]).has(dest.name)) score -= 15;

  // Chaos tolerance
  if (chaosLevel === "low" && highChaos.has(dest.name)) score -= 15;
  if (chaosLevel === "high" && lowChaos.has(dest.name)) score -= 10;
  if (chaosLevel === "low" && lowChaos.has(dest.name)) score += 8;
  if (chaosLevel === "high" && highChaos.has(dest.name)) score += 8;

  // Budget
  const budgetOrder = ["low","medium","high","unlimited"];
  if (input.budget && dest.budgetTier.includes(input.budget as any)) {
    score += 12;
  } else if (input.budget) {
    const userIdx = budgetOrder.indexOf(input.budget);
    const destMin = Math.min(...dest.budgetTier.map(t => budgetOrder.indexOf(t)));
    if (destMin > userIdx + 1) score -= 15;
  }

  // Season
  const seasons = parseSeasons(input.leaveDate);
  if (seasons.length > 0) {
    if (seasons.some(s => dest.seasons.includes(s))) score += 10;
    else score -= 5;
  }

  // Duration
  const dur = getDurationKey(input.days);
  if (dest.durationFit.includes(dur as any)) score += 8;

  // Companions
  const comp = normalizeCompanions(input.companions);
  if (comp && dest.companionFit.includes(comp as any)) score += 7;

  // Distance preference
  const european = isEuropean(input.departure);
  const longHaul = ["asia","americas","oceania"].includes(dest.region);

  if (distancePref === "close") {
    if (european && dest.region === "europe") score += 12;
    if (european && longHaul) score -= 15;
  } else if (distancePref === "far") {
    if (european && longHaul) score += 10;
    if (european && dest.region === "europe") score -= 5;
  } else if (distancePref === "continent") {
    if (european && dest.region === "europe") score += 6;
  }
  // "anywhere" = no penalty

  // Constraints
  const c = (input.constraints || "").toLowerCase();
  if ((c.includes("wheelchair") || c.includes("sedia a rotelle")) && ["Patagonia, Argentina & Cile","Isole Lofoten, Norvegia"].includes(dest.name)) score -= 20;
  if ((c.includes("fear of flying") || c.includes("paura di volare")) && longHaul) score -= 12;
  if ((c.includes("vegetarian") || c.includes("vegan") || c.includes("vegetariano")) && ["Bali, Indonesia","Kyoto, Giappone"].includes(dest.name)) score += 5;

  return score;
}

// ─── GENERATE PERSONALIZED WHY ────────────────────────────────────────────────

function getPersonalizedWhy(dest: CatalogDestination, primaryTag: PrimaryTag): string {
  return dest.whyYoursTemplates[primaryTag] || dest.whyYoursTemplates[dest.primaryTags[0]] || dest.whyYours || "";
}

function getPersonalizedItinerary(dest: CatalogDestination, primaryTag: PrimaryTag) {
  return dest.itineraries[primaryTag] || dest.itineraries[dest.primaryTags[0]] || dest.itinerary;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export function matchDestinations(input: ProfilingInput): CatalogDestination[] {
  const profileAnswers = (input.answers[0] === "path_a" || input.answers[0] === "path_b")
    ? input.answers.slice(1)
    : input.answers;

  const primaryTag = detectPrimaryTag(profileAnswers);
  const secondaryTags = detectSecondaryTags(profileAnswers);
  const antiPatterns = detectAntiPatterns(profileAnswers);
  const visual = detectVisualAesthetic(profileAnswers);
  const chaosLevel = detectChaosLevel(profileAnswers);
  const distancePref = detectDistancePref(profileAnswers);

  const scored = destinationCatalog.map(dest => ({
    dest,
    score: scoreDestination(dest, primaryTag, secondaryTags, antiPatterns, visual, chaosLevel, distancePref, input)
  }));

  scored.sort((a, b) => b.score - a.score);

  // Ensure variety — don't return 3 from same country
  const result: CatalogDestination[] = [];
  const usedCountries = new Set<string>();

  for (const { dest } of scored) {
    if (result.length >= 3) break;
    if (result.length === 2 && usedCountries.has(dest.country)) continue;
    result.push(dest);
    usedCountries.add(dest.country);
  }

  // Fallback if not enough
  if (result.length < 3) {
    for (const { dest } of scored) {
      if (!result.includes(dest)) result.push(dest);
      if (result.length >= 3) break;
    }
  }

  return result;
}

export function generateDestinations(input: ProfilingInput): {
  destinations: Array<{
    name: string;
    whyYours: string;
    experiencePreview: string;
    practicalInfo: string;
    imageUrl: string;
  }>;
  itineraries: Map<string, any>;
} {
  const profileAnswers = (input.answers[0] === "path_a" || input.answers[0] === "path_b")
    ? input.answers.slice(1)
    : input.answers;

  const primaryTag = detectPrimaryTag(profileAnswers);
  const matched = matchDestinations(input);

  const destinations = matched.map(d => ({
    name: d.name,
    whyYours: getPersonalizedWhy(d, primaryTag),
    experiencePreview: d.experiencePreview,
    practicalInfo: d.practicalInfo,
    imageUrl: d.imageUrl,
  }));

  const itineraries = new Map<string, any>();
  for (const d of matched) {
    itineraries.set(d.name, getPersonalizedItinerary(d, primaryTag));
  }

  return { destinations, itineraries };
}
