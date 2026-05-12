import type { Express } from "express";
import type { Server } from "http";
import { registerProfilingRoutes } from "./routes/profiling";
import { registerItineraryGenRoutes } from "./routes/itinerary-gen";
import { registerItineraryDetailRoutes } from "./routes/itinerary-detail";
import { registerMiscRoutes } from "./routes/misc";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerProfilingRoutes(app);
  registerItineraryGenRoutes(app);
  registerItineraryDetailRoutes(app);
  registerMiscRoutes(app);
  return httpServer;
}
