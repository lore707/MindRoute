import type { Express } from "express";
import type { Server } from "http";
import { registerProfilingRoutes } from "./routes/profiling";
import { registerItineraryGenRoutes } from "./routes/itinerary-gen";
import { registerItineraryGenV2Routes } from "./routes/itinerary-gen-v2";
import { registerItineraryDetailRoutes } from "./routes/itinerary-detail";
import { registerMiscRoutes } from "./routes/misc";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerProfilingRoutes(app);
  registerItineraryGenRoutes(app);
  registerItineraryGenV2Routes(app);
  registerItineraryDetailRoutes(app);
  registerMiscRoutes(app);
  return httpServer;
}
