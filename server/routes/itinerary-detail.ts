import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { api } from "@shared/routes";

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
}
