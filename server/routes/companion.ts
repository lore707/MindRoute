// ─────────────────────────────────────────────────────────────────────────
// Travel companion chat endpoints (Fase 1).
//   GET  /api/itinerary/:id/chat   → hydrate existing thread (messages)
//   POST /api/itinerary/:id/chat   → SSE stream a reply; persists both turns
//   GET  /api/companion/threads    → list the user's conversations (storico)
// ─────────────────────────────────────────────────────────────────────────

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { buildCompanionSystem, runCompanionAgent, itineraryCoords, tripPhaseInfo, type ChatTurn, type CompanionToolContext } from "../companion";
import { computeCoverage } from "@shared/profile-coverage";

// Contesto leggero per i chip d'ingresso fase-aware del CompanionDock: la fase
// del viaggio (perfeziona-prima vs consulente-durante) + i segnali L1/L2 che
// rendono i suggerimenti su misura.
function companionContext(itin: any) {
  const p = itin?.profilingInput ?? {};
  const { phase, dayNo, totalDays, daysToDeparture } = tripPhaseInfo(itin);
  let l2OpenCount = 0;
  let l2NextLabel: { it: string; en: string } | null = null;
  try {
    const cov = computeCoverage(p);
    l2OpenCount = cov.open.length;
    if (cov.open[0]) l2NextLabel = { it: cov.open[0].label_it, en: cov.open[0].label_en };
  } catch { /* best-effort */ }
  return {
    phase, dayNo, totalDays, daysToDeparture,
    destination: itin?.destinationName ?? null,
    budgetTotalPerPerson: typeof p?.budgetTotalPerPerson === "number" ? p.budgetTotalPerPerson : null,
    l2OpenCount, l2NextLabel,
  };
}

// Same ownership rule as itinerary-detail: owner-only, legacy null-owner rows
// stay open so historic trips keep working.
function ownsItinerary(itin: any, req: any): boolean {
  const uid = (req.user as any)?.id;
  return itin.userId == null || itin.userId === uid;
}

// Keep the prompt bounded: only the last N turns ride along as history; the
// itinerary + profile (the expensive part) live in the cached system block.
const HISTORY_LIMIT = 20;

export function registerCompanionRoutes(app: Express) {
  // Hydrate: messages for this itinerary's thread (empty array if none yet).
  app.get("/api/itinerary/:id/chat", requireAuth, async (req, res) => {
    try {
      const itinId = z.coerce.number().parse(req.params.id);
      const userId = (req.user as any)?.id as number;
      const itin = await storage.getItineraryById(itinId);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });

      const context = companionContext(itin);
      const conv = await storage.getConversationForItinerary(userId, itinId);
      if (!conv) return res.json({ conversationId: null, messages: [], context });
      const messages = await storage.getMessages(conv.id);
      res.json({
        conversationId: conv.id,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        context,
      });
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // Stream a reply (SSE). Body: { message, lang }.
  app.post("/api/itinerary/:id/chat", requireAuth, async (req, res) => {
    const parsedId = z.coerce.number().safeParse(req.params.id);
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const lang: "en" | "it" = req.body?.lang === "it" ? "it" : "en";
    const proactive = req.body?.proactive === true;
    // Optional live position from the browser, for the find_nearby tool.
    const rawCoords = req.body?.coords;
    const coords =
      rawCoords && Number.isFinite(rawCoords.lat) && Number.isFinite(rawCoords.lng)
        ? { lat: Number(rawCoords.lat), lng: Number(rawCoords.lng) }
        : null;
    if (!parsedId.success || !message) {
      return res.status(400).json({ message: "message richiesto" });
    }
    const itinId = parsedId.data;
    const userId = (req.user as any)?.id as number;

    const itin = await storage.getItineraryById(itinId);
    if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
    if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Resolve (or create) the per-itinerary conversation.
      let conv = await storage.getConversationForItinerary(userId, itinId);
      if (!conv) {
        conv = await storage.createConversation({
          userId,
          itineraryId: itinId,
          title: (itin as any).destinationName ?? null,
        });
      }
      const conversationId = conv.id;

      const priorMessages = await storage.getMessages(conversationId);
      const history: ChatTurn[] = priorMessages
        .slice(-HISTORY_LIMIT)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const userName = (req.user as any)?.name ?? null;
      // Memoria dell'ecosistema: tutti i viaggi dell'utente (best-effort) così il
      // companion può fare lo "specchio" e proposte che solo la sua memoria consente.
      const trips = userId ? await storage.getUserItineraries(userId).catch(() => []) : [];
      const system = await buildCompanionSystem({ itinerary: itin, userId, userName, lang, coords, proactive, trips });

      // Persist the user turn before streaming so it isn't lost on disconnect.
      await storage.addMessage({ conversationId, role: "user", content: message });
      send("start", { conversationId });

      const ctx: CompanionToolContext = {
        itinerary: itin,
        userId,
        coords,
        tripCoords: itineraryCoords(itin),
        lang,
        saveMoment: (row) => storage.createSavedMoment(row).then(() => undefined),
        alreadySaved: async (uid, itinId2, momentId) => {
          const saved = await storage.getSavedMoments(uid);
          return saved.some((s) => s.itineraryId === itinId2 && s.momentId === momentId);
        },
        saveDays: (days) => storage.updateItineraryMapPoints(itinId, days),
        saveTrip: (days, tripMeta) => storage.updateItineraryTrip(itinId, days, tripMeta),
      };

      const full = await runCompanionAgent({
        system,
        history,
        message,
        ctx,
        onChunk: (text) => send("chunk", { text }),
        onTool: (ev) => send("tool", ev),
      });

      await storage.addMessage({ conversationId, role: "assistant", content: full });
      await storage.touchConversation(conversationId);

      send("done", { conversationId });
      res.end();
    } catch (err) {
      console.error("[companion] stream error:", err);
      try { send("error", { message: "Errore del compagno di viaggio." }); } catch {}
      res.end();
    }
  });

  // Storico: the user's conversations, most recent first.
  app.get("/api/companion/threads", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id as number;
      const threads = await storage.getConversationsForUser(userId);
      res.json(threads.map((c) => ({
        id: c.id,
        itineraryId: c.itineraryId,
        title: c.title,
        lastMessageAt: c.lastMessageAt,
      })));
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });
}
