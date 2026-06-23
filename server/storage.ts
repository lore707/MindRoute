import type { Destination, Itinerary, InsertDestination, InsertItinerary, TraitSnapshot, InsertTraitSnapshot, SavedMoment, InsertSavedMoment, Conversation, InsertConversation, ChatMessage, InsertChatMessage } from "@shared/schema";

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
  getItineraryByPublicToken(token: string): Promise<Itinerary | undefined>;
  setItineraryPublicToken(id: number, token: string): Promise<void>;
 updateItineraryMapPoints(id: number, updatedDays: any[]): Promise<void>;
  updateItineraryTrip(id: number, updatedDays: any[], tripMeta: any): Promise<void>;
  getUserItineraries(userId: number): Promise<any[]>;
  createTraitSnapshot(snapshot: InsertTraitSnapshot): Promise<TraitSnapshot>;
  getTraitSnapshots(userId: number): Promise<TraitSnapshot[]>;
  getSavedMoments(userId: number): Promise<SavedMoment[]>;
  createSavedMoment(row: InsertSavedMoment): Promise<SavedMoment>;
  deleteSavedMoment(userId: number, itineraryId: number, momentId: string): Promise<void>;
  // Travel companion chat
  getConversationForItinerary(userId: number, itineraryId: number): Promise<Conversation | undefined>;
  getConversationsForUser(userId: number): Promise<Conversation[]>;
  createConversation(row: InsertConversation): Promise<Conversation>;
  touchConversation(id: number): Promise<void>;
  getMessages(conversationId: number): Promise<ChatMessage[]>;
  addMessage(row: InsertChatMessage): Promise<ChatMessage>;
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
    const newDest: Destination = {
      ...destination,
      id: this.destIdCounter++,
      imageUrl: destination.imageUrl ?? null,
      slotRole: destination.slotRole ?? null,
      tagline: destination.tagline ?? null,
    };
    this.destinations.push(newDest);
    return newDest;
  }

  async getItinerary(destinationId: number): Promise<Itinerary | undefined> {
    return this.itineraries.find(i => i.destinationId === destinationId);
  }

  async createItinerary(itinerary: InsertItinerary): Promise<Itinerary> {
    const newItin = { ...itinerary, id: this.itinIdCounter++ } as Itinerary;
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

  async getItineraryByPublicToken(token: string): Promise<Itinerary | undefined> {
    return this.itineraries.find(i => (i as any).publicToken === token);
  }

  async setItineraryPublicToken(id: number, token: string): Promise<void> {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx >= 0) this.itineraries[idx] = { ...this.itineraries[idx], publicToken: token } as Itinerary;
  }

async updateItineraryMapPoints(id: number, updatedDays: any[]): Promise<void> {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx >= 0) {
      this.itineraries[idx] = { ...this.itineraries[idx], days: updatedDays };
    }
  }

  async updateItineraryTrip(id: number, updatedDays: any[], tripMeta: any): Promise<void> {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx >= 0) {
      this.itineraries[idx] = { ...this.itineraries[idx], days: updatedDays, tripMeta };
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

  private conversations: Conversation[] = [];
  private conversationIdCounter = 1;
  private chatMessages: ChatMessage[] = [];
  private chatMessageIdCounter = 1;
  async getConversationForItinerary(userId: number, itineraryId: number): Promise<Conversation | undefined> {
    return this.conversations.find(c => c.userId === userId && c.itineraryId === itineraryId);
  }
  async getConversationsForUser(userId: number): Promise<Conversation[]> {
    return this.conversations
      .filter(c => c.userId === userId)
      .sort((a, b) => +b.lastMessageAt - +a.lastMessageAt);
  }
  async createConversation(row: InsertConversation): Promise<Conversation> {
    const now = new Date();
    const conv: Conversation = {
      ...row,
      id: this.conversationIdCounter++,
      createdAt: now,
      lastMessageAt: now,
      title: row.title ?? null,
      itineraryId: row.itineraryId ?? null,
    } as Conversation;
    this.conversations.push(conv);
    return conv;
  }
  async touchConversation(id: number): Promise<void> {
    const idx = this.conversations.findIndex(c => c.id === id);
    if (idx >= 0) this.conversations[idx] = { ...this.conversations[idx], lastMessageAt: new Date() };
  }
  async getMessages(conversationId: number): Promise<ChatMessage[]> {
    return this.chatMessages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => +a.createdAt - +b.createdAt);
  }
  async addMessage(row: InsertChatMessage): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: this.chatMessageIdCounter++,
      createdAt: new Date(),
      ...row,
    } as ChatMessage;
    this.chatMessages.push(msg);
    return msg;
  }
}
import { DatabaseStorage } from "./storage-db";
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemoryStorage();
