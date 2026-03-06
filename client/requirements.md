## Packages
framer-motion | Complex page transitions and micro-interactions for the questionnaire
lucide-react | Icons for the UI (already in base, but emphasizing usage)
wouter | Routing (already in base)
zod | Schema validation (already in base)
clsx | Class name utility (already in base)
tailwind-merge | Class name utility (already in base)

## Notes
The application follows a 4-step flow: Landing -> Profiling -> Destinations -> Itinerary.
Profiling involves a multi-step questionnaire followed by a final form.
API endpoints:
- POST /api/profiling (Submit answers, get destinations)
- GET /api/itinerary/:destinationId (Get specific itinerary)
Images will be sourced from Unsplash for destinations.
