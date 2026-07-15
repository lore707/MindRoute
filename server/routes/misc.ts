import type { Express } from "express";
import { storage } from "../storage";
import { emaAggregate, AXIS_NAMES, type TraitVector, MAPPING_VERSION } from "@shared/traits";
import { getTraitHeadline } from "../trait-headline";
import { computeAccountInsights, continentOf, continentLabel } from "../account-insights";
import { buildPortrait } from "../portrait";
import { buildAtlas } from "../atlas";
import { getCachedLandingImageSet } from "../landing-images";
import { CURATED_DESTINATIONS_FEED, type DestinationsFeedItem } from "@shared/destinations-feed";

// Relative time for the landing strip, in the requester's UI language. The
// strings rendered here are short tokens ("2 ore fa", "ieri") so we localise
// on the server rather than shipping a date library to the client.
function relativeTime(d: Date, lang: "en" | "it"): string {
  const it = lang === "it";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return it ? "ora" : "now";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return it ? "ora" : "now";
  if (diffMin < 60) return it ? `${diffMin} min fa` : `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    if (it) return diffHr === 1 ? "1 ora fa" : `${diffHr} ore fa`;
    return diffHr === 1 ? "1 hour ago" : `${diffHr} hours ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return it ? "ieri" : "yesterday";
  return it ? `${diffDay} giorni fa` : `${diffDay} days ago`;
}

// UI language from the ?lang= query param. Defaults to IT so stale clients
// (cached bundles that don't send the param yet) keep today's behaviour.
function langOf(req: { query: Record<string, unknown> }): "en" | "it" {
  return req.query.lang === "en" ? "en" : "it";
}

