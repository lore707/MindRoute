import { db } from "./db";
import { destinations, itineraries, profilingInputs, traitSnapshots, savedMoments } from "@shared/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import type { IStorage } from "./storage";
import type { Destination, Itinerary, InsertDestination, InsertItinerary, TraitSnapshot, InsertTraitSnapshot, SavedMoment, InsertSavedMoment } from "@shared/schema";

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
    const result = await db.insert(itineraries).values(itinerary as any).returning();
    return result[0];
  }

  async updateItineraryMapPoints(id: number, updatedDays: any[]): Promise<void> {
    await db.update(itineraries).set({ days: updatedDays }).where(eq(itineraries.id, id));
  }

  async clearAll(): Promise<void> {
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

  async getUserItineraries(userId: number): Promise<Itinerary[]> {
    return await db.select().from(itineraries).where(eq(itineraries.userId, userId)).orderBy(desc(itineraries.id));
  }

  async createTraitSnapshot(snapshot: InsertTraitSnapshot): Promise<TraitSnapshot> {
    const result = await db.insert(traitSnapshots).values(snapshot).returning();
    return result[0];
  }

  async getTraitSnapshots(userId: number): Promise<TraitSnapshot[]> {
    return await db.select().from(traitSnapshots)
      .where(eq(traitSnapshots.userId, userId))
      .orderBy(asc(traitSnapshots.createdAt));
  }

  async getSavedMoments(userId: number): Promise<SavedMoment[]> {
    return await db.select().from(savedMoments)
      .where(eq(savedMoments.userId, userId))
      .orderBy(desc(savedMoments.createdAt));
  }

  async createSavedMoment(row: InsertSavedMoment): Promise<SavedMoment> {
    const result = await db.insert(savedMoments).values(row).returning();
    return result[0];
  }

  async deleteSavedMoment(userId: number, itineraryId: number, momentId: string): Promise<void> {
    await db.delete(savedMoments).where(and(
      eq(savedMoments.userId, userId),
      eq(savedMoments.itineraryId, itineraryId),
      eq(savedMoments.momentId, momentId),
    ));
  }
}
