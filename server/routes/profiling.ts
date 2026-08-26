import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { profilingLimiter } from "../rate-limiter";
import { generateDestinationsOnly } from "../matching-engine";
import { getRecentDestinationNames, getProposedNamesForUser, recordProposedForUser, weeklyExplorationSeed } from "../recent-destinations";
import { fetchUnsplashHero } from "../unsplash";
import { computeTraitVector, emaAggregate, synthesizeAnswersFromVector, MAPPING_VERSION, type TraitVector } from "@shared/traits";
import { getTraitPriorForUser, formatTraitPriorBlock } from "../trait-prior";
import { formatDestinationCoherenceBlock } from "../destination-traits";
import { getRecentCompassSignals, formatCompassSignalsBlock, getPortraitFeedbackSignals, formatPortraitFeedbackBlock } from "../compass";
import { buildPortraitPromptBlock } from "../portrait-signals";
import { computeProfileDefaults } from "../profile-defaults";
import { requireAuth } from "../auth";
import { formatTravelRulesBlock } from "@shared/travel-rules";

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
      // Micro-segnali del Daily Compass: rifiniscono il matching (mai sopra i
      // vincoli duri del quiz). Vuoto finché l'utente non risponde alle card.
      const signalsBlock = userIdForPrior
        ? formatCompassSignalsBlock(await getRecentCompassSignals(userIdForPrior))
        : "";
      const feedbackBlock = userIdForPrior
        ? formatPortraitFeedbackBlock(await getPortraitFeedbackSignals(userIdForPrior))
        : "";
      const fast = input.fastProfile;
      const rulesBlock = formatTravelRulesBlock({
        vector: userVec,
        pace: fast?.pace ?? input.pace,
        avoid: fast?.avoid ?? input.avoid,
        seek: fast ? [...fast.intentions, ...fast.interests] : input.answers,
      });
      const priorBlock = (prior ? formatTraitPriorBlock(prior) : "") + formatDestinationCoherenceBlock(userVec) + rulesBlock + signalsBlock + feedbackBlock;
      const recentNames = await getRecentDestinationNames();
      const userSeenNames = await getProposedNamesForUser(userIdForPrior);
      const seed = weeklyExplorationSeed(userIdForPrior);
      const destinations = await generateDestinationsOnly(input, priorBlock, undefined, recentNames, userSeenNames, seed);
      // Registra il trio come "già mostrato a questo utente" (fire-and-forget):
      // la prossima generazione lo eviterà. Non attendiamo la scrittura.
      void recordProposedForUser(userIdForPrior, destinations.map(d => d.name));
      await storage.clearAll();
      // Fetch the 3 hero images in parallel (was sequential ≈ 3× the latency).
      const heroImages = await Promise.all(destinations.map((d) => fetchUnsplashHero(d.name)));
      const createdDests = [];
      for (let i = 0; i < destinations.length; i++) {
        // neutralDescriptor è emesso dal matcher ma NON è una colonna della
        // I metadati editoriali non vivono nella tabella destinations: li
        // togliamo prima dell'insert e li riattacchiamo alla response. Il client
        // usa il contesto per la scelta e rimanda il descrittore al recorder.
        const { neutralDescriptor, destinationContext, ...destForDb } = destinations[i] as any;
        const created = await storage.createDestination({
          ...destForDb,
          imageUrl: heroImages[i]?.url ?? destinations[i].imageUrl,
        });
        createdDests.push({ ...created, neutralDescriptor: neutralDescriptor ?? null, destinationContext: destinationContext ?? null });
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
              quizVersion: input.quizVersion ?? null,
              fastProfile: input.fastProfile ?? null,
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
    // I pezzi del Ritratto che l'utente ha lasciato ACCESI nel pannello dei
    // vincoli (id da `portraitChipId`). Assente = tutto il ritratto.
    // Spegnere un chip lo toglie DAVVERO dal prompt: è il punto del pannello.
    keepInsights: z.array(z.string().max(60)).max(40).optional(),
    // Destinazione già scelta dall'utente (ha toccato una proposta, non ha
    // chiesto "dove vado?"). Quando c'è, il matcher non cerca: declina QUESTO
    // posto in 3 personalità di viaggio.
    destination: z.string().max(120).optional(),
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

  const generateFromProfile = async (req: any, res: any) => {
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
      const { contextOverride, keepInsights, destination: pinned, ...microInputs } = micro;
      const input = {
        ...microInputs,
        answers: synthesized,
      };

      const prior = await getTraitPriorForUser(user.id);
      // 2A — coerenza col catalogo dal vettore aggregato (current).
      // + micro-segnali del Daily Compass ("Genera dal profilo" è proprio il
      // flusso dove pesano di più: non c'è un quiz fresco a raccontare l'oggi).
      const signalsBlock = formatCompassSignalsBlock(await getRecentCompassSignals(user.id));
      const feedbackBlock = formatPortraitFeedbackBlock(await getPortraitFeedbackSignals(user.id));
      // IL RITRATTO ENTRA NELLA GENERAZIONE.
      // Finora il generatore riceveva i cinque numeri del vettore; l'utente
      // aveva appena letto sul proprio profilo "torni sempre in Europa" e
      // "non viaggi mai d'inverno", e quelle frasi non arrivavano mai qui.
      // Ora la stessa analisi che ha letto diventa parte del prompt, quindi
      // la proposta puo' essere la RISPOSTA a quello che gli abbiamo detto.
      // …e l'utente può togliergliene pezzi dal pannello dei vincoli: quello
      // che spegne non arriva qui. Il pannello mostra le stesse righe.
      const portraitBlock = await buildPortraitPromptBlock(user.id, micro.lang === "en" ? "en" : "it", keepInsights ?? null);
      const rulesBlock = formatTravelRulesBlock({ vector: current });
      const priorBlock = (prior ? formatTraitPriorBlock(prior) : "") + formatDestinationCoherenceBlock(current) + rulesBlock + signalsBlock + feedbackBlock + portraitBlock;
      const recentNames = await getRecentDestinationNames();
      const userSeenNames = await getProposedNamesForUser(user.id);
      const seed = weeklyExplorationSeed(user.id);
      // Destinazione bloccata: niente "già viste da te" e niente freschezza —
      // sarebbero istruzioni a NON proporre il posto che ha appena scelto.
      const destinations = pinned
        ? await generateDestinationsOnly(input, priorBlock, contextOverride, [], [], seed, pinned)
        : await generateDestinationsOnly(input, priorBlock, contextOverride, recentNames, userSeenNames, seed);
      void recordProposedForUser(user.id, destinations.map(d => d.name));
      await storage.clearAll();
      // Fetch the 3 hero images in parallel (was sequential ≈ 3× the latency).
      const heroImages = await Promise.all(destinations.map((d) => fetchUnsplashHero(d.name)));
      const createdDests = [];
      for (let i = 0; i < destinations.length; i++) {
        // neutralDescriptor è emesso dal matcher ma NON è una colonna della
        // I metadati editoriali non vivono nella tabella destinations: li
        // togliamo prima dell'insert e li riattacchiamo alla response. Il client
        // usa il contesto per la scelta e rimanda il descrittore al recorder.
        const { neutralDescriptor, destinationContext, ...destForDb } = destinations[i] as any;
        const created = await storage.createDestination({
          ...destForDb,
          imageUrl: heroImages[i]?.url ?? destinations[i].imageUrl,
        });
        createdDests.push({ ...created, neutralDescriptor: neutralDescriptor ?? null, destinationContext: destinationContext ?? null });
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
  };

  // Due porte, una macchina sola.
  //   from-profile     → "dove vado?"  il matcher cerca.
  //   for-destination  → "portami QUI" il matcher non cerca: declina il posto
  //                      che l'utente ha toccato in 3 personalità di viaggio
  //                      (stessa regola della città precisa nel quiz).
  // Passano entrambe dal pannello dei vincoli, quindi condividono schema,
  // filtro del ritratto e note libere: una sola strada da mantenere onesta.
  app.post("/api/profiling/from-profile", profilingLimiter, generateFromProfile);
  app.post("/api/profiling/for-destination", profilingLimiter, generateFromProfile);

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
