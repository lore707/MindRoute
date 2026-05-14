import type { Express } from "express";
import { storage } from "../storage";
import { emaAggregate, AXIS_NAMES, type TraitVector, MAPPING_VERSION } from "@shared/traits";
import { getTraitHeadline } from "../trait-headline";

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
      // Non-blocking-ish: awaited but errors → null, never fails the endpoint.
      let headline: string | null = null;
      if (validVectors.length >= 3) {
        headline = await getTraitHeadline(user.id, current, validVectors.length);
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
      res.json(trips);
    } catch (err) {
      res.status(500).json({ message: "Errore nel recupero dei viaggi" });
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
