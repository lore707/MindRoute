import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { profilingLimiter } from "../rate-limiter";
import { generateDestinationsOnly } from "../matching-engine";
import { getRecentDestinationNames } from "../recent-destinations";
import { fetchUnsplashHero } from "../unsplash";
import { computeTraitVector, emaAggregate, synthesizeAnswersFromVector, MAPPING_VERSION, type TraitVector } from "@shared/traits";
import { getTraitPriorForUser, formatTraitPriorBlock } from "../trait-prior";
import { computeProfileDefaults } from "../profile-defaults";

export function registerProfilingRoutes(app: Express) {
  // STEP 1 — Genera 3 destinazioni leggere dal profiling
  app.post(api.profiling.submit.path, profilingLimiter, async (req, res) => {
    try {
      const input = api.profiling.submit.input.parse(req.body);
      const userIdForPrior = (req.user as any)?.id ?? null;
      const prior = await getTraitPriorForUser(userIdForPrior);
      const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
      const recentNames = await getRecentDestinationNames();
      const destinations = await generateDestinationsOnly(input, priorBlock, undefined, recentNames);
      await storage.clearAll();
      // Fetch the 3 hero images in parallel (was sequential ≈ 3× the latency).
      const heroImages = await Promise.all(destinations.map((d) => fetchUnsplashHero(d.name)));
      const createdDests = [];
      for (let i = 0; i < destinations.length; i++) {
        const created = await storage.createDestination({
          ...destinations[i],
          imageUrl: heroImages[i]?.url ?? destinations[i].imageUrl,
        });
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

  // STEP 1bis — "Genera dal profilo" (Ondata C punto 3).
  // Bypass del quiz per utenti che hanno già un trait history significativo:
  // 3 micro-input contestuali (compagnia, durata, partenza) + il vector
  // aggregato sintetizzato in chip → matching engine. Salva uno snapshot
  // "pick" implicito così l'evoluzione del profilo continua.
  const fromProfileSchema = z.object({
    days: z.number().int().min(2).max(21),
    leaveDate: z.string(),
    departure: z.string(),
    budget: z.string(),
    companions: z.string().optional(),
    constraints: z.string().optional(),
    travelStyle: z.string().optional(),
    lang: z.string().optional(),
    // Override testuale libero ("stavolta con amici", "no Europa",
    // "weekend lungo"). Passato verbatim al matching engine come sezione
    // ad alta priorità che sovrascrive i pattern storici in conflitto.
    contextOverride: z.string().max(300).optional(),
  });

  // Defaults pre-compilati per il modal "Genera dal profilo".
  // Richiede login: senza userId non possiamo calcolare la mediana dei past
  // trips e il client non avrebbe pattern personali da mostrare.
  app.get("/api/profiling/defaults", async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Login richiesto" });
    try {
      const defaults = await computeProfileDefaults(user.id);
      res.json(defaults);
    } catch (err) {
      console.error("Error computing profile defaults:", err);
      return res.status(500).json({ message: "Errore nel calcolo dei default" });
    }
  });

  app.post("/api/profiling/from-profile", profilingLimiter, async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Devi essere loggato per usare 'Genera dal profilo'" });
    try {
      const micro = fromProfileSchema.parse(req.body);

      // Aggrega tutti gli snapshot validi → vector corrente.
      const snapshots = await storage.getTraitSnapshots(user.id);
      const validVectors = snapshots
        .filter(s => s.mappingVersion === MAPPING_VERSION)
        .map(s => s.traits as TraitVector);
      if (validVectors.length < 2) {
        return res.status(400).json({
          message: "Servono almeno 2 viaggi precedenti per generare dal profilo. Fai il quiz.",
        });
      }
      const current = emaAggregate(validVectors);
      const synthesized = synthesizeAnswersFromVector(current);

      // Costruisco un ProfilingRequest valido riempiendo answers[] dalla sintesi.
      // contextOverride esce dal request body — lo separiamo perché non fa
      // parte di ProfilingRequest, va passato come parametro al matching.
      const { contextOverride, ...microInputs } = micro;
      const input = {
        ...microInputs,
        answers: synthesized,
      };

      const prior = await getTraitPriorForUser(user.id);
      const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
      const recentNames = await getRecentDestinationNames();
      const destinations = await generateDestinationsOnly(input, priorBlock, contextOverride, recentNames);
      await storage.clearAll();
      // Fetch the 3 hero images in parallel (was sequential ≈ 3× the latency).
      const heroImages = await Promise.all(destinations.map((d) => fetchUnsplashHero(d.name)));
      const createdDests = [];
      for (let i = 0; i < destinations.length; i++) {
        const created = await storage.createDestination({
          ...destinations[i],
          imageUrl: heroImages[i]?.url ?? destinations[i].imageUrl,
        });
        createdDests.push(created);
      }
      await storage.saveProfilingInput(input);

      // Snapshot derivato dal vector (non dal quiz) — flag come "quiz" per
      // compatibilità ma il signal è chiaramente l'aggregato.
      try {
        await storage.createTraitSnapshot({
          userId: user.id,
          traits: current,
          source: "quiz",
          mappingVersion: MAPPING_VERSION,
        });
      } catch (e) {
        console.warn("[traits] from-profile snapshot failed:", e);
      }

      res.json(createdDests);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error generating from profile:", err);
      return res.status(500).json({ message: "Errore nella generazione dal profilo." });
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
