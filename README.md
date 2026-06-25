# Handoff: Itinerary "Day‑by‑Day" — Essential Travel Features

## Overview
This handoff covers the upgrade of MindRoute's **day‑by‑day itinerary** view from a "nice to read" plan into an **indispensable in‑trip tool**. The base view is an **agenda / timeline** layout: each day is split into four fixed bands — **Mattina · Pranzo · Pomeriggio · Sera** — rendered as a vertical, scrollable timeline of "moment" cards (time · type · title · detail · metadata chips · booking CTA). This already exists in the reference file.

The work to implement is **8 features** that make the itinerary usable on the road (phone in hand, often with poor signal). They are prioritized: **P0 = build first** (booking status, transfers between moments, offline actions), **P1 = high value**, **P2 = nice to have**.

## About the Design Files
The file in this bundle (`Giorno per Giorno — Agenda.html`) is a **design reference created in HTML** — a working prototype that shows the intended look, structure, and behavior. It is **not production code to copy directly**.

The task is to **recreate this design in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.), using its established components, design tokens, routing, and data layer. If no front‑end environment exists yet, choose the most appropriate framework for the project and implement there. The HTML prototype uses inline React + Babel and local component state purely so it runs standalone in a browser — do not carry that approach into production.

## Fidelity
**High‑fidelity (hifi)** for everything that already exists in the prototype (the agenda layout, the four‑band structure, moment cards, the "Personalizza"/edit mode, day tabs, the photographic background and per‑day hero). Recreate these pixel‑accurately using the codebase's libraries, matching the design tokens listed below.

**Low‑fidelity (lofi) / spec‑only** for the **8 new features** described under *Features to Implement* — they are specified in words here (not yet drawn in the prototype). Implement them using the app's existing design system, following the visual language of the current moment card (chips, pill labels, the colored per‑band accent).

---

## Existing Design — Screens / Views

### View: Day‑by‑Day Agenda (single screen, day‑switchable)
- **Purpose**: The traveler reads and adjusts a single day at a time, top to bottom, like a real agenda.
- **Layout**: Single centered column, `max-width: 1000px`, page padding `30px 28px 90px`. Above the agenda, in order:
  1. **Masthead** — flex row, space‑between. Left: eyebrow + serif H1 + lede. Right: **Personalizza** toggle button.
  2. **Legend** — horizontal bar listing the 4 fixed bands with their color dots.
  3. **Day tabs** — 4‑column grid (`repeat(4, 1fr)`, `gap: 10px`); each tab shows day number, date, and an "act" label (Arrivo / Apice / Decantazione / Partenza).
  4. **Day header** — 2‑column grid (`1fr 300px`): left = eyebrow (day n + act badge) + serif H2 title + meta chips (date, weather, "N tappe · 4 fasce") + sub; right = **hero image** (194px tall, `border-radius: 16px`).
  5. **Agenda body** — the four bands.
- **Agenda body structure**: For each band (`mattina, pranzo, pomeriggio, sera`):
  - **Band head**: colored node dot + uppercase label + right‑aligned time range (first→last moment time).
  - **Moments rail**: a `border-left: 2px` vertical spine tinted with the band color; each moment card sits on it with a small dot connector (`::before`).
  - **Moment card** (`.ag-m`): surface `rgba(255,255,255,.035)`, `border: 1px solid rgba(255,255,255,.09)`, `border-radius: 13px`, padding `13px 16px`. Contents in order: top row (`time` tabular‑nums 15px 600 + `kind` pill), serif title 19px, detail 13px dim, metadata **chips**, optional italic serif **note**, optional **booking CTA** button.

### Mode: "Personalizza" (edit mode)
- Toggled by the masthead button (label flips **Personalizza ⇄ Fine**, turns accent‑red when active).
- In edit mode each moment card swaps its static content for inputs: **time** (80px, tabular), **kind** (130px), **title** (full‑width serif), **detail** (textarea). A **drag handle (⠿)** appears at the card's left edge for reordering within the band (HTML5 drag‑and‑drop; dragged card dims to .45, drop target gets a colored ring). Per‑card tools: **↻ Sostituisci** (opens an "Alternative" panel listing suggested swaps) and **✕ Rimuovi**. Each band ends with a dashed **+ Aggiungi una tappa** button. A right‑aligned **↺ Ripristina giorno** resets the day to defaults.
- Edits live in component state only (session‑scoped) in the prototype. **In production these must persist** (see State Management).

---

## Features to Implement

