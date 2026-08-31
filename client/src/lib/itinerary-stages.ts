export type JourneyStage = {
  key: string;
  name: string;
  startIndex: number;
  endIndex: number;
  dayIndexes: number[];
  image: string;
};

type StageTrip = {
  destinationName?: string;
  country?: string;
  heroImageUrl?: string;
  days?: any[];
};

const momentsOf = (day: any): any[] => Array.isArray(day?.editedMoments)
  ? day.editedMoments
  : Array.isArray(day?.moments) ? day.moments : [];
const momentPlace = (moment: any) => String(moment?.location_name ?? moment?.locationName ?? "");
const momentImage = (moment: any) => String(moment?.image_url ?? moment?.imageUrl ?? "");

const normalisePlace = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\s,.;:'’"()[\]{}\\/_-]+/g, " ")
  .trim()
  .toLowerCase();

function placeBase(value: string, country = "") {
  const parts = value.split(",").map(part => part.trim()).filter(Boolean);
  if (parts.length > 1 && country && normalisePlace(parts[parts.length - 1] ?? "") === normalisePlace(country)) {
    return parts[parts.length - 2] ?? parts[0];
  }
  return parts[parts.length - 1] ?? value.trim();
}

export function buildJourneyStages(trip: StageTrip): JourneyStage[] {
  const days = trip.days ?? [];
  const destinationBase = String(trip.destinationName ?? "Viaggio").split(",")[0].trim() || "Viaggio";
  const rawNames = days.map(day => {
    const explicit = day?.base_name ?? day?.baseName ?? day?.city ?? day?.destination ?? day?.location_name;
    if (explicit) return placeBase(String(explicit), trip.country ?? "");

    const candidates = momentsOf(day)
      .map(moment => momentPlace(moment).trim())
      .filter(Boolean)
      .map(value => placeBase(value, trip.country ?? ""))
      .filter(value => value.length > 1 && value.length < 42 && !/aeroporto|airport|stazione|station|hotel|ristorante|restaurant/i.test(value));
    if (!candidates.length) return destinationBase;

    const scores = new Map<string, { label: string; count: number; last: number }>();
    candidates.forEach((label, index) => {
      const key = normalisePlace(label);
      const current = scores.get(key);
      scores.set(key, { label, count: (current?.count ?? 0) + 1, last: index });
    });
    return Array.from(scores.values()).sort((a, b) => b.count - a.count || b.last - a.last)[0]?.label || destinationBase;
  });

  const names = rawNames.map((name, index) => {
    const role = String(days[index]?.role ?? "").toLowerCase();
    if (!/arriv|depart|partenz|transfer|trasfer/.test(role)) return name;
    return rawNames[index + 1] ?? rawNames[index - 1] ?? destinationBase;
  });

  const stages: JourneyStage[] = [];
  names.forEach((name, index) => {
    const previous = stages[stages.length - 1];
    if (previous && normalisePlace(previous.name) === normalisePlace(name)) {
      previous.endIndex = index;
      previous.dayIndexes.push(index);
      return;
    }
    const day = days[index];
    const image = day?.hero_image_url || day?.image || momentsOf(day).map(momentImage).find(Boolean) || trip.heroImageUrl || "";
    stages.push({ key: `${normalisePlace(name) || "stage"}-${index}`, name, startIndex: index, endIndex: index, dayIndexes: [index], image });
  });
  return stages;
}
