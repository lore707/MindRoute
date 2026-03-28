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

export const profilingInputs = pgTable("profiling_inputs", {
  id: serial("id").primaryKey(),
  input: jsonb("input").notNull(),
});

export const itineraries = pgTable("itineraries", {
  id: serial("id").primaryKey(),
  destinationId: integer("destination_id").references(() => destinations.id).notNull(),
  days: jsonb("days").$type<any[]>().notNull(),
  budgetSummary: text("budget_summary").notNull(),
  packingList: text("packing_list").notNull(),
  bestTime: text("best_time").notNull(),
  gettingThere: text("getting_there").notNull(),
  closingMessage: text("closing_message").notNull(),
  destinationName: text("destination_name"),
  tripSummary: text("trip_summary"),
  highlights: jsonb("highlights").$type<string[]>(),
  whyYours: text("why_yours"),
  heroImageUrl: text("hero_image_url"),
  heroPhotographer: text("hero_photographer"),
  heroPhotographerUrl: text("hero_photographer_url"),
  topAffiliateLinks: jsonb("top_affiliate_links").$type<Record<string, string>>(),
});

export const insertDestinationSchema = createInsertSchema(destinations).omit({ id: true });
export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

export const insertItinerarySchema = createInsertSchema(itineraries).omit({ id: true });
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type Itinerary = typeof itineraries.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const profilingRequestSchema = z.object({
  answers: z.array(z.string()),
  days: z.number(),
  leaveDate: z.string(),
  budget: z.string(),
  departure: z.string(),
  companions: z.string().optional(),
  constraints: z.string().optional(),
  travelStyle: z.string().optional(),
  lang: z.string().optional(),
});
export type ProfilingRequest = z.infer<typeof profilingRequestSchema>;
