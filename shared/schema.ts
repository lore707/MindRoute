import { pgTable, text, serial, integer, jsonb, timestamp, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whyYours: text("why_yours").notNull(),
  experiencePreview: text("experience_preview").notNull(),
  practicalInfo: text("practical_info").notNull(),
  imageUrl: text("image_url"),
  // Ruolo della destinazione nella tripletta:
  //   "direct"   = risposta più aderente al profilo
  //   "lateral"  = stessa emozione, angolo diverso
  //   "surprise" = predicted-positive che l'utente non avrebbe cercato
  // Nullable solo per backward-compat con rows pre-feature.
  slotRole: text("slot_role"),
  // Etichetta "angolo" del viaggio: valorizzata SOLO quando l'utente ha indicato
  // una città precisa (es. "Barcellona") e la tripletta diventa 3 modi di vivere
  // la stessa città. Es. "Architecture & Design". Altrimenti null. Il `name` resta
  // pulito ("Città, Paese") così geocoding/immagini/OG non si rompono.
  tagline: text("tagline"),
});

export type DestinationSlotRole = "direct" | "lateral" | "surprise";

export const profilingInputs = pgTable("profiling_inputs", {
  id: serial("id").primaryKey(),
  input: jsonb("input").notNull(),
});

export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  destinationId: integer("destination_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: text("created_at"),
  days: jsonb("days").$type<any[]>().notNull(),
  budgetSummary: text("budget_summary").notNull(),
  packingList: text("packing_list").notNull(),
  bestTime: text("best_time").notNull(),
  gettingThere: text("getting_there").notNull(),
  closingMessage: text("closing_message").notNull(),
  destinationName: text("destination_name"),
  tripSummary: text("trip_summary"),
  highlights: jsonb("highlights").$type<string[]>(),
  whyYours: text("why_yours"),
  heroImageUrl: text("hero_image_url"),
  heroPhotographer: text("hero_photographer"),
  heroPhotographerUrl: text("hero_photographer_url"),
 topAffiliateLinks: jsonb("top_affiliate_links").$type<Record<string, string>>(),
  rawNarrative: text("raw_narrative"),
  // v2 — moment-based schema. schemaVersion=1 → legacy (morning/lunch/afternoon/evening),
  // schemaVersion=2 → moments[]. Readers dispatch on this column.
  schemaVersion: integer("schema_version").notNull().default(1),
  country: text("country"),
  // tripMeta holds v2-only top-level metadata that doesn't justify its own
  // column: em_word, travel_dates, total_cost_bookable, total_cost_onsite,
  // total_cost_range, map_points. Null for v1 rows.
  tripMeta: jsonb("trip_meta").$type<TripMetaV2 | null>(),
  // Token opaco per la condivisione pubblica read-only (/i/:token). Generato
  // al primo "Condividi"; null finché non si condivide. Unique.
  publicToken: text("public_token").unique(),
  // Snapshot del profiling input che ha generato QUESTO itinerario. Persistito
  // per-itinerario così le letture (GET, regenerate-day) non dipendono più dallo
  // slot globale profiling_inputs (race cross-utente). Nullable: le righe legacy
  // ricadono sul fallback globale. MAI esposto nella condivisione pubblica.
  profilingInput: jsonb("profiling_input").$type<any>(),
  // Lingua in cui il CONTENUTO generato è stato scritto ("en" | "it"). Il
  // contenuto AI è monolingua e fisso alla creazione: i lettori forzano la UI
  // su questa lingua invece di mostrare una pagina mezza tradotta. Null sulle
  // righe legacy (ricadono sulla preferenza globale dell'utente).
  lang: text("lang"),
});

// ── v2 — moment-based itinerary types ──────────────────────────────────────
// Replaces the v1 day shape (morning/lunch/afternoon/evening text strings)
// with a structured moments[] array per day. Readers must dispatch on
// itinerary.schemaVersion to pick the right shape.

export type MomentType =
  | "transport"      // flight/train/bus/ferry/taxi/transfer
  | "accommodation"  // hotel/B&B/check-in/check-out
  | "food"           // restaurant/street food/market
  | "experience"     // tour/activity/museum/class/boat
  | "walk"           // free wander, neighborhood exploration
  | "view"           // viewpoint/sunset/beach
  | "rest";          // free time/back to hotel/decompression

