import type { Destination, Itinerary, InsertDestination, InsertItinerary } from "@shared/schema";

export interface IStorage {
  getDestinations(): Promise<Destination[]>;
  getDestination(id: number): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  getItinerary(destinationId: number): Promise<Itinerary | undefined>;
  createItinerary(itinerary: InsertItinerary): Promise<Itinerary>;
  clearAll(): Promise<void>;
}

export class MemoryStorage implements IStorage {
  private destinations: Destination[] = [];
  private itineraries: Itinerary[] = [];
  private destIdCounter = 1;
  private itinIdCounter = 1;

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
    this.itineraries = [];
    this.destIdCounter = 1;
    this.itinIdCounter = 1;
  }
}

export const storage = new MemoryStorage();
