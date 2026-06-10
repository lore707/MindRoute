import type { Express } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { requireAuth } from "../auth";
import { itineraryLimiter } from "../rate-limiter";

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
      const profilingInput = await storage.getProfilingInput();
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
      const profilingInput = await storage.getProfilingInput();
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
      const { userId, ...safe } = itin as any;
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