export type BookingStatus =
  | "bookable_now"        // strong CTA, prenotabile ora
  | "reserve_recommended" // consigliato prenotare, walk-in possibile
  | "walk_in";            // info only, no booking

export type BookingProvider =
  | "skyscanner" | "trainline" | "flixbus" | "booking" | "getyourguide"
  | "viator" | "civitatis" | "musement" | "klook" | "samboat"
  | "thefork" | "expedia_cars" | "welcome_pickups" | "direct" | "none"
  // Monetized affiliate partners the v2 prompt is instructed to prefer.
  | "expedia" | "hotels" | "tablet_hotels" | "tripadvisor";

export type EnergyLevel = "low" | "medium" | "high";

export type TransportMode =
  | "walk" | "taxi" | "metro" | "bus" | "train" | "ferry" | "drive" | "flight";

export type WeatherCondition =
  | "sunny" | "cloudy" | "rain" | "mixed" | "snow";

export interface BookingInfoV2 {
  // Free string: Claude returns provider names too varied to enumerate reliably
  // ("tripadvisor", "trenitalia", "liberty lines", "hotels.com"). Validated loosely
  // so a localized/unknown provider never fails the whole itinerary. See BookingProvider
  // for the canonical affiliate set the v2 prompt steers toward.
  provider: string;
  affiliate_url: string;
  display_label: string;
  status: BookingStatus;
}

export interface TransportToNextV2 {
  // Free string for the same reason as provider — Claude localizes/combines modes
  // ("a piedi", "bici", "aliscafo", "bici → a piedi"); too open to enumerate.
  mode: string;
  duration_min: number;
  cost_estimate?: string;
  note?: string;
}

export interface PlanBV2 {
  trigger: string;
  alternative: string;
}

export interface MomentV2 {
  id: string;
  type: MomentType;
  title_evocative: string;
  title_operational: string;
  // English canonical + Italian equivalents Claude emits when lang="it".
  time_label:
    | "morning" | "lunch" | "afternoon" | "evening" | "night"
    | "mattina" | "mezzogiorno" | "pomeriggio" | "sera" | "notte";
  start_time?: string;
  end_time?: string;
  duration_min?: number;
  cost_min?: number;
  cost_max?: number;
  cost_note?: string;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  image_url: string;
  image_alt: string;
  booking?: BookingInfoV2;
  description: string;
  why_this: string;
  transport_to_next?: TransportToNextV2;
  plan_b?: PlanBV2;
}

export interface WeatherForecastV2 {
  temp_min: number;
  temp_max: number;
  condition: WeatherCondition;
  note?: string;
}

export interface DayV2 {
  day_number: number;
  date?: string;
  arc: string;
  title_evocative: string;
  subtitle: string;
  hero_image_url: string;
  weather_forecast?: WeatherForecastV2;
  energy_level: EnergyLevel;
  energy_note?: string;
  walking_distance_km?: number;
  cost_bookable_total: number;
  cost_onsite_estimate: number;
  moments: MomentV2[];
}

export interface HighlightV2 {
  icon: string;
  name: string;
  description: string;
}

export interface MapPointV2 {
  day: number;
  lat: number;
  lng: number;
  label: string;
  // Categoria del punto, derivata dal tipo di momento (accommodation→lodging,
  // food→food, experience→experience, view/walk→sight). Guida icona/colore/filtro
  // sulla mappa. Opzionale per backward-compat con righe pre-feature.
  category?: PlaceCategory;
}

// Tassonomia dei punti mappa, condivisa da map_points (v1/v2) e saved_places.
// "custom" = punto cercato e salvato a mano dall'utente senza categoria nota.
export type PlaceCategory =
  | "lodging" | "experience" | "food" | "sight" | "beach" | "custom";

export interface TripMetaV2 {
  em_word?: string;
  travel_dates?: { start: string; end: string };
  total_cost_bookable: number;
  total_cost_onsite_estimate: number;
  total_cost_range: string;
  map_points?: MapPointV2[];
  // v2 highlights are richer objects; v1 highlights stay as string[] in the
  // legacy column. Reader picks based on schemaVersion.
  highlights_v2?: HighlightV2[];
}

export const insertDestinationSchema = createInsertSchema(destinations).omit({ id: true });
export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

