import type { Express } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { api } from "@shared/routes";

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function registerItineraryDetailRoutes(app: Express) {
  // Aggiorna mapPoints
  app.patch("/api/itinerary/:id/mappoints", async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const { mapPoints } = req.body;
      await storage.updateItineraryMapPoints(id, mapPoints);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Errore aggiornamento mappa" });
    }
  });

  // Polling mapPoints — used by the client to know when the background
  // enrichment is done so it can re-render the map.
  app.get("/api/itinerary/:id/mappoints", async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itinerary = await storage.getItineraryById(id);
      if (!itinerary) return res.status(404).json({ message: "Not found" });
      const hasPoints = itinerary.days?.some((d: any) => d.mapPoints?.length > 0);
      res.json({ ready: hasPoints, days: hasPoints ? itinerary.days : null });
    } catch (err) {
      res.status(500).json({ message: "Errore" });
    }
  });

  // Recupera itinerario per id diretto o per destinationId (fallback)
  app.get(api.itinerary.get.path, async (req, res) => {
    try {
      const destId = z.coerce.number().parse(req.params.destinationId);
      let itinerary = await storage.getItineraryById(destId);
      if (!itinerary) {
        itinerary = await storage.getItinerary(destId);
      }
      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
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
  app.post("/api/itinerary/:id/regenerate-day", async (req, res) => {
    try {
      const itinId = z.coerce.number().parse(req.params.id);
      const { dayIndex, feedback } = req.body;
      const itin = await storage.getItineraryById(itinId);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
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
  app.patch("/api/itinerary/:id/edit", async (req, res) => {
    try {
      const itinId = z.coerce.number().parse(req.params.id);
      const { days } = req.body;
      if (!Array.isArray(days)) return res.status(400).json({ message: "days required" });
      await storage.updateItineraryMapPoints(itinId, days);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Errore salvataggio modifiche" });
    }
  });

  // ── Condivisione pubblica ────────────────────────────────────────────────
  // Genera (o riusa) il token opaco e restituisce l'URL pubblico assoluto.
  app.post("/api/itinerary/:id/share", async (req, res) => {
    try {
      const id = z.coerce.number().parse(req.params.id);
      const itin = await storage.getItineraryById(id);
      if (!itin) return res.status(404).json({ message: "Itinerario non trovato" });
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
        const img = (itin as any).heroImageUrl ?? (itin as any).imageUrl ?? "";
        const url = `${base}/i/${escapeHtml(String(req.params.token))}`;
        const og = [
          `<meta property="og:type" content="article" />`,
          `<meta property="og:site_name" content="MindRoute" />`,
          `<meta property="og:title" content="${escapeHtml(title)}" />`,
          desc ? `<meta property="og:description" content="${escapeHtml(desc)}" />` : "",
          img ? `<meta property="og:image" content="${escapeHtml(img)}" />` : "",
          `<meta property="og:url" content="${url}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
          desc ? `<meta name="twitter:description" content="${escapeHtml(desc)}" />` : "",
          img ? `<meta name="twitter:image" content="${escapeHtml(img)}" />` : "",
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
