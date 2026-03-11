# MindRoute Development Notes

## Runtime flow
- `client/src/pages/Landing.tsx`: landing page
- `client/src/pages/Profiling.tsx`: questionnaire and logistics form
- `client/src/pages/Destinations.tsx`: destination selection screen
- `client/src/pages/Itinerary.tsx`: itinerary view
- `server/routes.ts`: API endpoints used by the client
- `server/matching-engine.ts`: AI prompt, model call, response parsing
- `server/storage.ts`: current runtime persistence (in-memory)

## Profiling page structure
- `client/src/pages/Profiling.tsx`: main page orchestration and view state
- `client/src/pages/profiling/questions.ts`: translated question definitions and helper content
- `client/src/pages/profiling/types.ts`: shared profiling question types
- `client/src/pages/profiling/AnalyzingScreen.tsx`: loading screen shown while destinations are being generated
- `client/src/pages/profiling/FormChip.tsx`: chip-style form button
- `client/src/pages/profiling/SliderTrack.tsx`: custom slider control

## Debugging checklist
1. If profiling completes but no destinations appear, inspect `client/src/pages/Profiling.tsx` and `client/src/hooks/use-profiling.ts`.
2. If API logs look fine but UI breaks, inspect the payload shape returned by `server/matching-engine.ts`.
3. If AI output changes unexpectedly, validate prompt changes and `parseModelResponse()` in `server/matching-engine.ts`.
4. If itinerary data disappears between requests, remember that `server/storage.ts` is currently in-memory only.

## Deployment notes
- Render build/start behavior is configured in `render.yaml`.
- Frontend and backend are bundled together from the same repo.
- Required runtime keys should be checked on Render before debugging UI behavior.
