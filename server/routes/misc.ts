import type { Express } from "express";
import { storage } from "../storage";
import { emaAggregate, AXIS_NAMES, type TraitVector, MAPPING_VERSION } from "@shared/traits";
import { getTraitHeadline } from "../trait-headline";
import { computeAccountInsights, continentOf, CONTINENT_LABEL_IT } from "../account-insights";
import { getCachedLandingImageSet } from "../landing-images";

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
