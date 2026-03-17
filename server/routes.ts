import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateDestinationsOnly, generateItineraryForDestination } from "./matching-engine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // STEP 1 — Genera 3 destinazioni leggere
  app.post(api.profiling.submit.path, async (req, res) => {
    try {
      const input = api.profiling.submit.input.parse(req.body);
      const destinations = await generateDestinationsOnly(input);
      await storage.clearAll();
      const createdDests = [];
      for (const dest of destinations) {
        const created = await storage.createDestination(dest);
        createdDests.push(created);
      }
      // Salva l'input per usarlo dopo nella generazione itinerario
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
  app.get("/api/profiling/input", async (req, res) => {
    try {
      const input = await storage.getProfilingInput();
      if (!input) return res.status(404).json({ message: "No profiling input found" });
      res.json(input);
    } catch (err) {
      res.status(500).json({ message: "Errore nel recupero dell'input" });
    }
  });

  // STEP 3 — Genera itinerario completo per destinazione scelta
  app.post("/api/itinerary/generate", async (req, res) => {
    try {
      const { input, destinationName, destinationId } = req.body;
      if (!input || !destinationName || !destinationId) {
        return res.status(400).json({ message: "Missing input, destinationName or destinationId" });
      }
      const itinerary = await generateItineraryForDestination(input, destinationName);
      const saved = await storage.createItinerary({
        destinationId,
        ...itinerary,
      });
      res.json(saved);
    } catch (err) {
      console.error("Error generating itinerary:", err);
      return res.status(500).json({ message: "Errore nella generazione dell'itinerario. Riprova." });
    }
  });

  // STEP 4 — Recupera itinerario per destinazione
  app.get(api.itinerary.get.path, async (req, res) => {
    try {
      const destId = z.coerce.number().parse(req.params.destinationId);
      const itinerary = await storage.getItinerary(destId);
      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }
      res.json(itinerary);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid destination ID',
        });
      }
      throw err;
    }
  });

  return httpServer;
}