export function registerMiscRoutes(app: Express) {
  // GET /api/me/trait-history — chronological snapshots + EMA-aggregated
  // current profile. 401 if anonymous, since trait history is per-user.
  app.get("/api/me/trait-history", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const snapshots = await storage.getTraitSnapshots(user.id);
      const validVectors = snapshots
        .filter(s => s.mappingVersion === MAPPING_VERSION)
        .map(s => s.traits as TraitVector);
      const current = emaAggregate(validVectors);
      // Delta vs first snapshot (only meaningful when we have 3+).
      const delta = validVectors.length >= 3
        ? Object.fromEntries(
            (Object.keys(current) as Array<keyof TraitVector>).map(k =>
              [k, current[k] - validVectors[0][k]] as const,
            ),
          ) as TraitVector
        : null;

      // Haiku-generated headline — only attempt with enough signal (N>=3).
      // Arricchita con i pattern dai viaggi (continente, durata media) così
      // produce frasi tipo "Sei un esploratore che torna in Europa per viaggi brevi".
      let headline: string | null = null;
      if (validVectors.length >= 3) {
        const trips = await storage.getUserItineraries(user.id);
        const lang = langOf(req);
        const { patterns } = computeAccountInsights(trips, lang);
        headline = await getTraitHeadline(user.id, current, validVectors.length, patterns, lang);
      }

      res.json({
        snapshots,
        current,
        delta,
        headline,
        axes: AXIS_NAMES,
        mappingVersion: MAPPING_VERSION,
      });
    } catch (err) {
      console.error("trait-history error:", err);
      res.status(500).json({ message: "Errore nel recupero del profilo" });
    }
  });

  // GET /api/me/portrait — bottom-up traveller portrait, grounded in real data
  // (verbatim seek/avoid chips, chosen destinations, revealed quiz↔pick gap,
  // evolution) + a fact-locked Haiku narrative. Degrades to available:false for
  // anonymous users or users with no signal yet.
  app.get("/api/me/portrait", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const portrait = await buildPortrait(user.id, langOf(req));
      res.json(portrait);
    } catch (err) {
      console.error("portrait error:", err);
      res.status(500).json({ message: "Errore nel recupero del ritratto" });
    }
  });

  // GET /api/me/daily-pick — "una meta che ti somiglia" per la Home dashboard.
  // Catalogo + coerenza-vettori, zero AI. null se non c'è ancora segnale.
  app.get("/api/me/daily-pick", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const lang = req.query.lang === "it" ? "it" : "en";
      const { computeDailyPick } = await import("../daily-pick");
      const pick = await computeDailyPick(user.id, lang);
      res.json(pick);
    } catch (err) {
      console.error("daily-pick error:", err);
      res.status(500).json({ message: "Errore nel calcolo della meta del giorno" });
    }
  });

  // GET /api/me/daily-picks — "Recommended for you today" (home dashboard,
  // 3 card). Stesso motore del daily pick esteso a N: catalogo + coerenza
  // vettori, zero AI, rotazione giornaliera. matchPct reale, niente prezzi.
  app.get("/api/me/daily-picks", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const lang = req.query.lang === "it" ? "it" : "en";
      const { computeDailyPicks } = await import("../daily-pick");
      const out = await computeDailyPicks(user.id, lang, 3);
      res.json(out);
    } catch (err) {
      console.error("daily-picks error:", err);
      res.status(500).json({ message: "Errore nel calcolo delle proposte" });
    }
  });

  // GET /api/weather?lat=&lon= — widget "Right now near you" della home.
  // Open-Meteo (gratis, senza chiave) + reverse-geocode Nominatim per
  // l'etichetta città. Senza lat/lon (geoloc negata) fa fallback sulla città
  // di partenza dell'ultimo profiling. Cache in-memory 10 min per coordinate
  // arrotondate: la home è la vista più aperta, Open-Meteo non va martellato.
  const weatherCache = new Map<string, { at: number; body: any }>();
  const revGeoCache = new Map<string, { at: number; label: string }>();
  app.get("/api/weather", async (req, res) => {
    try {
      let lat = Number(req.query.lat);
      let lon = Number(req.query.lon);
      let label = "";

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        // Fallback: città di partenza dell'ultimo profiling (best-effort).
        const user = (req as any).user;
        if (!user) return res.status(400).json({ message: "Posizione mancante" });
        const { computeProfileDefaults } = await import("../profile-defaults");
        const departure = (await computeProfileDefaults(user.id)).departure?.trim();
        if (!departure) return res.status(404).json({ message: "Nessuna posizione nota" });
        const { geocodeDestination } = await import("../geocode-place");
        const geo = await geocodeDestination(departure);
        if (!geo) return res.status(404).json({ message: "Posizione non risolvibile" });
        lat = geo.lat; lon = geo.lng;
        label = departure;
      }

      const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
      const hit = weatherCache.get(key);
      if (hit && Date.now() - hit.at < 10 * 60_000) {
        res.set("Cache-Control", "private, max-age=600");
        return res.json({ ...hit.body, label: label || hit.body.label });
      }

      const wr = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!wr.ok) throw new Error(`open-meteo ${wr.status}`);
      const w = await wr.json() as any;
      const cur = w?.current;
      if (!cur || typeof cur.temperature_2m !== "number") throw new Error("open-meteo shape");

      // Etichetta città via reverse Nominatim (cache 6h) — solo se non l'abbiamo già.
      if (!label) {
        const rg = revGeoCache.get(key);
        if (rg && Date.now() - rg.at < 6 * 3600_000) {
          label = rg.label;
        } else {
          try {
            const nr = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=10&accept-language=it`,
              { headers: { "User-Agent": "MindRoute/1.0 (mindroutetravel@gmail.com)" }, signal: AbortSignal.timeout(5000) },
            );
            if (nr.ok) {
              const j = await nr.json() as any;
              const a = j?.address ?? {};
              label = a.city || a.town || a.village || a.municipality || j?.name || "";
              if (label) revGeoCache.set(key, { at: Date.now(), label });
            }
          } catch { /* label vuota: il client mostra solo il meteo */ }
        }
      }

      const body = {
        label,
        tempC: Math.round(cur.temperature_2m),
        code: cur.weather_code as number,
        isDay: cur.is_day === 1,
      };
      weatherCache.set(key, { at: Date.now(), body });
      if (weatherCache.size > 500) weatherCache.delete(weatherCache.keys().next().value as string);
      res.set("Cache-Control", "private, max-age=600");
      res.json(body);
    } catch (err) {
      console.error("weather error:", err);
      res.status(503).json({ message: "Meteo non disponibile" });
    }
  });

  // GET /api/me/compass — Daily Compass della home: card da segnali reali
  // (meteo a casa, pattern, contraddizioni, memoria, capitoli mancanti).
  // Stabile per la giornata, si rimescola sugli eventi. Zero AI.
  app.get("/api/me/compass", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const lang = req.query.lang === "it" ? "it" : "en";
      const { computeCompass } = await import("../compass");
      res.json(await computeCompass(user.id, lang));
    } catch (err) {
      console.error("compass error:", err);
      res.status(500).json({ message: "Errore nel calcolo della bussola" });
    }
  });

  // POST /api/me/compass/answer — risposta a una card reflection (micro
  // conversazione da 20 secondi). Persistita come micro-segnale di profilo;
  // finché compass_signals non esiste in prod (db:push) risponde 503 onesto.
  app.post("/api/me/compass/answer", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    const { z } = await import("zod");
    const body = z.object({
      cardId: z.string().min(1).max(80),
      question: z.string().min(1).max(300),
      answer: z.string().min(1).max(300),
    }).safeParse(req.body);
    if (!body.success) return res.status(400).json({ message: "Risposta non valida" });
    try {
      const { db } = await import("../db");
      const { compassSignals } = await import("@shared/schema");
      await db.insert(compassSignals).values({ userId: user.id, ...body.data });
      res.json({ ok: true });
    } catch (err) {
      console.error("compass answer error:", err);
      res.status(503).json({ message: "Non riesco a salvarlo ora, riprova" });
    }
  });

  // GET /api/me/moment-reflection?id= — "AI Reflection" per una nota del
  // diario (stile Apple Journal). Lazy: chiamata solo quando l'utente espande
  // una nota. Haiku fact-locked + cache. null se non generabile (best-effort).
  app.get("/api/me/moment-reflection", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "id mancante" });
    try {
      const { momentReflection } = await import("../moment-reflection");
      const text = await momentReflection(user.id, id, langOf(req));
      res.set("Cache-Control", "private, max-age=3600");
      res.json({ reflection: text });
    } catch (err) {
      console.error("moment-reflection error:", err);
      res.json({ reflection: null });
    }
  });

  // GET /api/me/portrait-card.png — Share Card 9:16 (storie IG/TikTok) col
  // Ritratto + Paradosso. Driver di crescita organica (3B). Best-effort: 404 se
  // il ritratto non è ancora disponibile (nessun segnale). `bg` opzionale = hero
  // da sfumare sullo sfondo (passato dal client).
  app.get("/api/me/portrait-card.png", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const portrait = await buildPortrait(user.id, langOf(req));
      const text = portrait?.narrative?.portrait;
      if (!text) return res.status(404).json({ message: "Ritratto non ancora disponibile" });
      const bgRaw = typeof req.query.bg === "string" ? req.query.bg : "";
      const bg = /^https?:\/\//.test(bgRaw) ? bgRaw : null;
      const { renderPortraitSharePng } = await import("../og-card");
      const png = await renderPortraitSharePng({
        portrait: text,
        paradox: portrait.narrative?.paradox ?? null,
        name: (user.name ?? "").split(" ")[0] || "",
        bgImageUrl: bg,
      });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(png);
    } catch (err) {
      console.error("portrait-card error:", err);
      res.status(500).json({ message: "Errore nella generazione della card" });
    }
  });

  // GET /api/me/atlas — geolocated travel footprint for the account world map.
  // Resolves a coordinate per destination (recentDestinations cache → live
  // geocode), returns places[] + unlocated[] + stats. First load may be slower
  // while it geocodes misses; subsequent loads hit the warm cache.
  app.get("/api/me/atlas", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const atlas = await buildAtlas(user.id, langOf(req));
      res.json(atlas);
    } catch (err) {
      console.error("atlas error:", err);
      res.status(500).json({ message: "Errore nel recupero dell'atlante" });
    }
  });

  // GET /api/me/account-insights — Wrapped-style stats su tutto lo storico:
  // n destinazioni, giorni totali, € pianificati (solo trip v2), continente
  // top. Letture pure dagli itineraries — niente nuove tabelle.
  app.get("/api/me/account-insights", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const trips = await storage.getUserItineraries(user.id);
      const insights = computeAccountInsights(trips, langOf(req));
      res.json(insights);
    } catch (err) {
      console.error("account-insights error:", err);
      res.status(500).json({ message: "Errore nel recupero degli insights" });
    }
  });
  // Last destination shown on home/map widget
  app.get("/api/recent-destination", async (_req, res) => {
    try {
      const { db } = await import("../db");
      const { recentDestinations } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const rows = await db.select().from(recentDestinations).orderBy(desc(recentDestinations.createdAt)).limit(1);
      res.json(rows[0] ?? null);
    } catch (e) {
      res.json(null);
    }
  });

  app.get("/api/my-trips", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const trips = await storage.getUserItineraries(user.id);
      // Arricchimento: continent + continentLabel dedotti dal country/destination
      // così il client può filtrare senza replicare la mappa country→continent.
      const enriched = trips.map((t: any) => {
        const cont = continentOf(t);
        return {
          ...t,
          continent: cont,
          continentLabel: cont ? continentLabel(cont, langOf(req)) : null,
        };
      });
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Errore nel recupero dei viaggi" });
    }
  });

  // ── Saved moments (Ondata B — bookmark trasversale) ──────────────────────
  // GET → lista dei moments salvati dall'utente, ordinati per createdAt desc.
  // POST → idempotente: se già esiste (userId, itineraryId, momentId), no-op.
  // DELETE → unsave per (itineraryId, momentId).

  app.get("/api/me/saved-moments", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const rows = await storage.getSavedMoments(user.id);
      res.json(rows);
    } catch (err) {
      console.error("saved-moments GET error:", err);
      res.status(500).json({ message: "Errore nel recupero dei momenti salvati" });
    }
  });

  app.post("/api/me/saved-moments", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    const { itineraryId, momentId, momentSnapshot } = req.body ?? {};
    if (typeof itineraryId !== "number" || typeof momentId !== "string" || !momentId) {
      return res.status(400).json({ message: "itineraryId (number) e momentId (string) richiesti" });
    }
    try {
      // Idempotenza: se esiste già, ritorno la riga esistente senza errore.
      const existing = await storage.getSavedMoments(user.id);
      const dup = existing.find(s => s.itineraryId === itineraryId && s.momentId === momentId);
      if (dup) return res.json(dup);

      const created = await storage.createSavedMoment({
        userId: user.id,
        itineraryId,
        momentId,
        momentSnapshot: momentSnapshot ?? null,
      });
      res.json(created);
    } catch (err) {
      console.error("saved-moments POST error:", err);
      res.status(500).json({ message: "Errore nel salvataggio del momento" });
    }
  });

  app.delete("/api/me/saved-moments/:itineraryId/:momentId", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    const itineraryId = parseInt(req.params.itineraryId, 10);
    const momentId = req.params.momentId;
    if (!Number.isFinite(itineraryId) || !momentId) {
      return res.status(400).json({ message: "Parametri non validi" });
    }
    try {
      await storage.deleteSavedMoment(user.id, itineraryId, momentId);
      res.json({ ok: true });
    } catch (err) {
      console.error("saved-moments DELETE error:", err);
      res.status(500).json({ message: "Errore nella rimozione" });
    }
  });

  // Landing image set — 20 contextual photos, deduplicated, fetched fresh from
  // Unsplash with 1h server cache. Returns the curated fallback set if the
  // Unsplash key is missing or the API fails entirely (never 5xx).
  app.get("/api/landing-images", async (_req, res) => {
    try {
      const set = await getCachedLandingImageSet();
      // Public cache hint for CDN/browser — matches our server-side TTL.
      res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.json(set);
    } catch (err) {
      console.error("landing-images error:", err);
      // Even on unhandled error, never break the landing — caller has its own
      // fallback in the client, but we still try to respond with something.
      res.status(200).json(null);
    }
  });

  // Landing destinations feed — proof point strip. Mixes real recently-generated
  // destinations (last 7 days, deduped by name) with the curated brand-aligned
  // fallback so the strip is always 16-20 items and never feels empty. Real
  // items carry a relative timestamp; curated items don't. Response is shuffled
  // with a light front-bias on real items so they're the first thing scanned
  // without the order being identical every load.
  app.get("/api/destinations-feed", async (req, res) => {
    try {
      const { db } = await import("../db");
      const { recentDestinations } = await import("@shared/schema");
      const { desc, gte } = await import("drizzle-orm");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = await db
        .select()
        .from(recentDestinations)
        .where(gte(recentDestinations.createdAt, sevenDaysAgo))
        .orderBy(desc(recentDestinations.createdAt))
        .limit(80); // generous fetch; we dedupe + cap below

      // Dedupe by destinationName, keeping the newest occurrence (rows are
      // already desc by createdAt, so the first hit wins).
      const seen = new Set<string>();
      const realItems: DestinationsFeedItem[] = [];
      for (const r of rows) {
        const key = r.destinationName.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        realItems.push({
          name: r.destinationName,
          country: null, // recent_destinations doesn't store country name
          flag: r.flag,
          vibe: null, // no vibe persisted for real items — spec: omit, don't invent
          isRecent: true,
          relativeTime: relativeTime(new Date(r.createdAt), langOf(req)),
        });
        if (realItems.length >= 20) break;
      }

      // If real items are sparse, top up with curated until we have 16-20.
      // Otherwise use real-only (cap 20). Exclude curated names that overlap
      // with real entries so we don't show the same destination twice.
      let items: DestinationsFeedItem[];
      if (realItems.length >= 12) {
        items = realItems.slice(0, 20);
      } else {
        const realNames = new Set(realItems.map(r => r.name.trim().toLowerCase()));
        const curatedAvailable = CURATED_DESTINATIONS_FEED.filter(
          c => !realNames.has(c.name.trim().toLowerCase()),
        );
        const target = Math.min(18, realItems.length + curatedAvailable.length);
        const needed = target - realItems.length;
        items = [...realItems, ...curatedAvailable.slice(0, Math.max(0, needed))];
      }

      // Front-biased shuffle: real items get sort keys in [0, 0.65) with a
      // tiny secondary by recency order; curated items get [0.30, 1.30).
      // Sorting ascending puts real mostly first but still mixed.
      const scored = items.map((x, i) => {
        const k = x.isRecent
          ? Math.random() * 0.65 + i * 0.005
          : Math.random() * 1.0 + 0.30;
        return { x, k };
      });
      scored.sort((a, b) => a.k - b.k);
      const ordered = scored.map(s => s.x);

      // Short browser cache so we don't hammer the DB on landing reloads but
      // the strip still feels fresh within minutes of a generation.
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.json(ordered);
    } catch (err) {
      console.error("destinations-feed error:", err);
      // Never break the landing: hand the client the curated set so it can
      // render something instead of a black bar.
      res.status(200).json(CURATED_DESTINATIONS_FEED);
    }
  });

  // Numeri REALI per la landing (scelta esplicita: niente social proof
  // inventato — i contatori vengono dal DB e crescono da soli). destinationCount
  // = mete distinte effettivamente generate. Cache 5 min: i numeri cambiano
  // lentamente e la landing è la pagina più martellata.
  app.get("/api/stats", async (_req, res) => {
    try {
      const { db } = await import("../db");
      const { itineraries } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      const [itin, dest] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(itineraries),
        db.select({ count: sql<number>`count(distinct lower(trim(destination_name)))::int` }).from(itineraries),
      ]);
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
      res.json({
        itineraryCount: itin[0]?.count ?? 0,
        destinationCount: dest[0]?.count ?? 0,
      });
    } catch {
      res.json({ itineraryCount: 0, destinationCount: 0 });
    }
  });

  // Newsletter opt-in dalla landing. Doppio submit sulla stessa email = ok
  // idempotente (onConflictDoNothing). Finché newsletter_signups non esiste in
  // prod (serve `npm run db:push`) risponde 503 — il client mostra l'errore,
  // non finge di aver salvato.
  app.post("/api/newsletter", async (req, res) => {
    const { z } = await import("zod");
    const body = z.object({
      email: z.string().trim().toLowerCase().email().max(254),
      lang: z.enum(["en", "it"]).default("it"),
      source: z.enum(["landing", "footer"]).default("landing"),
    }).safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ message: "Email non valida" });
    }
    try {
      const { db } = await import("../db");
      const { newsletterSignups } = await import("@shared/schema");
      await db.insert(newsletterSignups)
        .values(body.data)
        .onConflictDoNothing({ target: newsletterSignups.email });
      res.json({ ok: true });
    } catch (err) {
      console.error("newsletter signup error:", err);
      res.status(503).json({ message: "Registrazione non disponibile, riprova più tardi" });
    }
  });
}
