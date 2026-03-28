import { db } from "./db";
import { destinations, itineraries, profilingInputs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "./storage";
import type { Destination, Itinerary, InsertDestination, InsertItinerary } from "@shared/schema";

export class DatabaseStorage implements IStorage {
  async getDestinations(): Promise<Destination[]> {
    return await db.select().from(destinations);
  }

  async getDestination(id: number): Promise<Destination | undefined> {
    const result = await db.select().from(destinations).where(eq(destinations.id, id));
    return result[0];
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    const result = await db.insert(destinations).values(destination).returning();
    return result[0];
  }

  async getItinerary(destinationId: number): Promise<Itinerary | undefined> {
    const result = await db.select().from(itineraries).where(eq(itineraries.destinationId, destinationId));
    return result[0];
  }

  async getItineraryById(id: number): Promise<Itinerary | undefined> {
    const result = await db.select().from(itineraries).where(eq(itineraries.id, id));
    return result[0];
  }

  async createItinerary(itinerary: InsertItinerary): Promise<Itinerary> {
    const result = await db.insert(itineraries).values(itinerary).returning();
    return result[0];
  }

  async updateItineraryMapPoints(id: number, updatedDays: any[]): Promise<void> {
    await db.update(itineraries).set({ days: updatedDays }).where(eq(itineraries.id, id));
  }

  async clearAll(): Promise<void> {
    await db.delete(itineraries);
    await db.delete(destinations);
    await db.delete(profilingInputs);
  }

  async saveProfilingInput(input: any): Promise<void> {
    await db.delete(profilingInputs);
    await db.insert(profilingInputs).values({ input });
  }

  async getProfilingInput(): Promise<any | undefined> {
    const result = await db.select().from(profilingInputs).orderBy(desc(profilingInputs.id)).limit(1);
    return result[0]?.input ?? undefined;
  }
}
