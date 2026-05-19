import type { Express } from "express";
import { storage } from "../storage";
import { itineraryLimiter } from "../rate-limiter";
import { generateItineraryForDestination } from "../matching-engine";
import { fetchUnsplashHero, fetchDayImageWithFallback, mapWithConcurrency } from "../unsplash";
import { recordRecentDestination } from "../recent-destinations";
import { recordPickSnapshot } from "../trait-recorder";
import { getTraitPriorForUser, formatTraitPriorBlock } from "../trait-prior";

const SLOT_MAPPING: Record<string, string> = {
  getyourguide_morning: "Mattina", klook_morning: "Mattina", viator_morning: "Mattina",
  getyourguide_place_morning: "Mattina", klook_place_morning: "Mattina", viator_place_morning: "Mattina",
  getyourguide_afternoon: "Pomeriggio", klook_afternoon: "Pomeriggio", viator_afternoon: "Pomeriggio",
  getyourguide_place_afternoon: "Pomeriggio", klook_place_afternoon: "Pomeriggio", viator_place_afternoon: "Pomeriggio",
  thefork_lunch: "Pranzo", tripadvisor_lunch: "Pranzo",
  thefork_evening: "Sera", tripadvisor_evening: "Sera",
};

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`);
    const d = await r.json();
    if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
    return null;
  } catch { return null; }
}

export function registerItineraryGenRoutes(app: Express) {
  // STEP 3 — Genera itinerario completo per destinazione scelta (no streaming)
  app.post("/api/itinerary/generate", itineraryLimiter, async (req, res) => {
    try {
      const { input, destinationName, destinationId, whyYours } = req.body;
      if (!input || !destinationName || !destinationId) {
        return res.status(400).json({ message: "Missing input, destinationName or destinationId" });
      }
      const userIdForPrior = (req.user as any)?.id ?? null;
      const prior = await getTraitPriorForUser(userIdForPrior);
      const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
      const itinerary = await generateItineraryForDestination(input, destinationName, priorBlock);
      const [heroImage] = await Promise.all([fetchUnsplashHero(destinationName)]);

      const destCenter = await geocode(destinationName);
      const destLat = destCenter?.lat ?? 0;
      const destLng = destCenter?.lng ?? 0;
      const city = destinationName.split(",")[0].trim();

      const tryGeocode = async (name: string): Promise<{ lat: number; lng: number } | null> => {
        const coords = await geocode(`${name} ${city}`);
        if (coords) {
          const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
          if (dist < 3) return coords;
        }
        return null;
      };

      // Per-day images + map-point extraction. Concurrency-3 to avoid Unsplash burst.
      const heroUrl = heroImage?.url ?? null;
      const daysWithExtras = await mapWithConcurrency(itinerary.days || [], 3, async (day: any) => {
        const extras: Record<string, any> = {};

        const dayImg = await fetchDayImageWithFallback(day.imageQuery, destinationName);
        extras.dayImageUrl = dayImg ?? heroUrl;

        const mapPoints: any[] = [];
        const found = new Set<string>();

        // STRATEGY 1: affiliateLabels — real place names
        if (day.affiliateLabels) {
          for (const [key, label] of Object.entries(day.affiliateLabels)) {
            if (found.has(label as string) || !label || (label as string).length < 3) continue;
            if (/ristoranti\s/i.test(label as string)) continue;
            const slot = SLOT_MAPPING[key] || "Mattina";
            const coords = await tryGeocode(label as string);
            if (coords) {
              mapPoints.push({ label, slot, lat: coords.lat, lng: coords.lng });
              found.add(label as string);
            }
          }
        }

        // STRATEGY 2: extract place names from morning/afternoon/lunch/evening text
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
      });

      const userId = (req as any).user?.id ?? null;
      const saved = await storage.createItinerary({
        destinationId,
        ...itinerary,
        days: daysWithExtras,
        whyYours: whyYours ?? (itinerary as any).whyYours ?? null,
        heroImageUrl: heroImage?.url ?? null,
        heroPhotographer: heroImage?.photographer ?? null,
        heroPhotographerUrl: heroImage?.photographerUrl ?? null,
        userId,
        createdAt: new Date().toISOString(),
      });
      recordRecentDestination(destinationName);
      recordPickSnapshot({ userId, profilingInput: input, destinationName, itineraryId: saved.id });
      res.json(saved);
    } catch (err) {
      console.error("Error generating itinerary:", err);
      return res.status(500).json({ message: "Errore nella generazione dell'itinerario. Riprova." });
    }
  });

  // STEP 3d — Streaming strutturato progressivo (giorni appaiono uno alla volta)
  app.post("/api/itinerary/stream-structured", async (req, res) => {
    const { input, destinationName, destinationId, whyYours } = req.body;
    if (!input || !destinationName || !destinationId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { generateItineraryStreamingStructured } = await import("../matching-engine");
      const userId = (req as any).user?.id ?? null;
      const prior = await getTraitPriorForUser(userId);
      const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
      const collectedDays: any[] = [];
      let metaData: any = null;

      await generateItineraryStreamingStructured(
        input,
        destinationName,
        (day: any) => { collectedDays.push(day); send("day", { day }); },
        (meta: any) => { metaData = meta; },
        priorBlock
      );

      const heroImage = await fetchUnsplashHero(destinationName);
      const finalDays = metaData?.days ?? collectedDays;

      const saved = await storage.createItinerary({
        destinationId,
        destinationName,
        days: finalDays,
        budgetSummary: metaData?.budgetSummary ?? "",
        packingList: metaData?.packingList ?? "",
        bestTime: metaData?.bestTime ?? "",
        gettingThere: metaData?.gettingThere ?? "",
        closingMessage: metaData?.closingMessage ?? "",
        tripSummary: metaData?.tripSummary ?? null,
        highlights: metaData?.highlights ?? null,
        whyYours: whyYours ?? metaData?.whyYours ?? null,
        heroImageUrl: heroImage?.url ?? null,
        heroPhotographer: heroImage?.photographer ?? null,
        heroPhotographerUrl: heroImage?.photographerUrl ?? null,
        topAffiliateLinks: metaData?.topAffiliateLinks ?? null,
        userId,
        createdAt: new Date().toISOString(),
      } as any);

      send("done", { itineraryId: saved.id });
      res.end();
    } catch (err) {
      console.error("Structured stream error:", err);
      try { send("error", { message: "Errore nella generazione." }); res.end(); } catch {}
    }
  });

  // STEP 3c — Streaming narrativo in tempo reale (ChatGPT-style)
  // Saves a placeholder immediately with the raw narrative, then runs the
  // structured generation + image/geocode pipeline in the background and
  // updates the same row when done.
  app.post("/api/itinerary/stream-narrative", async (req, res) => {
    const { input, destinationName, destinationId, whyYours } = req.body;
    if (!input || !destinationName || !destinationId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let fullText = "";

    try {
      const { generateItineraryStreaming } = await import("../matching-engine");

      await generateItineraryStreaming(input, destinationName, (chunk: string) => {
        fullText += chunk;
        send("chunk", { text: chunk });
      });

      const userId = (req as any).user?.id ?? null;
      let savedId: number | null = null;

      try {
        const placeholder = await storage.createItinerary({
          destinationId,
          destinationName,
          whyYours: whyYours ?? null,
          days: [],
          budgetSummary: "",
          packingList: "",
          bestTime: "",
          gettingThere: "",
          closingMessage: "",
          userId,
          createdAt: new Date().toISOString(),
          rawNarrative: fullText,
        } as any);
        savedId = placeholder.id;
      } catch (e) {
        console.error("Placeholder save error:", e);
      }

      send("done", { itineraryId: savedId ?? destinationId, rawNarrative: fullText });
      res.end();

      // Background structured generation
      if (savedId) {
        const finalItinId = savedId;
        (async () => {
          try {
            const bgPrior = await getTraitPriorForUser(userId);
            const bgPriorBlock = bgPrior ? formatTraitPriorBlock(bgPrior) : "";
            const structuredItinerary = await generateItineraryForDestination(input, destinationName, bgPriorBlock);
            const heroImage = await fetchUnsplashHero(destinationName);

            const destCenter = await geocode(destinationName);
            const destLat = destCenter?.lat ?? 0;
            const destLng = destCenter?.lng ?? 0;
            const city = destinationName.split(",")[0].trim();

            const tryGeocodeBg = async (name: string): Promise<{ lat: number; lng: number } | null> => {
              const coords = await geocode(`${name} ${city}`);
              if (coords) {
                const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
                if (dist < 3) return coords;
              }
              return null;
            };

            const geocodeCandidates: { name: string; slot: string; dayNum: number }[] = [];
            for (const day of (structuredItinerary.days || [])) {
              if (day.affiliateLabels) {
                for (const [key, label] of Object.entries(day.affiliateLabels)) {
                  const l = label as string;
                  if (!l || l.length < 3 || /ristoranti\s/i.test(l)) continue;
                  if (!geocodeCandidates.find(c => c.name === l)) {
                    geocodeCandidates.push({ name: l, slot: SLOT_MAPPING[key] || "Mattina", dayNum: day.dayNumber });
                  }
                }
              }
            }

            const top5 = geocodeCandidates.slice(0, 5);
            const geocodeResults = await Promise.all(
              top5.map(async (c) => {
                const coords = await tryGeocodeBg(c.name);
                return coords ? { label: c.name, slot: c.slot, dayNum: c.dayNum, lat: coords.lat, lng: coords.lng } : null;
              })
            );
            const globalMapPoints = geocodeResults.filter(Boolean) as any[];

            const heroUrlBg = heroImage?.url ?? null;
            const daysWithExtras = await mapWithConcurrency(structuredItinerary.days || [], 3, async (day: any) => {
              const extras: Record<string, any> = {};
              const dayImg = await fetchDayImageWithFallback(day.imageQuery, destinationName);
              extras.dayImageUrl = dayImg ?? heroUrlBg;
              const dayPoints = globalMapPoints.filter(p => p.dayNum === day.dayNumber);
              if (dayPoints.length > 0) extras.mapPoints = dayPoints;
              return { ...day, ...extras };
            });

            await storage.updateItineraryMapPoints(finalItinId, daysWithExtras);

            const { DatabaseStorage } = await import("../storage-db");
            if (storage instanceof DatabaseStorage) {
              const { db } = await import("../db");
              const { itineraries } = await import("@shared/schema");
              const { eq } = await import("drizzle-orm");
              await db.update(itineraries).set({
                days: daysWithExtras,
                budgetSummary: structuredItinerary.budgetSummary,
                packingList: structuredItinerary.packingList,
                bestTime: structuredItinerary.bestTime,
                gettingThere: structuredItinerary.gettingThere,
                closingMessage: structuredItinerary.closingMessage,
                tripSummary: structuredItinerary.tripSummary ?? null,
                highlights: structuredItinerary.highlights ?? null,
                whyYours: whyYours ?? (structuredItinerary as any).whyYours ?? null,
                heroImageUrl: heroImage?.url ?? null,
                heroPhotographer: heroImage?.photographer ?? null,
                heroPhotographerUrl: heroImage?.photographerUrl ?? null,
                topAffiliateLinks: structuredItinerary.topAffiliateLinks ?? null,
              }).where(eq(itineraries.id, finalItinId));
            }

            recordRecentDestination(destinationName);
            recordPickSnapshot({ userId, profilingInput: input, destinationName, itineraryId: finalItinId });
            console.log(`Background structured itinerary completed for id ${finalItinId}`);
          } catch (bgErr) {
            console.error("Background structured generation error:", bgErr);
          }
        })();
      }
    } catch (err) {
      console.error("Narrative stream error:", err);
      try { send("error", { message: "Errore nella generazione." }); res.end(); } catch {}
    }
  });

  // STEP 3b — Genera itinerario con SSE streaming progress. Main path used by
  // Destinations.tsx. Images + map-points are computed synchronously before
  // `done` is sent; the background block at the end runs a wider geocoding
  // pass to enrich the map after the user already has the itinerary.
  app.post("/api/itinerary/generate-stream", itineraryLimiter, async (req, res) => {
    const { input, destinationName, destinationId, whyYours } = req.body;
    if (!input || !destinationName || !destinationId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      send("progress", { step: 1, message: "Analizzo il tuo profilo psicologico..." });
      const userIdForPrior = (req.user as any)?.id ?? null;
      const prior = await getTraitPriorForUser(userIdForPrior);
      const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
      const itinerary = await generateItineraryForDestination(input, destinationName, priorBlock);

      send("progress", { step: 2, message: "Cerco l'immagine perfetta per il tuo viaggio..." });
      const [heroImage] = await Promise.all([fetchUnsplashHero(destinationName)]);

      send("progress", { step: 3, message: "Costruisco la mappa dei luoghi..." });

      const destCenter = await geocode(destinationName);
      const destLat = destCenter?.lat ?? 0;
      const destLng = destCenter?.lng ?? 0;
      const city = destinationName.split(",")[0].trim();

      const tryGeocode = async (name: string): Promise<{ lat: number; lng: number } | null> => {
        const coords = await geocode(`${name} ${city}`);
        if (coords) {
          const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
          if (dist < 3) return coords;
        }
        return null;
      };

      send("progress", { step: 4, message: "Piazzo i punti sulla mappa..." });

      const geocodeCandidates: { name: string; slot: string; dayNum: number }[] = [];
      for (const day of (itinerary.days || [])) {
        if (day.affiliateLabels) {
          for (const [key, label] of Object.entries(day.affiliateLabels)) {
            const l = label as string;
            if (!l || l.length < 3 || /ristoranti\s/i.test(l)) continue;
            if (!geocodeCandidates.find(c => c.name === l)) {
              geocodeCandidates.push({ name: l, slot: SLOT_MAPPING[key] || "Mattina", dayNum: day.dayNumber });
            }
          }
        }
      }

      const top5 = geocodeCandidates.slice(0, 5);
      const geocodeResults = await Promise.all(
        top5.map(async (c) => {
          const coords = await tryGeocode(c.name);
          return coords ? { label: c.name, slot: c.slot, dayNum: c.dayNum, lat: coords.lat, lng: coords.lng } : null;
        })
      );
      const globalMapPoints = geocodeResults.filter(Boolean) as any[];

      const heroUrlStream = heroImage?.url ?? null;
      const daysWithExtras = await mapWithConcurrency(itinerary.days || [], 3, async (day: any) => {
        const extras: Record<string, any> = {};
        const dayImg = await fetchDayImageWithFallback(day.imageQuery, destinationName);
        extras.dayImageUrl = dayImg ?? heroUrlStream;
        const dayPoints = globalMapPoints.filter(p => p.dayNum === day.dayNumber);
        if (dayPoints.length > 0) extras.mapPoints = dayPoints;
        return { ...day, ...extras };
      });

      send("progress", { step: 5, message: "Quasi pronto, ultime rifiniture..." });

      const userId = (req as any).user?.id ?? null;
      const saved = await storage.createItinerary({
        destinationId,
        ...itinerary,
        days: daysWithExtras,
        whyYours: whyYours ?? (itinerary as any).whyYours ?? null,
        heroImageUrl: heroImage?.url ?? null,
        heroPhotographer: heroImage?.photographer ?? null,
        heroPhotographerUrl: heroImage?.photographerUrl ?? null,
        userId,
        createdAt: new Date().toISOString(),
      });

      send("done", { itineraryId: saved.id, destinationId });
      res.end();

      recordRecentDestination(destinationName);
      recordPickSnapshot({ userId, profilingInput: input, destinationName, itineraryId: saved.id });

      // Background: wider geocoding pass to enrich map after user has the itinerary
      (async () => {
        try {
          const candidates: { name: string; slot: string; dayNum: number }[] = [];
          for (const day of (itinerary.days || [])) {
            if (day.affiliateLabels) {
              for (const [key, label] of Object.entries(day.affiliateLabels)) {
                const l = label as string;
                if (!l || l.length < 3 || /ristoranti\s/i.test(l)) continue;
                if (!candidates.find(c => c.name === l)) {
                  candidates.push({ name: l, slot: SLOT_MAPPING[key] || "Mattina", dayNum: day.dayNumber });
                }
              }
            }
          }

          const top8 = candidates.slice(0, 8);
          const results = await Promise.all(
            top8.map(async (c) => {
              const coords = await geocode(`${c.name} ${city}`);
              if (!coords) return null;
              const dist = Math.sqrt(Math.pow(coords.lat - destLat, 2) + Math.pow(coords.lng - destLng, 2));
              if (dist > 3) return null;
              return { label: c.name, slot: c.slot, dayNum: c.dayNum, lat: coords.lat, lng: coords.lng };
            })
          );

          const validPoints = results.filter(Boolean) as any[];
          if (validPoints.length === 0) return;

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
    } catch (err) {
      console.error("Stream error:", err);
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Errore nella generazione dell'itinerario." })}\n\n`);
        res.end();
      } catch {}
    }
  });
}
