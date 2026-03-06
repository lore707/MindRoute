import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whyYours: text("why_yours").notNull(),
  experiencePreview: text("experience_preview").notNull(),
  practicalInfo: text("practical_info").notNull(),
  imageUrl: text("image_url"),
});

export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  destinationId: integer("destination_id").references(() => destinations.id).notNull(),
  days: jsonb("days").$type<Array<{
    dayNumber: number;
    title: string;
    morning: string;
    lunch: string;
    afternoon: string;
    evening: string;
  }>>().notNull(),
  budgetSummary: text("budget_summary").notNull(),
  packingList: text("packing_list").notNull(),
  bestTime: text("best_time").notNull(),
  gettingThere: text("getting_there").notNull(),
  closingMessage: text("closing_message").notNull(),
});

export const insertDestinationSchema = createInsertSchema(destinations).omit({ id: true });
export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

export const insertItinerarySchema = createInsertSchema(itineraries).omit({ id: true });
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type Itinerary = typeof itineraries.$inferSelect;

export const profilingRequestSchema = z.object({
  answers: z.array(z.string()),
  days: z.number(),
  leaveDate: z.string(),
  budget: z.string(),
  departure: z.string(),
  companions: z.string().optional(),
  constraints: z.string().optional(),
});
export type ProfilingRequest = z.infer<typeof profilingRequestSchema>;
