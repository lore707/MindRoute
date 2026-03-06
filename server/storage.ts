import { db } from "./db";
import { destinations, itineraries } from "@shared/schema";
import type { Destination, Itinerary, InsertDestination, InsertItinerary } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getDestinations(): Promise<Destination[]>;
  getDestination(id: number): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  getItinerary(destinationId: number): Promise<Itinerary | undefined>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;
  clearAll(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDestinations(): Promise<Destination[]> {
    return await db.select().from(destinations);
  }

  async getDestination(id: number): Promise<Destination | undefined> {
    const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
    return dest;
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    const [newDest] = await db.insert(destinations).values(destination).returning();
    return newDest;
  }

  async getItinerary(destinationId: number): Promise<Itinerary | undefined> {
    const [itin] = await db.select().from(itineraries).where(eq(itineraries.destinationId, destinationId));
    return itin;
  }

  async createItinerary(itinerary: InsertItinerary): Promise<Itinerary> {
    const [newItin] = await db.insert(itineraries).values(itinerary).returning();
    return newItin;
  }

  async clearAll(): Promise<void> {
    await db.delete(itineraries);
    await db.delete(destinations);
  }
}

export const storage = new DatabaseStorage();
