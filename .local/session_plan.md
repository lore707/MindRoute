# Objective
Refactor the profiling flow to support dual-path profiling (Path A: "Non so dove andare" / Path B: "Ho già un'idea") with 7 rebalanced questions per path (more chips, fewer open text), guided placeholders/hints for open text fields, and an enriched logistics form. Maintain current design style, dark mode, i18n (IT/EN), responsive layout. Update matching engine to handle new answer formats.

# Tasks

### T001: Update i18n translations
- **Blocked By**: []
- **Details**:
  - Add all new translation keys for:
    - Split choice screen (title, hint, path A card title+desc, path B card title+desc)
    - Path A questions (7): travel style chips, emotional need text, drains chips, images set A, slider, rejection text, distance chips
    - Path B questions (7): geography chips, trip type chips, specific desires text, images set B, slider, emotional need text, avoid chips
    - All new chip option labels (14 travel style, 10+ drains, geography zones, trip types, distance, emotions)
    - Image set B labels/subs (seaside terrace, colorful market, mountain trail, rainy café)
    - Guided hints and rich placeholders for text questions
    - Section labels for both paths
    - Updated intro text reflecting dual path
    - Enriched form: accommodation chips, food preference chips, physical effort chips, dietary chips + sidebar text
  - Keep existing form.*, analyze.*, micro.*, months.*, sidebar.*, landing.*, dest.*, itin.* keys
  - Files: `client/src/lib/i18n.tsx`
  - Acceptance: All new keys exist for both en/it, no missing translations

### T002: Rewrite Profiling.tsx with dual-path flow + enriched form
- **Blocked By**: [T001]
- **Details**:
  - Replace current intro overlay with split choice screen:
    - Two cards side by side: "Non so dove andare" (? icon), "Ho già un'idea" (map pin icon)
    - Keep butterfly watermark, decorative lines, same visual style as current intro
    - Clicking a card sets path and transitions to questions
  - Define two question arrays (pathA: 7q, pathB: 7q):
    - **Path A** (psychological):
      1. chips multi max 3: "3 parole per il tuo viaggio ideale" (14 options: Selvaggio, Silenzioso, Caotico, Intimo, Solitario, Rigenerante, Autentico, Lusso discreto, Spirituale, Festoso, Avventuroso, Romantico, Culturale, Esplorativo)
      2. text: "Cosa deve darti questo viaggio che la tua vita quotidiana non può?" (guided hint + rich placeholder)
      3. chips multi: "Cosa ti svuota quando viaggi?" (same drains list)
      4. images: set A (medina, nordic, temple, desert)
      5. slider: chaos tolerance (same)
      6. text optional: "Un posto che tutti raccomandano ma che non ti ha mai attirato?" (guided hint: "Cosa dice di te questo rifiuto?")
      7. chips single: "Quanto lontano vuoi andare?" (Vicino, Stesso continente, Lontano, Ovunque)
    - **Path B** (practical+emotional):
      1. chips single: "Dove vuoi andare?" (Vicino, Europa, Asia, Americhe, Africa/ME, Oceania)
      2. chips multi max 3: "Che tipo di viaggio?" (Cultura, Natura, Food, Beach, City, Off-grid, Road trip, Trekking, Wellness, Discovery)
      3. text optional: "Qualcosa di specifico che vuoi fare o vedere?" (guided)
      4. images: set B (seaside, market, trail, café)
      5. slider: chaos tolerance (same)
      6. text: "Cosa deve darti questo viaggio che la tua vita quotidiana non può?" (same guided text as A.Q2)
      7. chips multi: "Cosa vuoi evitare?" (drains subset)
  - Keep existing rendering for text/chips/images/slider question types
  - Keep sidebar, progress bar, micro-reactions, analyzing overlay
  - Save path choice as first element of answers array
  - Enrich logistics form with new chip groups:
    - Accommodation style (6 options), Food preference (5 options), Physical effort (4 options), Dietary needs (8 options multi)
    - Add between companions and constraints fields
    - Include in submission payload via expanded constraints or new fields
  - Maintain all mobile responsive classes
  - Files: `client/src/pages/Profiling.tsx`
  - Acceptance: Both paths work end-to-end, all question types render, form submits with enriched data

### T003: Update matching engine for new answer format
- **Blocked By**: [T002]
- **Details**:
  - answers[0] now contains path indicator ("path_a" or "path_b")
  - answers[1..7] contain the 7 question answers
  - For Path B: answers[1] contains geography preference → use for proximity scoring boost
  - For Path B: answers[2] contains trip type → add to keyword matching
  - Chip answers arrive as comma-separated strings → already handled by extractKeywords
  - Path A distance chip (answers[7]) → factor into proximity scoring
  - Add new keywords from chip options to destination catalog keyword matching
  - Include accommodation/food/effort from enriched form in scoring
  - Files: `server/matching-engine.ts`
  - Acceptance: Both path A and B submissions produce reasonable matches, enriched form data improves scoring