### P0 — build first

#### 1. Booking status per moment
- **What**: Every bookable moment carries an explicit status, not just a "Prenota" button.
- **States**: `da_prenotare` (Da prenotare) · `prenotato` (Prenotato) · `confermato` (Confermato). Optional `non_necessario` for free/walk‑in moments.
- **UI**: A status pill on the moment card top row (next to the `kind` pill). Suggested colors: Da prenotare = neutral/ghost outline; Prenotato = gold (`--gold #D4A853`); Confermato = teal (`--teal #6FB4A8`). When status ≥ prenotato, the card stores and shows: **confirmation number / voucher code** and **"intestato a" (name on booking)**. The "Prenota" CTA becomes "Vedi conferma" once confirmed.
- **Data**: `moment.booking = { status, ref, holder, provider, url }`.

#### 2. Transfer blocks between moments ("il collante logistico")
- **What**: Between two consecutive moments, render a compact **transfer micro‑block** on the timeline spine.
- **Content**: mode icon + duration + distance + a "leave‑by" hint, e.g. `🛵 15 min · 6 km · parti entro le 8:40`. The leave‑by is computed from the next moment's start time minus transfer duration.
- **UI**: Visually lighter than a moment card — inline on the spine, smaller text (`~12px`), muted color, no surface fill (or a very faint one). Not editable as a "moment"; derived from the gap between moments + a `transfer` field.
- **Data**: `moment.transferFromPrev = { mode, minutes, km }` (mode ∈ walk/scooter/car/boat/ferry/flight).

#### 3. Offline actions + action shortcuts
- **What**: Each moment exposes quick actions that work with poor/no signal.
- **Actions**:
  - **Apri in Mappe** — deep link to Google/Apple Maps for the moment's coordinates/place (works offline once map area is cached). `geo:` / `https://maps.apple.com/?ll=` / `https://www.google.com/maps/search/?api=1&query=`.
  - **Aggiungi al calendario** — generate an `.ics` event (title, start/end from time + duration, location, alarm reminder).
  - **Telefono** — `tel:` link for the taverna/operator (tap‑to‑call).
  - **Salva offline / PDF** — export the whole day (print‑to‑PDF or cached offline view).
- **UI**: A small action row (icon buttons) on the card, or an overflow "···" menu to avoid clutter. Booking CTA stays primary; these are secondary.
- **Data**: `moment.place = { name, lat, lng, mapQuery }`, `moment.phone`, `moment.durationMin`.
- **Offline**: target app should cache the itinerary (service worker / local store) so the day renders with no network.

### P1 — high value

#### 4. Time‑anchored practical info
- Surface, as compact contextual badges (not paragraphs): **alba/tramonto** (sunrise/sunset) for the day, **meteo** (already shown in header — extend per‑moment if relevant), **orari di apertura** (opening hours), and a per‑moment **"cosa portare"** (what to bring: e.g. scooter licence, contanti, scarpe da scoglio for Sarakiniko, acqua).
- **Data**: `day.sun = { rise, set }`, `moment.openingHours`, `moment.bring = [..]`.

#### 5. Money at a glance
- **Day total**: estimated **€ per person** shown in the day header meta row, summed from moment chip costs.
- **Prepaid vs cash‑on‑site** indicator per moment (Greek tavernas are frequently cash‑only). Small tag: `Prepagato` / `Contanti`.
- Optional trip‑wide **budget tracker**.
- **Data**: `moment.cost = { minPp, maxPp, payment: 'prepaid'|'cash' }`.

#### 6. Day map
- A **mini‑map** with pins for the day's moments and the route between them. Tapping a moment centers its pin; tapping a pin highlights the moment.
- Use the codebase's existing map library (Mapbox/Google/Apple). Lazy‑load; provide a static fallback image when offline.
- **Data**: relies on `moment.place.lat/lng`.

### P2 — nice to have

#### 7. Plan B / contingency
- Each key moment can carry a **contingency alternative** (bad weather, rough sea, closure) — e.g. "Se piove → …". This extends the existing **alts** array already present in the prototype; add a `reason` field (`weather`/`sea`/`closure`) and surface a subtle "Piano B" affordance.
- **Data**: `moment.alts[].reason`.

#### 8. Sharing / sync with travel companion
- **Condividi / sincronizza** the itinerary; show **who booked what**; shared **notes per moment**.
- Requires backend (auth, shared trip document, realtime or pull sync). Spec only — coordinate with the app's data layer.

---

