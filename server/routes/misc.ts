import type { Express } from "express";
import { storage } from "../storage";
import { emaAggregate, AXIS_NAMES, type TraitVector, MAPPING_VERSION } from "@shared/traits";
import { getTraitHeadline } from "../trait-headline";
import { computeAccountInsights, continentOf, CONTINENT_LABEL_IT } from "../account-insights";
import { getCachedLandingImageSet } from "../landing-images";
import { CURATED_DESTINATIONS_FEED, type DestinationsFeedItem } from "@shared/destinations-feed";

// Italian relative time for the landing strip. The product is IT-first and the
// strings rendered here are short tokens ("2 ore fa", "ieri") so we localise on
// the server rather than shipping a date library to the client.
function relativeTimeIT(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "ora";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "ora";
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr === 1 ? "1 ora fa" : `${diffHr} ore fa`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "ieri";
  return `${diffDay} giorni fa`;
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
        const { patterns } = computeAccountInsights(trips);
        headline = await getTraitHeadline(user.id, current, validVectors.length, patterns);
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

  // GET /api/me/account-insights — Wrapped-style stats su tutto lo storico:
  // n destinazioni, giorni totali, € pianificati (solo trip v2), continente
  // top. Letture pure dagli itineraries — niente nuove tabelle.
  app.get("/api/me/account-insights", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Non autenticato" });
    try {
      const trips = await storage.getUserItineraries(user.id);
      const insights = computeAccountInsights(trips);
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
          continentLabel: cont ? CONTINENT_LABEL_IT[cont] : null,
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
  app.get("/api/destinations-feed", async (_req, res) => {
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
          relativeTime: relativeTimeIT(new Date(r.createdAt)),
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

  app.get("/api/stats", async (_req, res) => {
    try {
      const { db } = await import("../db");
      const { itineraries } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      const result = await db.select({ count: sql<number>`count(*)::int` }).from(itineraries);
      res.json({ itineraryCount: result[0]?.count ?? 0 });
    } catch {
      res.json({ itineraryCount: 0 });
    }
  });
}
