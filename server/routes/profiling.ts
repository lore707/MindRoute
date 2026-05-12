import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { profilingLimiter } from "../rate-limiter";
import { generateDestinationsOnly } from "../matching-engine";
import { fetchUnsplashHero } from "../unsplash";

export function registerProfilingRoutes(app: Express) {
  // STEP 1 — Genera 3 destinazioni leggere dal profiling
  app.post(api.profiling.submit.path, profilingLimiter, async (req, res) => {
    try {
      const input = api.profiling.submit.input.parse(req.body);
      const destinations = await generateDestinationsOnly(input);
      await storage.clearAll();
      const createdDests = [];
      for (const dest of destinations) {
        const realImage = await fetchUnsplashHero(dest.name);
        const destWithImage = {
          ...dest,
          imageUrl: realImage?.url ?? dest.imageUrl,
        };
        const created = await storage.createDestination(destWithImage);
        createdDests.push(created);
      }
      await storage.saveProfilingInput(input);
      res.json(createdDests);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error generating destinations:", err);
      return res.status(500).json({ message: "Errore nella generazione delle destinazioni. Riprova." });
    }
  });

  // STEP 2 — Recupera input profilazione salvato
  app.get("/api/profiling/input", async (_req, res) => {
    try {
      const input = await storage.getProfilingInput();
      if (!input) return res.status(404).json({ message: "No profiling input found" });
      res.json(input);
    } catch (err) {
      res.status(500).json({ message: "Errore nel recupero dell'input" });
    }
  });
}