## Interactions & Behavior
- **Day switching**: clicking a day tab swaps the agenda body and crossfades the background image (`opacity` transition `1.3s cubic-bezier(.4,0,.2,1)`) and the hero. Persist current day in the URL or local store.
- **Edit toggle**: flips all moment cards into input mode (see Mode above). No layout jump — inputs occupy the same card footprint.
- **Drag reorder**: HTML5 DnD within a band only; on drop, reorder the band's moment array. Dragged = `opacity .45`; valid drop target = colored ring (`box-shadow 0 0 0 2px <band color 38%>`).
- **Sostituisci**: opens an inline panel under the card listing `alts`; selecting one overwrites the moment's `kind/title/detail/chips` (keeps booking status reset to `da_prenotare`).
- **Add / remove / reset**: add appends a default moment to the band; remove filters it out; reset restores the day from canonical data.
- **Transitions**: background/hero crossfade as above. Keep motion subtle; respect `prefers-reduced-motion`.
- **Responsive**: ≤740px → day tabs become 2‑col, day header collapses to single column with hero moved above text (`order:-1`, height 160px), masthead H1 24px.

## State Management
- `days[]` — canonical itinerary data (fetch from API in production).
- `currentDay` — selected day number (persist in URL/local store).
- `editing` — boolean edit mode.
- `drag` / `over` — transient DnD state (source + hover target).
- `swapOpen` — which moment's alternatives panel is open.
- **Per‑moment mutable fields** that must persist server‑side in production: `time, kind, title, detail, chips, booking{status,ref,holder}, notes, order`.
- The prototype keeps edits in session state only and intentionally does **not** persist the full day (to avoid stale data). Production must persist edits to the trip document and sync (feature 8).

## Design Tokens
Colors:
- `--bg-deep: #0d070d` (page base, under photo background)
- `--ink: #fbf5f0` · `--ink-dim: rgba(251,245,240,.78)` · `--ink-faint: rgba(251,245,240,.5)` · `--ink-ghost: rgba(251,245,240,.32)`
- `--accent: #E94560` (primary / Pomeriggio band / active states) · `--accent-soft: rgba(233,69,96,.16)`
- `--gold: #D4A853` (Mattina band) · `--teal: #6FB4A8` (Pranzo band) · `--peri: #9B8CE0` (Sera band)
- `--stroke: rgba(255,255,255,.09)` · `--stroke-strong: rgba(255,255,255,.2)`
- `--surf: rgba(255,255,255,.035)` · `--surf-2: rgba(255,255,255,.05)`

Band → color map: Mattina = gold · Pranzo = teal · Pomeriggio = accent red · Sera = peri (violet). Each band/card sets a local `--pc` (part color) used for node dot, spine, kind pill, drop‑target ring.

Typography:
- Serif (titles): **Playfair Display** — H1 30px/600, day H2 32px/600 (‑.01em), moment title 19px/700, italic notes.
- Sans (UI/body): **DM Sans** — lede/detail 13px, chips 12px, labels uppercase 10–12px with `.13–.26em` letter‑spacing.
- Numbers (times, ranges, money): `font-variant-numeric: tabular-nums`.

Radii: cards 13px, hero/blocks 16px, chips/pills 8px, fully‑round dots/pills 99px.
Shadows: hero `0 26px 64px -30px rgba(0,0,0,.85)`; primary button `0 8px 20px -10px var(--accent)`.
Background: fixed full‑bleed photo per day, scrim = vertical dark gradient + two radial brand tints; subtle SVG grain overlay at `opacity .06`, `mix-blend-mode: overlay`.

## Assets
- **Photography**: per‑day background + hero use Unsplash images (royalty‑free) referenced by URL in the prototype. **Replace with the app's own licensed travel imagery / CDN** in production — do not ship Unsplash hotlinks. Each day needs one landscape image (recommended ≥1600px wide).
- **Icons**: prototype uses Unicode glyphs (⠿ drag, ✎ edit, ↻ ↺ ✕ ↗ ·). Replace with the codebase's icon set. Transfer modes need: walk, scooter, car, boat/ferry, flight icons.
- **Fonts**: Playfair Display + DM Sans (Google Fonts). Use the app's existing equivalents if it already has a serif display + sans pairing.

## Files
- `Giorno per Giorno — Agenda.html` — the hi‑fi reference prototype (agenda layout, four‑band structure, moment cards, Personalizza/edit mode, day tabs, photographic background + per‑day hero). All existing visuals and the data shape can be lifted from here.
