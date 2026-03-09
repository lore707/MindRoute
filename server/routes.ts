import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateDestinations } from "./matching-engine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.profiling.submit.path, async (req, res) => {
    try {
      const input = api.profiling.submit.input.parse(req.body);

      const { destinations: matched, itineraries } = await generateDestinations(input);

      await storage.clearAll();

      const createdDests = [];
      for (const dest of matched) {
        const created = await storage.createDestination(dest);
        createdDests.push(created);

        const itinerary = itineraries.get(dest.name);
        if (itinerary) {
          await storage.createItinerary({
            destinationId: created.id,
            ...itinerary,
          });
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