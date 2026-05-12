import type { Express } from "express";
import { storage } from "../storage";

export function registerMiscRoutes(app: Express) {
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
