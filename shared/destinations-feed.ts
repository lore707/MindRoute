// Shared shape + curated fallback for the landing destinations feed strip.
// Used by:
//   • GET /api/destinations-feed (server) — when real items < 12, fills up to
//     16-20 with these brand-aligned entries.
//   • LandingCinematic (client) — instant fallback during fetch and on error.
// Keeping the list in /shared keeps server and client honest about a single
// source of truth: anti-mainstream destinations that match the product's
// editorial positioning (no Marrakech / Bali / Santorini).

export type DestinationsFeedItem = {
  name: string;
  country: string | null;
  flag: string;
  vibe: string | null;
  isRecent: boolean;
  relativeTime: string | null;
};

export const CURATED_DESTINATIONS_FEED: DestinationsFeedItem[] = [
  { name: "Faroe Islands", country: "Denmark",   flag: "🇩🇰", vibe: "Wild",          isRecent: false, relativeTime: null },
  { name: "Hokkaido",      country: "Japan",     flag: "🇯🇵", vibe: "Contemplative", isRecent: false, relativeTime: null },
  { name: "Procida",       country: "Italy",     flag: "🇮🇹", vibe: "Authentic",     isRecent: false, relativeTime: null },
  { name: "Naxos",         country: "Greece",    flag: "🇬🇷", vibe: "Quiet",         isRecent: false, relativeTime: null },
  { name: "Sintra",        country: "Portugal",  flag: "🇵🇹", vibe: "Mysterious",    isRecent: false, relativeTime: null },
  { name: "Cartagena",     country: "Colombia",  flag: "🇨🇴", vibe: "Vivid",         isRecent: false, relativeTime: null },
  { name: "Mestia",        country: "Georgia",   flag: "🇬🇪", vibe: "Remote",        isRecent: false, relativeTime: null },
  { name: "Tasmania",      country: "Australia", flag: "🇦🇺", vibe: "Untamed",       isRecent: false, relativeTime: null },
  { name: "Hydra",         country: "Greece",    flag: "🇬🇷", vibe: "Timeless",      isRecent: false, relativeTime: null },
  { name: "Matera",        country: "Italy",     flag: "🇮🇹", vibe: "Ancient",       isRecent: false, relativeTime: null },
  { name: "San Sebastián", country: "Spain",     flag: "🇪🇸", vibe: "Savory",        isRecent: false, relativeTime: null },
  { name: "Lofoten",       country: "Norway",    flag: "🇳🇴", vibe: "Dramatic",      isRecent: false, relativeTime: null },
];
