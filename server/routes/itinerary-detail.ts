import type { Express } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { requireAuth } from "../auth";
import { itineraryLimiter } from "../rate-limiter";
import { computeCoverage } from "@shared/profile-coverage";
import { generateItineraryV2ForDestination } from "../matching-engine-v2";
import { enrichItineraryV2, buildTripMetaV2 } from "./itinerary-gen-v2";
import { getTraitPriorForUser, formatTraitPriorBlock } from "../trait-prior";

// Ricostruisce la stringa `constraints` dai raffinamenti L2 nel formato che il
// prompt v2 già sa leggere (accommodation/food/pace/avoid). Così rispondere a
// una domanda L2 cambia DAVVERO l'itinerario rigenerato, non solo la coverage.
function buildConstraintsFromProfile(p: any): string {
  const parts: string[] = [];
  if (typeof p.accommodation === "string" && p.accommodation.trim()) parts.push(`accommodation: ${p.accommodation.trim()}`);
  if (typeof p.food === "string" && p.food.trim()) parts.push(`food: ${p.food.trim()}`);
  if (typeof p.pace === "string" && p.pace.trim()) parts.push(`pace: ${p.pace.trim()}`);
  if (Array.isArray(p.avoid) && p.avoid.length) parts.push(`avoid: ${p.avoid.join(", ")}`);
  if (typeof p._notes === "string" && p._notes.trim()) parts.push(p._notes.trim());
  return parts.join(" | ");
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Ownership gate: un itinerario appartiene a un utente (itin.userId). Solo il
// proprietario può leggerlo/modificarlo via gli endpoint by-id. Le righe legacy
// senza userId (pre-auth) restano accessibili per non rompere viaggi storici;
// la condivisione pubblica passa SOLO da /api/share/:token (read-only, no PII).
function ownsItinerary(itin: any, req: any): boolean {
  const uid = (req.user as any)?.id;
  return itin.userId == null || itin.userId === uid;
}

export function registerItineraryDetailRoutes(app: Express) {
  // Aggiorna mapPoints
  app.patch("/api/itinerary/:id/mappoints", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const { mapPoints } = req.body;
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Not found" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      await storage.updateItineraryMapPoints(id, mapPoints);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Errore aggiornamento mappa" });
    }
  });

  // ── Saved places (mappa itinerario) ───────────────────────────────────
  // Posti cercati/salvati dall'utente sulla mappa di QUESTO itinerario.
  // Scoped per (utente, itinerario): GET lista, POST aggiunge, DELETE rimuove.
  app.get("/api/itinerary/:id/saved-places", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });
      const rows = await storage.getSavedPlaces(userId, id);
      res.json(rows);
    } catch (err) {
      console.error("saved-places GET error:", err);
      res.status(500).json({ message: "Errore nel recupero dei posti salvati" });
    }
  });

  const savedPlaceInput = z.object({
    label: z.string().min(1).max(200),
    lat: z.number(),
    lng: z.number(),
    category: z.enum(["lodging", "experience", "food", "sight", "beach", "custom"]).optional(),
    address: z.string().max(400).optional(),
    note: z.string().max(600).optional(),
  });

  app.post("/api/itinerary/:id/saved-places", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Not found" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      const body = savedPlaceInput.parse(req.body);
      // Idempotenza: stesso punto (stesse coord ~4 decimali) già salvato → no-op.
      const existing = await storage.getSavedPlaces(userId, id);
      const dup = existing.find(s =>
        Math.abs(s.lat - body.lat) < 1e-4 && Math.abs(s.lng - body.lng) < 1e-4);
      if (dup) return res.json(dup);
      const created = await storage.createSavedPlace({
        userId, itineraryId: id,
        label: body.label, lat: body.lat, lng: body.lng,
        category: body.category ?? "custom",
        address: body.address ?? null,
        note: body.note ?? null,
      });
      res.json(created);
    } catch (err) {
      console.error("saved-places POST error:", err);
      res.status(400).json({ message: "Dati posto non validi" });
    }
  });

  app.delete("/api/itinerary/:id/saved-places/:placeId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Non autenticato" });
      const placeId = z.coerce.number().parse(req.params.placeId);
      await storage.deleteSavedPlace(userId, placeId);
      res.json({ ok: true });
    } catch (err) {
      console.error("saved-places DELETE error:", err);
      res.status(500).json({ message: "Errore nella rimozione" });
    }
  });

  // Polling mapPoints — used by the client to know when the background
  // enrichment is done so it can re-render the map.
  app.get("/api/itinerary/:id/mappoints", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itinerary = await storage.getItineraryById(id);
      if (!itinerary) return res.status(404).json({ message: "Not found" });
      if (!ownsItinerary(itinerary, req)) return res.status(403).json({ message: "Non autorizzato" });
      const hasPoints = itinerary.days?.some((d: any) => d.mapPoints?.length > 0);
      res.json({ ready: hasPoints, days: hasPoints ? itinerary.days : null });
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // Recupera itinerario per id diretto o per destinationId (fallback)
  app.get(api.itinerary.get.path, requireAuth, async (req, res) => {
    try {
      const destId = z.coerce.number().parse(req.params.destinationId);
      let itinerary = await storage.getItineraryById(destId);
      if (!itinerary) {
        itinerary = await storage.getItinerary(destId);
      }
      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
      if (!ownsItinerary(itinerary, req)) return res.status(403).json({ message: "Non autorizzato" });
      // Preferisci il profiling persistito sull'itinerario; fallback al globale
      // solo per le righe legacy che non l'hanno (pre-feature).
      const profilingInput = (itinerary as any).profilingInput ?? await storage.getProfilingInput();
      res.json({ ...itinerary, profilingInput: profilingInput ?? null });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid destination ID' });
      }
      throw err;
    }
  });

  // Rigenera un singolo giorno con feedback utente
  app.post("/api/itinerary/:id/regenerate-day", requireAuth, itineraryLimiter, async (req, res) => {
    try {
      const itinId = z.coerce.number().parse(req.params.id);
      const { dayIndex, feedback } = req.body;
      const itin = await storage.getItineraryById(itinId);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      // v2 itineraries use the moment-based shape; the v1 day-regen prompt
      // would corrupt the days[] structure. Reject explicitly until v2 has
      // its own regen path.
      if ((itin as any).schemaVersion === 2) {
        return res.status(400).json({ message: "Regenerate-day not yet supported for v2 itineraries" });
      }
      const profilingInput = (itin as any).profilingInput ?? await storage.getProfilingInput();
      const dayToRegen = (itin as any).days?.[dayIndex];
      if (!dayToRegen) return res.status(400).json({ message: "Giorno non trovato" });
      const { generateDayRegeneration } = await import("../matching-engine");
      const newDay = await generateDayRegeneration(
        profilingInput,
        (itin as any).destinationName,
        dayToRegen,
        dayIndex,
        feedback || ""
      );
      const updatedDays = [...(itin as any).days];
      updatedDays[dayIndex] = { ...dayToRegen, ...newDay };
      await storage.updateItineraryMapPoints(itinId, updatedDays);
      res.json({ day: updatedDays[dayIndex] });
    } catch (err) {
      console.error("Errore rigenerazione giorno:", err);
      res.status(500).json({ message: "Errore durante la rigenerazione" });
    }
  });

  // ── L2 — Raffinamento progressivo con rigenerazione ──────────────────────
  // L'utente, DOPO aver visto il primo itinerario, risponde a una domanda più
  // profonda (ritmo/compagnia/dove dormi/come mangi/come ti muovi/cosa eviti/
  // partenza). Il patch viene fuso nel profilo persistito, l'itinerario v2 viene
  // RIGENERATO per intero sulla stessa meta (più specifico) e la riga aggiornata
  // in place: id/URL stabili. Risponde con la nuova coverage ("ti somiglia al X%").
  const refineSchema = z.object({
    companions: z.string().max(200).optional(),
    accommodation: z.string().max(200).optional(),
    food: z.string().max(200).optional(),
    travelStyle: z.string().max(200).optional(),
    pace: z.string().max(200).optional(),
    departure: z.string().max(200).optional(),
    avoid: z.array(z.string().max(80)).max(20).optional(),
  });

  app.post("/api/itinerary/:id/refine", requireAuth, itineraryLimiter, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      if ((itin as any).schemaVersion !== 2) {
        return res.status(400).json({ message: "Il raffinamento è disponibile solo sugli itinerari più recenti." });
      }
      const patch = refineSchema.parse(req.body);

      // 1) Fondi il patch nel profilo persistito (accumula tra più refine).
      const prev = ((itin as any).profilingInput ?? {}) as Record<string, any>;
      const merged: Record<string, any> = { ...prev };
      for (const k of ["companions", "accommodation", "food", "travelStyle", "pace", "departure"] as const) {
        const v = patch[k];
        if (typeof v === "string" && v.trim()) merged[k] = v.trim();
      }
      if (patch.avoid) merged.avoid = patch.avoid;
      merged.constraints = buildConstraintsFromProfile(merged);
      merged.refinedAt = new Date().toISOString();

      // 2) Rigenera l'intero itinerario v2 sulla stessa destinazione.
      const destinationName = (itin as any).destinationName as string;
      const userId = (req.user as any)?.id ?? null;
      const prior = await getTraitPriorForUser(userId);
      const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
      const rough = await generateItineraryV2ForDestination(merged as any, destinationName, priorBlock);
      const enriched = await enrichItineraryV2(rough, destinationName, merged);

      // 3) Riscrivi la riga in place (stesso id/URL).
      await storage.updateItineraryRefine(id, {
        days: enriched.days,
        tripMeta: buildTripMetaV2(enriched),
        profilingInput: merged,
        whyYours: enriched.manifesto,
        tripSummary: enriched.manifesto.slice(0, 200),
        closingMessage: enriched.closing_quote,
        heroImageUrl: enriched.hero_image_url,
      });

      res.json({ id, coverage: computeCoverage(merged) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Errore refine itinerario:", err);
      res.status(500).json({ message: "Errore durante il raffinamento. Riprova." });
    }
  });

  // ── Date reali del viaggio ────────────────────────────────────────────────
  // L'utente consolida QUANDO parte davvero (il quiz spesso cattura solo il mese
  // → travel_dates è un placeholder derivato). Solo dopo questo, il sistema sa
  // quando il viaggio è "passato" e può chiedere "ci sei andato?" — prerequisito
  // dell'analisi del profilo REALE. Fonde start/end in tripMeta e alza il flag.
  const travelDatesSchema = z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data di inizio non valida"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data di fine non valida"),
    // Consenso opzionale alle email di follow-up su QUESTO viaggio (GDPR:
    // opt-in esplicito, mai default). Registrato con timestamp come prova.
    emailOptIn: z.boolean().optional(),
  }).refine((d) => d.end >= d.start, { message: "La data di fine deve essere ≥ inizio", path: ["end"] });

  app.patch("/api/itinerary/:id/travel-dates", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      const { start, end, emailOptIn } = travelDatesSchema.parse(req.body);
      const prevMeta = ((itin as any).tripMeta ?? {}) as Record<string, any>;
      const merged: Record<string, any> = {
        ...prevMeta,
        travel_dates: { start, end },
        travel_dates_confirmed: true,
        travel_dates_confirmed_at: new Date().toISOString(),
      };
      // Solo un consenso ESPLICITO viene registrato; l'assenza della checkbox
      // non tocca lo stato precedente (un true già dato non viene azzerato).
      if (emailOptIn === true) {
        merged.email_opt_in = true;
        merged.email_opt_in_at = new Date().toISOString();
      }
      await storage.updateItineraryTripMeta(id, merged);
      res.json({ ok: true, travel_dates: merged.travel_dates });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Errore aggiornamento date viaggio:", err);
      res.status(500).json({ message: "Errore nel salvataggio delle date" });
    }
  });

  // ── Stato del viaggio ("ci sei andato?") ──────────────────────────────────
  // A viaggio finito (date reali passate) l'utente conferma se ci è andato o no.
  // È il segnale che rende reali gli insight sul profilo (trait-prior li pesa).
  const tripStatusSchema = z.object({
    status: z.enum(["confirmed", "skipped"]),
  });

  app.patch("/api/itinerary/:id/trip-status", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      const { status } = tripStatusSchema.parse(req.body);
      const prevMeta = ((itin as any).tripMeta ?? {}) as Record<string, any>;
      const merged = { ...prevMeta, trip_status: status, trip_status_at: new Date().toISOString() };
      await storage.updateItineraryTripMeta(id, merged);
      res.json({ ok: true, trip_status: status });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Errore aggiornamento stato viaggio:", err);
      res.status(500).json({ message: "Errore nel salvataggio dello stato" });
    }
  });

  // Coverage corrente di un itinerario ("ti somiglia al X%") + dimensioni aperte.
  app.get("/api/itinerary/:id/coverage", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Not found" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      const profile = (itin as any).profilingInput ?? await storage.getProfilingInput() ?? {};
      res.json({ coverage: computeCoverage(profile), schemaVersion: (itin as any).schemaVersion ?? 1 });
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // Modifica manuale di un itinerario (drag-drop dei giorni, ecc.)
  app.patch("/api/itinerary/:id/edit", requireAuth, async (req, res) => {
    try {
      const itinId = z.coerce.number().parse(req.params.id);
      const { days } = req.body;
      if (!Array.isArray(days)) return res.status(400).json({ message: "days required" });
      const itin = await storage.getItineraryById(itinId);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      await storage.updateItineraryMapPoints(itinId, days);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Errore salvataggio modifiche" });
    }
  });

  // ── Prenotazioni: click affiliate + conferma "ho prenotato" ─────────────
  // Il PDF completo si sblocca con volo+alloggio CONFERMATI, ma una conferma
  // è accettata solo se il server ha registrato il click sul link di
  // prenotazione di quella voce: non puoi flaggare ciò che non hai mai aperto.
  // (Certezza di prenotazione vera non esiste nel modello affiliate — il click
  // è il segnale onesto E quello che monetizza; vedi docs/DECISIONS.md.)
  const bookingKeySchema = z.enum(["flight", "hotel", "transfer", "experience", "food"]);

  app.post("/api/itinerary/:id/affiliate-click", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      const key = bookingKeySchema.parse(req.body?.key);
      const prevMeta = ((itin as any).tripMeta ?? {}) as Record<string, any>;
      const clicks = { ...(prevMeta.affiliate_clicks ?? {}), [key]: new Date().toISOString() };
      await storage.updateItineraryTripMeta(id, { ...prevMeta, affiliate_clicks: clicks });
      res.json({ ok: true, affiliate_clicks: clicks });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Voce non valida" });
      res.status(500).json({ message: "Errore nel salvataggio" });
    }
  });

  app.post("/api/itinerary/:id/booked", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      const key = bookingKeySchema.parse(req.body?.key);
      const value = z.boolean().parse(req.body?.value);
      const prevMeta = ((itin as any).tripMeta ?? {}) as Record<string, any>;
      if (value && !(prevMeta.affiliate_clicks ?? {})[key]) {
        // Il gate vero è QUI, non nella UI: senza click registrato la conferma
        // viene rifiutata anche da chi chiama l'API a mano.
        return res.status(409).json({ message: "Apri prima il link di prenotazione di questa voce", code: "click_required" });
      }
      const booked = { ...(prevMeta.booked ?? {}) };
      if (value) booked[key] = new Date().toISOString();
      else delete booked[key];
      await storage.updateItineraryTripMeta(id, { ...prevMeta, booked });
      res.json({ ok: true, booked });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Richiesta non valida" });
      res.status(500).json({ message: "Errore nel salvataggio" });
    }
  });

  // ── Condivisione pubblica ────────────────────────────────────────────────
  // Genera (o riusa) il token opaco e restituisce l'URL pubblico assoluto.
  app.post("/api/itinerary/:id/share", requireAuth, async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
      if (!ownsItinerary(itin, req)) return res.status(403).json({ message: "Non autorizzato" });
      let token = (itin as any).publicToken as string | null;
      if (!token) {
        token = randomBytes(9).toString("base64url"); // 12 char url-safe
        await storage.setItineraryPublicToken(id, token);
      }
      const base = `${req.protocol}://${req.get("host")}`;
      res.json({ token, url: `${base}/i/${token}` });
    } catch (err) {
      res.status(500).json({ message: "Errore nella condivisione" });
    }
  });

  // Lettura pubblica read-only by token — SENZA dati personali (no userId).
  app.get("/api/share/:token", async (req, res) => {
    try {
      const token = String(req.params.token);
      const itin = await storage.getItineraryByPublicToken(token);
      if (!itin) return res.status(404).json({ message: "Non trovato" });
      // Read-only pubblico: niente PII. Oltre a userId, strippiamo anche il
      // profilingInput (risposte del quiz) ora che è persistito sulla riga.
      const { userId, profilingInput, ...safe } = itin as any;
      res.json(safe);
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // Card OG brandizzata (PNG 1200×630) per la vista condivisa.
  // og:image punta qui; i crawler social la scaricano come anteprima.
  app.get("/og/itinerary/:token/og.png", async (req, res) => {
    try {
      const itin = await storage.getItineraryByPublicToken(String(req.params.token));
      if (!itin) return res.status(404).end();
      const dest = (itin as any).destinationName ?? "MindRoute";
      const days = Array.isArray((itin as any).days) ? (itin as any).days.length : 0;
      const subline = ((itin as any).whyYours ?? (itin as any).tripSummary ?? "").toString();
      const heroImageUrl = (itin as any).heroImageUrl ?? (itin as any).imageUrl ?? null;
      const { renderItineraryOgPng } = await import("../og-card");
      const png = await renderItineraryOgPng({
        cacheKey: `${req.params.token}|${heroImageUrl ?? ""}`,
        destination: dest, days, subline, heroImageUrl,
      });
      res
        .status(200)
        .set("Content-Type", "image/png")
        .set("Cache-Control", "public, max-age=86400, s-maxage=86400")
        .send(png);
    } catch (err) {
      console.error("Errore render OG card:", err);
      res.status(500).end();
    }
  });

  // Pagina condivisa /i/:token — serve l'index.html con i meta OG iniettati
  // (i crawler social non eseguono JS). Solo in produzione: in dev lasciamo
  // che sia Vite a servire la SPA (next()).
  app.get("/i/:token", async (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    try {
      const indexPath = path.resolve(__dirname, "public", "index.html");
      let html = fs.readFileSync(indexPath, "utf-8");
      const itin = await storage.getItineraryByPublicToken(String(req.params.token));
      if (itin) {
        const base = `${req.protocol}://${req.get("host")}`;
        const dest = (itin as any).destinationName ?? "MindRoute";
        const desc = ((itin as any).whyYours ?? (itin as any).tripSummary ?? "")
          .toString().replace(/\s+/g, " ").trim().slice(0, 180);
        const days = Array.isArray((itin as any).days) ? (itin as any).days.length : 0;
        const title = `${dest}${days ? ` · ${days} ${days === 1 ? "giorno" : "giorni"}` : ""} — MindRoute`;
        // Branded card (foto + titolo + giorni + logo) renderizzata server-side.
        // Fallback alla foto hero grezza se l'utente ha un'immagine ma vogliamo
        // comunque popolare twitter:image quando la card non esiste.
        const token = String(req.params.token);
        const img = `${base}/og/itinerary/${escapeHtml(token)}/og.png`;
        const url = `${base}/i/${escapeHtml(token)}`;
        const og = [
          `<meta property="og:type" content="article" />`,
          `<meta property="og:site_name" content="MindRoute" />`,
          `<meta property="og:title" content="${escapeHtml(title)}" />`,
          desc ? `<meta property="og:description" content="${escapeHtml(desc)}" />` : "",
          `<meta property="og:image" content="${img}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:url" content="${url}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
          desc ? `<meta name="twitter:description" content="${escapeHtml(desc)}" />` : "",
          `<meta name="twitter:image" content="${img}" />`,
          `<meta name="description" content="${escapeHtml(desc || `Il tuo viaggio a ${dest}, costruito su di te.`)}" />`,
          `<title>${escapeHtml(title)}</title>`,
        ].filter(Boolean).join("\n    ");
        // Sostituisce il blocco di default tra i marker; fallback: prima di </head>.
        if (html.includes("<!--OG:START-->")) {
          html = html.replace(/<!--OG:START-->[\s\S]*?<!--OG:END-->/, `<!--OG:START-->\n    ${og}\n    <!--OG:END-->`);
        } else {
          html = html.replace("</head>", `    ${og}\n  </head>`);
        }
      }
      res.status(200).set("Content-Type", "text/html").send(html);
    } catch (err) {
      next();
    }
  });
}
