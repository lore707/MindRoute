import type { Express } from "express";
import type { Server } from "http";
async function fetchUnsplashHero(destinationName: string): Promise<{ url: string; photographer: string; photographerUrl: string } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  // Build multiple query variants from most specific to most generic
  const parts = destinationName.split(",").map(s => s.trim());
  const city = parts[0] ?? destinationName;
  const country = parts[1] ?? "";

  const queries = [
    `${city} ${country} landscape`.trim(),
    `${city} travel`.trim(),
    `${city} beach ocean nature`.trim(),
    `${country} landscape travel`.trim(),
    `${country} nature`.trim(),
  ].filter(q => q.length > 3);

  // Remove duplicates
  const uniqueQueries = [...new Set(queries)];

  async function searchUnsplash(query: string): Promise<{ url: string; photographer: string; photographerUrl: string } | null> {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=3`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Pick the photo with highest resolution available, prefer wider photos
        const photo = data.results[0];
        const url = photo.urls?.full ?? photo.urls?.regular ?? null;
        if (!url) return null;
        return {
          url,
          photographer: photo.user?.name ?? "Unknown",
          photographerUrl: photo.user?.links?.html ?? "https://unsplash.com",
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // Try each query variant until we find a result
  for (const query of uniqueQueries) {
    const result = await searchUnsplash(query);
    if (result) return result;
  }

  // Final fallback: generic tropical/travel photo
  return searchUnsplash("tropical island paradise landscape");
}
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
    const { input, destinationName, destinationId, whyYours } = req.body;
      if (!input || !destinationName || !destinationId) {
        return res.status(400).json({ message: "Missing input, destinationName or destinationId" });
      }
    const itinerary = await generateItineraryForDestination(input, destinationName);
      const heroImage = await fetchUnsplashHero(destinationName);

 // Fetch images only for key days (day 1, peak days, last day) — max 4 calls
      const city = destinationName.split(",")[0].trim();
      const keyDayIndices = new Set([0, 3, 4, (itinerary.days?.length ?? 7) - 1]);
      
      async function fetchDayImage(query: string): Promise<string | null> {
        const key = process.env.UNSPLASH_ACCESS_KEY;
        if (!key) return null;
        try {
          const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
            { headers: { Authorization: `Client-ID ${key}` } }
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (data.results?.[0]?.urls?.regular) return data.results[0].urls.regular;
          return null;
        } catch { return null; }
      }

      function extractPlaceName(text: string): string | null {
        if (!text || text.length < 5) return null;
        const lower = text.toLowerCase();
        if (/volo|aeroporto|airport|trasferimento|transfer|check.?in|check.?out|partenza|arrivo/.test(lower)) return null;
        const patterns = [
          /(?:al|at|to|verso|nella|nel|a)\s+([A-Z][a-zA-Zàèéìòù\s'-]+)/,
          /^([A-Z][a-zA-Zàèéìòù\s'-]+?)(?:\s*[—,\.\-–])/,
        ];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match?.[1] && match[1].length > 2 && match[1].length < 40) return match[1].trim();
        }
        return null;
      }

      const daysWithImages = await Promise.all(
        (itinerary.days || []).map(async (day: any, idx: number) => {
          if (!keyDayIndices.has(idx)) return day;
          const images: Record<string, string> = {};
          const morningPlace = extractPlaceName(day.morning);
          if (morningPlace) {
            const img = await fetchDayImage(`${morningPlace} ${city}`);
            if (img) images.morningImage = img;
          }
          const afternoonPlace = extractPlaceName(day.afternoon);
          if (afternoonPlace) {
            const img = await fetchDayImage(`${afternoonPlace} ${city}`);
            if (img) images.afternoonImage = img;
          }
          return { ...day, ...images };
        })
      );
    const saved = await storage.createItinerary({
        destinationId,
        ...itinerary,
        days: daysWithImages,
        whyYours: whyYours ?? itinerary.whyYours ?? null,
        heroImageUrl: heroImage?.url ?? null,
        heroPhotographer: heroImage?.photographer ?? null,
        heroPhotographerUrl: heroImage?.photographerUrl ?? null,
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
