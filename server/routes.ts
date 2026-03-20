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
        // Fetch real Unsplash image for each destination
        const realImage = await fetchUnsplashHero(dest.name);
        const destWithImage = {
          ...dest,
          imageUrl: realImage?.url ?? dest.imageUrl,
        };
        const created = await storage.createDestination(destWithImage);
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

// --- Helper functions ---
      const keyDayIndices = new Set([0, 3, 4, (itinerary.days?.length ?? 7) - 1]);

      async function fetchDayImage(query: string): Promise<string | null> {
        const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
        if (!unsplashKey || !query) return null;
        try {
          const r = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
            { headers: { Authorization: `Client-ID ${unsplashKey}` } }
          );
          if (!r.ok) return null;
          const d = await r.json();
          return d.results?.[0]?.urls?.regular ?? null;
        } catch { return null; }
      }

      async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`);
          const d = await r.json();
          if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
          return null;
        } catch { return null; }
      }

      function extractPlaces(text: string): string | null {
        if (!text || text.length < 5) return null;
        if (/volo|aeroporto|airport|trasferimento|transfer|check.?in|check.?out|partenza|ritorno|rientro/i.test(text)) return null;
        const patterns = [
          /(?:a|al|alla|alle|verso|to|at|in|del|della|das|do|da)\s+([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s''-]{2,35})(?:\s*[—,\.\-–:]|$)/,
          /^([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s''-]{2,35})(?:\s*[—,\.\-–:])/,
          /:\s*([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s''-]{2,35})(?:\s*[—,\.\-–]|$)/,
        ];
        for (const p of patterns) {
          const m = text.match(p);
          if (m?.[1] && m[1].trim().length > 2) return m[1].trim();
        }
        return null;
      }

      // Get destination center for distance check
      const destCenter = await geocode(destinationName);
      const destLat = destCenter?.lat ?? 0;
      const destLng = destCenter?.lng ?? 0;
      const city = destinationName.split(",")[0].trim();

      // --- Process each day: images + map points ---
      const daysWithExtras = await Promise.all(
        (itinerary.days || []).map(async (day: any, idx: number) => {
          const extras: Record<string, any> = {};

          // Image for key days
          if (keyDayIndices.has(idx) && day.imageQuery) {
            const img = await fetchDayImage(day.imageQuery);
            if (img) extras.dayImage = img;
          }

          // Geocode places for map pins
          const mapPoints: any[] = [];
          const slots = [
            { text: day.morning, slot: "Mattina" },
            { text: day.afternoon, slot: "Pomeriggio" },
            { text: day.lunch, slot: "Pranzo" },
            { text: day.evening, slot: "Sera" },
          ];

          for (const { text, slot } of slots) {
            const name = extractPlaces(text);
            if (!name) continue;
            const queries = [`${name} ${city}`, name];
            for (const q of queries) {
              const coords = await geocode(q);
              if (coords) {
                const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
                if (dist < 3) {
                  mapPoints.push({ label: name, slot, lat: coords.lat, lng: coords.lng });
                  break;
                }
              }
              await new Promise(r => setTimeout(r, 150));
            }
          }

          // Also try imageQuery as geocoding source
          if (day.imageQuery && mapPoints.length < 2) {
            const shortName = day.imageQuery.split(/\s+/).slice(0, 3).join(" ");
            const coords = await geocode(day.imageQuery);
            if (coords) {
              const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
              if (dist < 3) mapPoints.push({ label: shortName, slot: "Mattina", lat: coords.lat, lng: coords.lng });
            }
            await new Promise(r => setTimeout(r, 150));
          }

          if (mapPoints.length > 0) extras.mapPoints = mapPoints;
          return { ...day, ...extras };
        })
      );

      const saved = await storage.createItinerary({
        destinationId,
        ...itinerary,
        days: daysWithExtras,
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
