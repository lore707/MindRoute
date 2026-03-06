import { z } from 'zod';
import { insertDestinationSchema, insertItinerarySchema, profilingRequestSchema } from './schema';
import type { Destination, Itinerary } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  profiling: {
    submit: {
      method: 'POST' as const,
      path: '/api/profiling' as const,
      input: profilingRequestSchema,
      responses: {
        200: z.array(z.custom<Destination>()),
        400: errorSchemas.validation,
      },
    },
  },
  itinerary: {
    get: {
      method: 'GET' as const,
      path: '/api/itinerary/:destinationId' as const,
      responses: {
        200: z.custom<Itinerary>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProfilingInput = z.infer<typeof api.profiling.submit.input>;
export type ProfilingResponse = z.infer<typeof api.profiling.submit.responses[200]>;
export type ItineraryResponse = z.infer<typeof api.itinerary.get.responses[200]>;
