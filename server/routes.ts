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
      // Hero image e geocoding in parallelo — non bloccano la risposta AI
      const [heroImage] = await Promise.all([
        fetchUnsplashHero(destinationName),
      ]);

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

  // Get destination center for distance check
      const destCenter = await geocode(destinationName);
      const destLat = destCenter?.lat ?? 0;
      const destLng = destCenter?.lng ?? 0;
      const city = destinationName.split(",")[0].trim();

   async function tryGeocode(name: string): Promise<{ lat: number; lng: number } | null> {
        // Solo una query invece di due — riduce tempo geocoding del 50%
        const q = `${name} ${city}`;
        const coords = await geocode(q);
        if (coords) {
          const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
          if (dist < 3) return coords;
        }
        return null;
      }

    // --- Process each day: images + map points — in parallelo tra giorni ---
      const daysWithExtras = await Promise.all(
        (itinerary.days || []).map(async (day: any, idx: number) => {
          const extras: Record<string, any> = {};

          // Image for key days
          if (keyDayIndices.has(idx) && day.imageQuery) {
            const img = await fetchDayImage(day.imageQuery);
            if (img) extras.dayImage = img;
          }

          // Geocode places for map pins — use multiple strategies
          const mapPoints: any[] = [];
          const found = new Set<string>();

          // STRATEGY 1: Use affiliateLabels (most reliable — real place names)
          if (day.affiliateLabels) {
            const slotMapping: Record<string, string> = {
              getyourguide_morning: "Mattina", klook_morning: "Mattina", viator_morning: "Mattina",
              getyourguide_place_morning: "Mattina", klook_place_morning: "Mattina", viator_place_morning: "Mattina",
              getyourguide_afternoon: "Pomeriggio", klook_afternoon: "Pomeriggio", viator_afternoon: "Pomeriggio",
              getyourguide_place_afternoon: "Pomeriggio", klook_place_afternoon: "Pomeriggio", viator_place_afternoon: "Pomeriggio",
              thefork_lunch: "Pranzo", tripadvisor_lunch: "Pranzo",
              thefork_evening: "Sera", tripadvisor_evening: "Sera",
            };
            for (const [key, label] of Object.entries(day.affiliateLabels)) {
              if (found.has(label) || !label || label.length < 3) continue;
              if (/ristoranti\s/i.test(label)) continue; // skip generic "Ristoranti CityName"
              const slot = slotMapping[key] || "Mattina";
              const coords = await tryGeocode(label);
              if (coords) {
                mapPoints.push({ label, slot, lat: coords.lat, lng: coords.lng });
                found.add(label);
              }
            }
          }

          // STRATEGY 2: Extract place names from text (broader patterns)
          if (mapPoints.length < 3) {
            const slots = [
              { text: day.morning, slot: "Mattina" },
              { text: day.afternoon, slot: "Pomeriggio" },
              { text: day.lunch, slot: "Pranzo" },
              { text: day.evening, slot: "Sera" },
            ];
            for (const { text, slot } of slots) {
              if (!text || text.length < 5) continue;
              if (/volo|aeroporto|airport|trasferimento|transfer|check.?in|check.?out|partenza|ritorno/i.test(text)) continue;
              // Try multiple extraction patterns
              const candidates: string[] = [];
              const patterns = [
                /(?:a|al|alla|alle|verso|nel|nella|to|at|in|del|della|das|do|da)\s+([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s''-]{2,40})(?:\s*[—,\.\-–:(]|$)/,
                /^([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s''-]{2,40})(?:\s*[—,\.\-–:])/,
                /(?:spiaggia|beach|lago|lake|monte|mount|parco|park|mercato|market|tempio|temple|quartiere|baia|bay|porto|port|isola|island)\s+(?:di\s+|del\s+|della\s+|delle\s+)?([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s''-]{2,30})/i,
              ];
              for (const p of patterns) {
                const m = text.match(p);
                if (m?.[1] && m[1].trim().length > 2) candidates.push(m[1].trim());
              }
              // Also try the first segment before — as a place name
              const firstSeg = text.split(/\s*[—\-–]\s*/)[0].trim();
              if (firstSeg.length > 3 && firstSeg.length < 45 && /^[A-Z]/.test(firstSeg)) {
                candidates.push(firstSeg);
              }
              for (const name of candidates) {
                if (found.has(name)) continue;
                const coords = await tryGeocode(name);
                if (coords) {
                  mapPoints.push({ label: name, slot, lat: coords.lat, lng: coords.lng });
                  found.add(name);
                  break;
                }
              }
            }
          }

          // STRATEGY 3: imageQuery as geocoding source
          if (day.imageQuery && mapPoints.length < 2) {
            const shortName = day.imageQuery.split(/\s+/).slice(0, 3).join(" ");
            if (!found.has(shortName)) {
              const coords = await tryGeocode(day.imageQuery);
              if (coords) {
                mapPoints.push({ label: shortName, slot: "Mattina", lat: coords.lat, lng: coords.lng });
                found.add(shortName);
              }
            }
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

 // STEP 3b — Genera itinerario con SSE streaming progress
  app.post("/api/itinerary/generate-stream", async (req, res) => {
    const { input, destinationName, destinationId, whyYours } = req.body;
    if (!input || !destinationName || !destinationId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Setup SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      send("progress", { step: 1, message: "Analizzo il tuo profilo psicologico..." });
      const itinerary = await generateItineraryForDestination(input, destinationName);

      send("progress", { step: 2, message: "Cerco l'immagine perfetta per il tuo viaggio..." });
      const [heroImage] = await Promise.all([fetchUnsplashHero(destinationName)]);

      send("progress", { step: 3, message: "Costruisco la mappa dei luoghi..." });

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

      const destCenter = await geocode(destinationName);
      const destLat = destCenter?.lat ?? 0;
      const destLng = destCenter?.lng ?? 0;
      const city = destinationName.split(",")[0].trim();

      async function tryGeocode(name: string): Promise<{ lat: number; lng: number } | null> {
        const coords = await geocode(`${name} ${city}`);
        if (coords) {
          const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
          if (dist < 3) return coords;
        }
        return null;
      }

     send("progress", { step: 4, message: "Piazzo i punti sulla mappa..." });

      // Raccogli max 5 nomi da geocodificare da tutto l'itinerario — non uno per slot per giorno
      const slotMapping: Record<string, string> = {
        getyourguide_morning: "Mattina", klook_morning: "Mattina", viator_morning: "Mattina",
        getyourguide_place_morning: "Mattina", klook_place_morning: "Mattina", viator_place_morning: "Mattina",
        getyourguide_afternoon: "Pomeriggio", klook_afternoon: "Pomeriggio", viator_afternoon: "Pomeriggio",
        getyourguide_place_afternoon: "Pomeriggio", klook_place_afternoon: "Pomeriggio", viator_place_afternoon: "Pomeriggio",
        thefork_lunch: "Pranzo", tripadvisor_lunch: "Pranzo",
        thefork_evening: "Sera", tripadvisor_evening: "Sera",
      };

      // Estrai candidati da tutti i giorni
      const geocodeCandidates: { name: string; slot: string; dayNum: number }[] = [];
      for (const day of (itinerary.days || [])) {
        if (day.affiliateLabels) {
          for (const [key, label] of Object.entries(day.affiliateLabels)) {
            const l = label as string;
            if (!l || l.length < 3 || /ristoranti\s/i.test(l)) continue;
            if (!geocodeCandidates.find(c => c.name === l)) {
              geocodeCandidates.push({ name: l, slot: slotMapping[key] || "Mattina", dayNum: day.dayNumber });
            }
          }
        }
      }

      // Geocodifica max 5 in parallelo
      const top5 = geocodeCandidates.slice(0, 5);
      const geocodeResults = await Promise.all(
        top5.map(async (c) => {
          const coords = await tryGeocode(c.name);
          return coords ? { label: c.name, slot: c.slot, dayNum: c.dayNum, lat: coords.lat, lng: coords.lng } : null;
        })
      );
      const globalMapPoints = geocodeResults.filter(Boolean) as any[];

      // Fetch immagini giorni chiave in parallelo
      const daysWithExtras = await Promise.all(
        (itinerary.days || []).map(async (day: any, idx: number) => {
          const extras: Record<string, any> = {};
          if (keyDayIndices.has(idx) && day.imageQuery) {
            const img = await fetchDayImage(day.imageQuery);
            if (img) extras.dayImage = img;
          }
          // Assegna map points di questo giorno
          const dayPoints = globalMapPoints.filter(p => p.dayNum === day.dayNumber);
          if (dayPoints.length > 0) extras.mapPoints = dayPoints;
          return { ...day, ...extras };
        })
      );

  send("progress", { step: 5, message: "Quasi pronto, ultime rifiniture..." });

      const saved = await storage.createItinerary({
        destinationId,
        ...itinerary,
        days: daysWithExtras,
        whyYours: whyYours ?? itinerary.whyYours ?? null,
        heroImageUrl: heroImage?.url ?? null,
        heroPhotographer: heroImage?.photographer ?? null,
        heroPhotographerUrl: heroImage?.photographerUrl ?? null,
      });

      // Manda done SUBITO — utente vede l'itinerario
      send("done", { itineraryId: saved.id, destinationId });
      res.end();

      // Geocoding in background — non blocca l'utente
      (async () => {
        try {
          async function geocodeBg(query: string): Promise<{ lat: number; lng: number } | null> {
            try {
              const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`);
              const d = await r.json();
              if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
              return null;
            } catch { return null; }
          }

          const destCoords = await geocodeBg(destinationName);
          const destLat = destCoords?.lat ?? 0;
          const destLng = destCoords?.lng ?? 0;
          const city = destinationName.split(",")[0].trim();

          // Raccogli candidati da affiliateLabels
          const slotMappingBg: Record<string, string> = {
            getyourguide_morning: "Mattina", klook_morning: "Mattina", viator_morning: "Mattina",
            getyourguide_place_morning: "Mattina", klook_place_morning: "Mattina", viator_place_morning: "Mattina",
            getyourguide_afternoon: "Pomeriggio", klook_afternoon: "Pomeriggio", viator_afternoon: "Pomeriggio",
            getyourguide_place_afternoon: "Pomeriggio", klook_place_afternoon: "Pomeriggio", viator_place_afternoon: "Pomeriggio",
            thefork_lunch: "Pranzo", tripadvisor_lunch: "Pranzo",
            thefork_evening: "Sera", tripadvisor_evening: "Sera",
          };

          const candidates: { name: string; slot: string; dayNum: number }[] = [];
          for (const day of (itinerary.days || [])) {
            if (day.affiliateLabels) {
              for (const [key, label] of Object.entries(day.affiliateLabels)) {
                const l = label as string;
                if (!l || l.length < 3 || /ristoranti\s/i.test(l)) continue;
                if (!candidates.find(c => c.name === l)) {
                  candidates.push({ name: l, slot: slotMappingBg[key] || "Mattina", dayNum: day.dayNumber });
                }
              }
            }
          }

          // Geocodifica max 8 in parallelo
          const top8 = candidates.slice(0, 8);
          const results = await Promise.all(
            top8.map(async (c) => {
              const coords = await geocodeBg(`${c.name} ${city}`);
              if (!coords) return null;
              const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
              if (dist > 3) return null;
              return { label: c.name, slot: c.slot, dayNum: c.dayNum, lat: coords.lat, lng: coords.lng };
            })
          );

          const validPoints = results.filter(Boolean) as any[];
          if (validPoints.length === 0) return;

          // Aggiorna i giorni con i mapPoints
          const updatedDays = (saved.days || []).map((day: any) => {
            const dayPoints = validPoints.filter(p => p.dayNum === day.dayNumber);
            if (dayPoints.length > 0) return { ...day, mapPoints: dayPoints };
            return day;
          });

          await storage.updateItineraryMapPoints(saved.id, updatedDays);
        } catch (bgErr) {
          console.error("Background geocoding error:", bgErr);
        }
      })();
    }
  });

  // STEP 3c — Aggiorna mapPoints in background
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

  // STEP 3d — Polling mapPoints
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
