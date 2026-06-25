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
import { formatDestinationCoherenceBlock } from "../destination-traits";
import { computeProfileDefaults } from "../profile-defaults";
import { requireAuth } from "../auth";

export function registerProfilingRoutes(app: Express) {
  // STEP 1 — Genera 3 destinazioni leggere dal profiling.
  // Richiede login: il quiz non è disponibile agli anonimi.
  app.post(api.profiling.submit.path, requireAuth, profilingLimiter, async (req, res) => {
    try {
      const input = api.profiling.submit.input.parse(req.body);
      const userIdForPrior = (req.user as any)?.id ?? null;
      const prior = await getTraitPriorForUser(userIdForPrior);
      // 2A — vettore dell'utente da QUESTO quiz (deterministico, sempre
      // disponibile anche al primo viaggio) → shortlist di coerenza col catalogo.
      const userVec = computeTraitVector({
        answers: input.answers ?? [],
        companions: input.companions ?? null,
        budget: input.budget ?? null,
        travelStyle: input.travelStyle ?? null,
        constraints: input.constraints ?? null,
      });
      const priorBlock = (prior ? formatTraitPriorBlock(prior) : "") + formatDestinationCoherenceBlock(userVec);
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
            // Persist the verbatim quiz selections so the account Ritratto can
            // quote what the user literally chose (seek/avoid + own words).
            rawSignal: {
              answers: input.answers ?? [],
              companions: input.companions ?? null,
              budget: input.budget ?? null,
              travelStyle: input.travelStyle ?? null,
              constraints: input.constraints ?? null,
            },
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

  // STEP 1-fast — Onboarding L1, ramo "Ho già una meta".
  // Salta del tutto il matcher (la città scelta NON è nel catalogo dei 16):
  // crea una singola destinazione per la città digitata, salva il profilo L1 e
  // restituisce l'id pronto per /api/itinerary/generate-v2. Niente schermata
  // /destinations: l'utente va dritto al primo itinerario.
  const directSchema = z.object({
    city: z.string().min(1).max(120),
    // Profilo L1 completo costruito client-side (answers/days/budget/_l1/lang…).
    // Passa as-is alla generazione e viene persistito sull'itinerario: la
    // coverage e il refine L2 leggono da lì.
    profile: z.record(z.any()),
  });

  app.post("/api/profiling/direct", requireAuth, profilingLimiter, async (req, res) => {
    try {
      const { city, profile } = directSchema.parse(req.body);
      await storage.clearAll();
      const hero = await fetchUnsplashHero(city);
      const dest = await storage.createDestination({
        name: city,
        whyYours: "",
        experiencePreview: "",
        practicalInfo: "",
        imageUrl: hero?.url ?? null,
        slotRole: "direct",
        tagline: null,
      });
      await storage.saveProfilingInput(profile);
      res.json({ destinationId: dest.id, destinationName: dest.name });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Error in /api/profiling/direct:", err);
      return res.status(500).json({ message: "Errore nella preparazione della meta. Riprova." });
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
      // 2A — coerenza col catalogo dal vettore aggregato (current).
      const priorBlock = (prior ? formatTraitPriorBlock(prior) : "") + formatDestinationCoherenceBlock(current);
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
      // compatibilità ma il signal è chiaramente l'aggregato. rawSignal resta
      // null di proposito: le answers qui sono chip sintetiche (canonical keys),
      // non le parole reali dell'utente, quindi NON vanno mostrate verbatim nel
      // Ritratto. Il composer legge seek/avoid solo da snapshot "quiz" con
      // rawSignal valorizzato → questo viene correttamente ignorato.
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

      // Return the input too: the client must seed sessionStorage with BOTH the
      // fresh destinations and the synthesized input, exactly like the quiz flow
      // does. Without this the Destinations page reads stale/empty sessionStorage
      // (from a previous quiz) and generation fails or uses the wrong destination.
      res.json({ destinations: createdDests, input });
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
