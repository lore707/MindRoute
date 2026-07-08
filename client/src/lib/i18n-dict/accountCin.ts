/**
 * accountCin.ts — chiavi i18n per AccountCinematic, AccountAtlas e trait-labels.
 * Prefisso: "acin."
 * NON modificare i18n.tsx — questo file verrà cablato separatamente.
 * Finché non è cablato, t("acin.x") ritorna la chiave (comportamento
 * di fallback del provider).
 */
export const accountCinDict: Record<string, { en: string; it: string }> = {

  // ── Hero section ─────────────────────────────────────────────────────────
  "acin.hero.titleEm":          { en: "MindRoute.", it: "MindRoute." },
  "acin.hero.titlePre":         { en: ", your", it: ", il tuo" },

  // ── Profile fallback section (when portrait unavailable) ─────────────────
  "acin.profile.eyebrow":       { en: "Your traveller profile", it: "Il tuo profilo viaggiatore" },
  "acin.profile.traitsHead":    { en: "Your four traits", it: "I tuoi quattro tratti" },

  // ── Da riprendere section (Cap III) ──────────────────────────────────────
  "acin.cap3.eyebrow":          { en: "To revisit", it: "Da riprendere" },
  "acin.cap3.title.many":       { en: "{n} trips are waiting for you", it: "{n} viaggi ti aspettano" },
  "acin.cap3.title.one":        { en: "One trip is waiting for you", it: "Un viaggio ti aspetta" },
  "acin.cap3.titleEm":          { en: "halfway.", it: "a metà strada." },
  "acin.cap3.sub":              {
    en: "\"You stopped. The story isn't over.\"",
    it: "\"Ti eri fermato. La storia non è finita.\"",
  },
  "acin.cap3.lastOpened":       { en: "Last opened · {date}", it: "Ultimo aperto · {date}" },
  "acin.cap3.resume":           { en: "Resume the trip →", it: "Riprendi il viaggio →" },
  "acin.cap3.exploreOther":     { en: "Explore another", it: "Esplora un altro" },

  // ── Collezione section (Cap IV) ───────────────────────────────────────────
  "acin.cap4.eyebrow":          { en: "Your collection", it: "La tua collezione" },
  "acin.cap4.itineraries":      { en: "itineraries", it: "itinerari" },
  "acin.cap4.subDays":          { en: "· over {n} days dreamed", it: "· oltre {n} giorni di sogno" },
  "acin.cap4.searchPlaceholder":{ en: "Search destination…", it: "Cerca destinazione…" },
  "acin.cap4.cardOpen":         { en: "Open ↗", it: "Apri ↗" },
  "acin.cap4.empty":            { en: "No trips match the active filters.", it: "Nessun viaggio corrisponde ai filtri attivi." },

  // Duration filter labels (state values + button text)
  "acin.filter.all":            { en: "All", it: "Tutte" },
  "acin.filter.short":          { en: "≤3 days", it: "≤3 giorni" },
  "acin.filter.medium":         { en: "4–7 days", it: "4–7 giorni" },
  "acin.filter.long":           { en: "8+ days", it: "8+ giorni" },

  // Region filter labels (state values + button text)
  "acin.region.all":            { en: "All", it: "Tutti" },
  "acin.region.europe":         { en: "Europe", it: "Europa" },
  "acin.region.asia":           { en: "Asia", it: "Asia" },
  "acin.region.africa":         { en: "Africa", it: "Africa" },
  "acin.region.americas":       { en: "Americas", it: "Americhe" },
  "acin.region.oceania":        { en: "Oceania", it: "Oceania" },

  // ── Stats novelistic section (fallback when atlas not wired) ─────────────
  "acin.stats.eyebrow":         { en: "Your traveller by the numbers", it: "Il tuo viaggiatore in numeri" },
  "acin.stats.title":           { en: "{n} days spent <em>elsewhere</em>.", it: "{n} giorni passati <em>altrove</em>." },
  "acin.stats.sub":             {
    en: "A story told by the maps you've opened.",
    it: "Una storia raccontata dalle mappe che hai aperto.",
  },

  // ── Settings section ──────────────────────────────────────────────────────
  "acin.settings.eyebrow":      { en: "Settings", it: "Impostazioni" },
  "acin.settings.emailLabel":   { en: "Email", it: "Email" },
  "acin.settings.dangerText":   {
    en: "All set. Whenever you're ready, you can sign out or close the account.",
    it: "Tutto pronto. Quando vuoi, puoi uscire o chiudere l'account.",
  },
  "acin.settings.logout":       { en: "↗ Sign out", it: "↗ Esci" },
  "acin.settings.delete":       { en: "Delete account", it: "Elimina account" },

  // ── Atlas section (Cap V) ─────────────────────────────────────────────────
  "acin.atlas.eyebrow":         { en: "Chapter V · your atlas", it: "Capitolo V · il tuo atlante" },
  "acin.atlas.daysElsewhere":   { en: "spent elsewhere.", it: "passati altrove." },
  "acin.atlas.sub":             {
    en: "Every destination you've imagined, on one map. A story told by the places you've opened.",
    it: "Ogni meta che hai immaginato, su una sola mappa. Una storia raccontata dai luoghi che hai aperto.",
  },
  "acin.atlas.loading":         { en: "Drawing your map…", it: "Disegniamo la tua mappa…" },
  "acin.atlas.empty":           {
    en: "Your map will fill up as soon as you generate your first itinerary.",
    it: "La tua mappa si popolerà appena genererai il primo itinerario.",
  },
  "acin.atlas.stat.trips":      { en: "Trips", it: "Viaggi" },
  "acin.atlas.stat.days":       { en: "Days", it: "Giorni" },
  "acin.atlas.stat.dest.one":   { en: "Destination", it: "Meta" },
  "acin.atlas.stat.dest.many":  { en: "Destinations", it: "Mete" },
  "acin.atlas.stat.cont.one":   { en: "Continent", it: "Continente" },
  "acin.atlas.stat.cont.many":  { en: "Continents", it: "Continenti" },
  "acin.atlas.unlocated.one":   {
    en: "{n} destination not plotted on the map: {list}.",
    it: "{n} meta non posizionata sulla mappa: {list}.",
  },
  "acin.atlas.unlocated.many":  {
    en: "{n} destinations not plotted on the map: {list}.",
    it: "{n} mete non posizionate sulla mappa: {list}.",
  },
  // Popup strings (used in popupHtml — passed as lang-aware strings)
  "acin.atlas.popup.trip.one":  { en: "trip", it: "viaggio" },
  "acin.atlas.popup.trip.many": { en: "trips", it: "viaggi" },
  "acin.atlas.popup.day.one":   { en: "day", it: "giorno" },
  "acin.atlas.popup.day.many":  { en: "days", it: "giorni" },
  "acin.atlas.popup.openLink":  { en: "Open itinerary →", it: "Apri l'itinerario →" },

  // ── trait-labels.ts — candidate desc strings ──────────────────────────────
  "acin.trait.slowTravel.desc":         { en: "Low intensity · slow pace", it: "Bassa intensità · ritmo lento" },
  "acin.trait.spontaneous.desc":        { en: "Deciding as you go", it: "Decidere strada facendo" },
  "acin.trait.coastal.desc":            { en: "Sea & nature before the city", it: "Mare & natura prima della metropoli" },
  "acin.trait.cultureFirst.desc":       { en: "Museums, history, living cities", it: "Musei, storia, città vive" },
  "acin.trait.authentic.desc":          { en: "Local trattorias · no tourist traps", it: "Trattorie locali · no tourist trap" },
  "acin.trait.curated.desc":            { en: "Chooses well-known, well-kept places", it: "Sceglie luoghi noti e ben tenuti" },
  "acin.trait.soloSpirit.desc":         { en: "Seeks silence and introspection", it: "Cerca silenzio e introspezione" },
  "acin.trait.socialHeart.desc":        { en: "Seeks shared tables, people, life", it: "Cerca tavolate, persone, vita" },
  "acin.trait.adventure.desc":          { en: "Chooses discomfort worth remembering", it: "Sceglie scomodità che ricordi" },
  "acin.trait.comfortLover.desc":       { en: "Soft beds · curated experiences", it: "Letti morbidi · esperienze curate" },

  // Placeholder stubs
  "acin.trait.placeholder0.name": { en: "Profile forming", it: "Profilo in formazione" },
  "acin.trait.placeholder0.desc": { en: "More trips · more precision", it: "Più viaggi · più precisione" },
  "acin.trait.placeholder1.name": { en: "Trait pending", it: "Tratto in attesa" },
  "acin.trait.placeholder1.desc": { en: "Add an itinerary", it: "Aggiungi un itinerario" },
  "acin.trait.placeholder2.name": { en: "Weak signal", it: "Segnale debole" },
  "acin.trait.placeholder2.desc": { en: "More data needed for precision", it: "Servono più dati per essere precisi" },

  // ── AccountPortrait (Cap II "Il tuo ritratto") ────────────────────────────
  "acin.pt.eyebrow":            { en: "Chapter II · your portrait", it: "Capitolo II · il tuo ritratto" },
  "acin.pt.title.one":          { en: "After 1 trip,", it: "Dopo 1 viaggio," },
  "acin.pt.title.many":         { en: "After {n} trips,", it: "Dopo {n} viaggi," },
  "acin.pt.title2pre":          { en: "we know ", it: "sappiamo " },
  "acin.pt.title2em":           { en: "who you are", it: "chi sei" },
  "acin.pt.sub":                {
    en: "Not a score. An observation, written in human language, built only on what you actually chose.",
    it: "Non un punteggio. Un'osservazione, scritta in linguaggio umano, costruita solo su ciò che hai davvero scelto.",
  },
  "acin.pt.mark":               { en: "Your portrait", it: "Il tuo ritratto" },
  "acin.pt.who.one":            { en: "— for {name}, after 1 trip", it: "— per {name}, dopo 1 viaggio" },
  "acin.pt.who.many":           { en: "— for {name}, after {n} trips", it: "— per {name}, dopo {n} viaggi" },
  "acin.pt.evidencePin":        { en: "How we deduce it", it: "Da cosa lo deduciamo" },
  "acin.pt.evidenceBody":       { en: "The places you actually chose: {list}.", it: "Le mete che hai davvero scelto: {list}." },
  "acin.pt.conf.solid":         { en: "Distilled from {n} trips", it: "Sintetizzato da {n} viaggi" },
  "acin.pt.conf.forming":       { en: "A first portrait, refined with every trip", it: "Un primo ritratto, che si affina a ogni viaggio" },
  "acin.pt.conf.nascent":       { en: "We're still learning who you are — more trips, more precision", it: "Stiamo ancora imparando chi sei — più viaggi, più preciso" },
  "acin.pt.paradoxMark":        { en: "Your paradox", it: "Il tuo paradosso" },
  "acin.pt.revealedMark":       { en: "The revealing gap", it: "Lo scarto rivelatore" },
  "acin.pt.revealedPre":        { en: "In words you seek ", it: "A parole cerchi " },
  "acin.pt.revealedMid":        { en: ", but when choosing you go toward ", it: ", ma scegliendo vai verso " },
  "acin.pt.divider":            { en: "your words, and how they change", it: "le tue parole, e come cambiano" },
  "acin.pt.seekMark":           { en: "What you seek", it: "Cosa cerchi" },
  "acin.pt.avoidMark":          { en: "What drains you", it: "Cosa ti spegne" },
  "acin.pt.ownWords":           { en: "In your own words", it: "Con parole tue" },
  "acin.pt.evoMark":            { en: "How you're changing", it: "Come stai cambiando" },
  "acin.pt.dnaShow":            { en: "See your travel DNA", it: "Vedi il tuo DNA di viaggio" },
  "acin.pt.dnaHide":            { en: "Hide your travel DNA", it: "Nascondi il tuo DNA di viaggio" },
  "acin.pt.neutralAxis":        { en: "in balance", it: "in equilibrio" },
  "acin.pt.mag.lieve":          { en: "slight", it: "lieve" },
  "acin.pt.mag.chiaro":         { en: "clear", it: "chiaro" },
  "acin.pt.mag.forte":          { en: "strong", it: "forte" },
};