export const insertItinerarySchema = createInsertSchema(itineraries).omit({ id: true });
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type Itinerary = typeof itineraries.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const recentDestinations = pgTable("recent_destinations", {
  id: serial("id").primaryKey(),
  destinationName: text("destination_name").notNull(),
  flag: text("flag").notNull(),
  lat: real("lat"),
  lon: real("lon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-user psychological trait snapshots. Written at two events:
//   (a) profiling submit          → source = "quiz"
//   (b) destination chosen + gen  → source = "pick" (blended with destination)
// History allows the UI to show the user's profile evolving over time.
// mappingVersion lets us change weights without invalidating old rows.
export const traitSnapshots = pgTable("trait_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  traits: jsonb("traits").notNull().$type<{
    exposure: number; comfort: number; social: number; matter: number; structure: number;
  }>(),
  source: text("source").notNull(), // "quiz" | "pick"
  sourceItineraryId: integer("source_itinerary_id").references(() => itineraries.id),
  mappingVersion: integer("mapping_version").notNull(),
  // Raw quiz signal that produced this snapshot — the actual chips/labels the
  // user selected plus their structured logistics. Persisted so the account
  // "Ritratto" can quote what the user *literally answered* (verbatim seek/avoid
  // lists, own-words constraints) rather than only the derived trait vector.
  // Nullable: pre-feature rows and synthetic "Genera dal profilo" snapshots
  // (no real chips) leave it null, and the Ritratto degrades gracefully.
  rawSignal: jsonb("raw_signal").$type<{
    answers: string[];
    companions: string | null;
    budget: string | null;
    travelStyle: string | null;
    constraints: string | null;
  } | null>(),
});
export type TraitSnapshot = typeof traitSnapshots.$inferSelect;
export type InsertTraitSnapshot = typeof traitSnapshots.$inferInsert;

// Per-user saved moments (Ondata B — "Bookmark trasversale"). L'utente può
// salvare singoli moment v2 dagli itinerari; collezione orizzontale che taglia
// attraverso i viaggi. momentSnapshot evita lookup join in lettura: ogni riga
// porta già con sé i dati minimi per renderizzare la card di anteprima.
export const savedMoments = pgTable("saved_moments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itineraryId: integer("itinerary_id").notNull().references(() => itineraries.id),
  momentId: text("moment_id").notNull(), // MomentV2.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
  momentSnapshot: jsonb("moment_snapshot").$type<{
    title: string;
    image_url: string | null;
    location_name: string | null;
    destination_name: string | null;
    day_number: number | null;
    type: string | null;
  } | null>(),
});
export type SavedMoment = typeof savedMoments.$inferSelect;
export type InsertSavedMoment = typeof savedMoments.$inferInsert;

// Posti salvati dalla mappa di un itinerario ("salva per dopo"). L'utente cerca
// qualsiasi luogo (Nominatim) o salva un punto già pingato e lo conserva legato
// a QUEL viaggio. Portiamo già lat/lng/label così la mappa ri-pinga senza dover
// ri-geocodificare. category = PlaceCategory; note = appunto libero opzionale.
export const savedPlaces = pgTable("saved_places", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itineraryId: integer("itinerary_id").notNull().references(() => itineraries.id),
  label: text("label").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  category: text("category").$type<PlaceCategory>(), // lodging|experience|food|sight|beach|custom
  address: text("address"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SavedPlace = typeof savedPlaces.$inferSelect;
export type InsertSavedPlace = typeof savedPlaces.$inferInsert;

// ── Travel companion chat (Fase 1) ─────────────────────────────────────────
// A conversation is the persistent "storico" of the companion. Anchored to an
// itinerary (itineraryId) = the companion of THAT trip; the natural 1:1 we
// look up by (userId, itineraryId). itineraryId nullable leaves room for a
// future general/planning thread.
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itineraryId: integer("itinerary_id").references(() => itineraries.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export const profilingRequestSchema = z.object({
  answers: z.array(z.string()),
  days: z.number(),
  leaveDate: z.string(),
  budget: z.string(),
  departure: z.string(),
  companions: z.string().optional(),
  constraints: z.string().optional(),
  travelStyle: z.string().optional(),
  lang: z.string().optional(),
});
export type ProfilingRequest = z.infer<typeof profilingRequestSchema>;
// Session storage for connect-pg-simple.
// Managed by the express-session middleware, NOT by Drizzle migrations.
// Declared here only so drizzle-kit doesn't try to drop it during db:push.
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
// Rate limiting counters per IP/user.
// Managed by the rate-limiter middleware, NOT by Drizzle migrations.
// Declared here only so drizzle-kit doesn't try to drop it during db:push.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});