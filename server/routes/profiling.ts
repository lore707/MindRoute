import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { profilingLimiter } from "../rate-limiter";
import { generateDestinationsOnly } from "../matching-engine";
import { fetchUnsplashHero } from "../unsplash";
import { computeTraitVector, MAPPING_VERSION } from "@shared/traits";

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

      // Trait snapshot — only if user is logged in. Anonymous quizzes can't
      // build a history (no userId), so we just skip silently.
      const userId = (req.user as any)?.id;
      if (userId) {
        try {
          const traits = computeTraitVector({
            answers: input.answers ?? [],
            companions: input.companions ?? null,
            budget: input.budget ?? null,
            travelStyle: input.travelStyle ?? null,
            constraints: input.constraints ?? null,
          });
          await storage.createTraitSnapshot({
            userId,
            traits,
            source: "quiz",
            mappingVersion: MAPPING_VERSION,
          });
        } catch (e) {
          // Trait snapshot is non-critical — never fail the quiz submit.
          console.warn("[traits] quiz snapshot failed:", e);
        }
      }

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
