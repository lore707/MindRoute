import type { Destination, Itinerary, InsertDestination, InsertItinerary, TraitSnapshot, InsertTraitSnapshot, SavedMoment, InsertSavedMoment } from "@shared/schema";

export interface IStorage {
  getDestinations(): Promise<Destination[]>;
  getDestination(id: number): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  getItinerary(destinationId: number): Promise<Itinerary | undefined>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;
  clearAll(): Promise<void>;
  saveProfilingInput(input: any): Promise<void>;
  getProfilingInput(): Promise<any | undefined>;
  getItineraryById(id: number): Promise<Itinerary | undefined>;
 updateItineraryMapPoints(id: number, updatedDays: any[]): Promise<void>;
  getUserItineraries(userId: number): Promise<any[]>;
  createTraitSnapshot(snapshot: InsertTraitSnapshot): Promise<TraitSnapshot>;
  getTraitSnapshots(userId: number): Promise<TraitSnapshot[]>;
  getSavedMoments(userId: number): Promise<SavedMoment[]>;
  createSavedMoment(row: InsertSavedMoment): Promise<SavedMoment>;
  deleteSavedMoment(userId: number, itineraryId: number, momentId: string): Promise<void>;
}

export class MemoryStorage implements IStorage {
  private destinations: Destination[] = [];
  private itineraries: Itinerary[] = [];
  private destIdCounter = 1;
  private itinIdCounter = 1;
  private profilingInput: any = null;

  async getDestinations(): Promise<Destination[]> {
    return this.destinations;
  }

  async getDestination(id: number): Promise<Destination | undefined> {
    return this.destinations.find(d => d.id === id);
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    const newDest: Destination = { ...destination, id: this.destIdCounter++ };
    this.destinations.push(newDest);
    return newDest;
  }

  async getItinerary(destinationId: number): Promise<Itinerary | undefined> {
    return this.itineraries.find(i => i.destinationId === destinationId);
  }

  async createItinerary(itinerary: InsertItinerary): Promise<Itinerary> {
    const newItin: Itinerary = { ...itinerary, id: this.itinIdCounter++ };
    this.itineraries.push(newItin);
    return newItin;
  }

  async clearAll(): Promise<void> {
    this.destinations = [];
    this.destIdCounter = 1;
  }

  async saveProfilingInput(input: any): Promise<void> {
    this.profilingInput = input;
  }

  async getProfilingInput(): Promise<any | undefined> {
    return this.profilingInput ?? undefined;
  }

  async getItineraryById(id: number): Promise<Itinerary | undefined> {
    return this.itineraries.find(i => i.id === id);
  }

async updateItineraryMapPoints(id: number, updatedDays: any[]): Promise<void> {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx >= 0) {
      this.itineraries[idx] = { ...this.itineraries[idx], days: updatedDays };
    }
  }

  async getUserItineraries(userId: number): Promise<any[]> {
    return this.itineraries.filter(i => (i as any).userId === userId);
  }

  private traitSnapshots: TraitSnapshot[] = [];
  private traitIdCounter = 1;
  async createTraitSnapshot(snapshot: InsertTraitSnapshot): Promise<TraitSnapshot> {
    const row: TraitSnapshot = {
      id: this.traitIdCounter++,
      createdAt: new Date(),
      sourceItineraryId: snapshot.sourceItineraryId ?? null,
      ...snapshot,
    } as TraitSnapshot;
    this.traitSnapshots.push(row);
    return row;
  }
  async getTraitSnapshots(userId: number): Promise<TraitSnapshot[]> {
    return this.traitSnapshots
      .filter(s => s.userId === userId)
      .sort((a, b) => +a.createdAt - +b.createdAt);
  }

  private savedMoments: SavedMoment[] = [];
  private savedMomentIdCounter = 1;
  async getSavedMoments(userId: number): Promise<SavedMoment[]> {
    return this.savedMoments
      .filter(s => s.userId === userId)
      .sort((a, b) => +b.createdAt - +a.createdAt);
  }
  async createSavedMoment(row: InsertSavedMoment): Promise<SavedMoment> {
    const saved: SavedMoment = {
      id: this.savedMomentIdCounter++,
      createdAt: new Date(),
      momentSnapshot: row.momentSnapshot ?? null,
      ...row,
    } as SavedMoment;
    this.savedMoments.push(saved);
    return saved;
  }
  async deleteSavedMoment(userId: number, itineraryId: number, momentId: string): Promise<void> {
    this.savedMoments = this.savedMoments.filter(s =>
      !(s.userId === userId && s.itineraryId === itineraryId && s.momentId === momentId)
    );
  }
}
import { DatabaseStorage } from "./storage-db";
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemoryStorage();
