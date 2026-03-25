import type { Destination, Itinerary, InsertDestination, InsertItinerary } from "@shared/schema";

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
}

// Current production behavior uses an in-memory store. This keeps the prototype simple,
// but data is lost on restart and each request cycle shares the same global state.
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

private profilingInput: any = null;

  async clearAll(): Promise<void> {
    this.destinations = [];
    this.itineraries = [];
    this.destIdCounter = 1;
    this.itinIdCounter = 1;
  }

async saveProfilingInput(input: any): Promise<void> {
    this.profilingInput = input;
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
  }

  async getProfilingInput(): Promise<any | undefined> {
    return this.profilingInput ?? undefined;
  }
}

// When moving to a real database-backed implementation, swap this export while
// keeping the IStorage interface stable for the rest of the application.
export const storage = new MemoryStorage();

