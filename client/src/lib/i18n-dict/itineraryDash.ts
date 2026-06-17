/**
 * itineraryDash.ts — chiavi i18n per ItineraryDashboard. Prefisso "itd.".
 * Riusa dove possibile le chiavi esistenti itin.* / itin.cin.* (fasce orarie,
 * arco narrativo, label di prenotazione, durata). Placeholder {x} interpolati
 * lato componente; i tag <em> via dangerouslySetInnerHTML dove indicato.
 */
export const itineraryDashDict: Record<string, { en: string; it: string }> = {
  // ── Sidebar ──────────────────────────────────────────────────────────────
  "itd.nav.overview": { en: "Overview", it: "Panoramica" },
  "itd.nav.days":     { en: "Days", it: "Giorni" },
  "itd.nav.map":      { en: "Map", it: "Mappa" },
  "itd.nav.practical":{ en: "Practical", it: "Pratica" },
  "itd.nav.missions": { en: "Book", it: "Prenota" },
  "itd.back":         { en: "Dashboard", it: "Dashboard" },

  // ── Topbar ───────────────────────────────────────────────────────────────
  "itd.tb.built":     { en: "Built", it: "Costruito" },
  "itd.tb.edit":      { en: "Customise", it: "Personalizza" },
  "itd.tb.booked":    { en: "booked", it: "prenotato" },

  // ── Overview hero ────────────────────────────────────────────────────────
  "itd.hero.kick":    { en: "Your MindRoute", it: "Il tuo MindRoute" },
  "itd.hero.titlePre":{ en: "Your trip to", it: "Il tuo viaggio a" },
  "itd.fact.days":    { en: "days", it: "giorni" },
  "itd.fact.day":     { en: "day", it: "giorno" },
  "itd.fact.stops":   { en: "stops", it: "tappe" },
  "itd.fact.stop":    { en: "stop", it: "tappa" },
  "itd.fact.moments": { en: "moments", it: "momenti" },
  "itd.fact.moment":  { en: "moment", it: "momento" },

  // ── Why ──────────────────────────────────────────────────────────────────
  "itd.why.eyebrow":  { en: "Why this place is yours", it: "Perché questo posto ti somiglia" },
  "itd.why.highlightsMark": { en: "What makes it special", it: "Cosa lo rende speciale" },
  "itd.arc.eyebrow":  { en: "The emotional arc", it: "L'arco emotivo" },

  // ── Days ─────────────────────────────────────────────────────────────────
  "itd.days.eyebrow": { en: "Day by day", it: "Giorno per giorno" },
  "itd.days.title":   { en: "<em>{n} days</em>, one story.", it: "<em>{n} giorni</em>, una storia." },
  "itd.days.titleOne":{ en: "<em>One day</em>, one story.", it: "<em>Un giorno</em>, una storia." },
  "itd.days.sub":     { en: "Tap a day to open it. Every moment is a real, bookable place.", it: "Tocca un giorno per aprirlo. Ogni momento è un luogo reale e prenotabile." },
  "itd.day.expand":   { en: "Open the day →", it: "Apri il giorno →" },
  "itd.day.tlKick":   { en: "The day's rhythm", it: "Il ritmo della giornata" },
  "itd.dd.prev":      { en: "Previous", it: "Precedente" },
  "itd.dd.next":      { en: "Next", it: "Successivo" },
  "itd.dd.moment":    { en: "Moment", it: "Momento" },
  "itd.dd.of":        { en: "of", it: "di" },
  "itd.dd.save":      { en: "Save this moment", it: "Salva questo momento" },

  // ── Map ──────────────────────────────────────────────────────────────────
  "itd.map.eyebrow":  { en: "The route", it: "Il percorso" },
  "itd.map.title":    { en: "Where you'll <em class='gold'>walk</em>.", it: "Dove <em class='gold'>camminerai</em>." },
  "itd.map.live":     { en: "Your route", it: "Il tuo percorso" },
  "itd.map.compact":  { en: "Stops within ~{km} km — most of it walkable (~{min} min on foot across the trip).", it: "Tappe in ~{km} km — quasi tutto a piedi (~{min} min di camminate in tutto il viaggio)." },
  "itd.map.spread":   { en: "Stops span ~{km} km — plan a few short hops between areas.", it: "Tappe in ~{km} km — metti in conto qualche breve spostamento tra le zone." },
  "itd.map.empty":    { en: "The map appears as soon as your stops are geolocated.", it: "La mappa appare appena le tue tappe vengono geolocalizzate." },
  "itd.map.legendStops": { en: "Your stops", it: "Le tue tappe" },

  // ── Practical ────────────────────────────────────────────────────────────
  "itd.prat.eyebrow": { en: "Practical", it: "Pratica" },
  "itd.prat.title":   { en: "Everything you need to <em>make it real</em>.", it: "Tutto per <em>renderlo reale</em>." },
  "itd.prat.budget":  { en: "Estimated budget", it: "Budget stimato" },
  "itd.prat.arrive":  { en: "Getting there", it: "Come arrivare" },
  "itd.prat.when":    { en: "Best time to go", it: "Periodo migliore" },
  "itd.prat.pack":    { en: "What to pack", it: "Cosa portare" },
  "itd.prat.total":   { en: "Total", it: "Totale" },
  "itd.prat.empty":   { en: "Practical details fill in as your itinerary is finalised.", it: "I dettagli pratici si completano man mano che l'itinerario viene finalizzato." },

  // ── Missions / booking ───────────────────────────────────────────────────
  "itd.mis.eyebrow":  { en: "Make it happen", it: "Rendilo reale" },
  "itd.mis.title":    { en: "Your booking <em>missions</em>.", it: "Le tue <em>missioni</em> di prenotazione." },
  "itd.mis.sub":      { en: "Tick each one off as you book. Everything is pre-filled for your trip.", it: "Spunta ognuna man mano che prenoti. Tutto è già impostato per il tuo viaggio." },
  "itd.mis.complete": { en: "complete", it: "completato" },
  "itd.mis.say0":     { en: "Nothing booked yet — start with the flight.", it: "Niente di prenotato — parti dal volo." },
  "itd.mis.say1":     { en: "Off you go. The hard part is starting.", it: "Sei partito. La parte difficile era iniziare." },
  "itd.mis.say2":     { en: "Halfway there. The trip is taking shape.", it: "A metà strada. Il viaggio prende forma." },
  "itd.mis.say3":     { en: "Almost ready. One or two missions to go.", it: "Quasi pronto. Una o due missioni e ci sei." },
  "itd.mis.sayK":     { en: "Progress", it: "Progresso" },
  "itd.mis.doneH":    { en: "All set. Have a wonderful trip.", it: "Tutto pronto. Buon viaggio." },
  "itd.mis.doneS":    { en: "Every mission complete — {dest} is waiting.", it: "Tutte le missioni completate — {dest} ti aspetta." },
  "itd.mis.book":     { en: "Book", it: "Prenota" },
  "itd.mis.done":     { en: "Done", it: "Fatto" },
  "itd.mis.reward":   { en: "unlocks the next step", it: "sblocca il passo dopo" },
  "itd.mis.rewardGot":{ en: "unlocked", it: "sbloccato" },
  // mission item names (the 5 checklist steps)
  "itd.mis.flight":     { en: "Book the flight", it: "Prenota il volo" },
  "itd.mis.flightMeta": { en: "Round trip, dates pre-filled", it: "Andata e ritorno, date già pronte" },
  "itd.mis.hotel":      { en: "Book the stay", it: "Prenota il soggiorno" },
  "itd.mis.hotelMeta":  { en: "Where you sleep sets the tone", it: "Dove dormi dà il tono al viaggio" },
  "itd.mis.experience": { en: "Book the main experience", it: "Prenota l'esperienza principale" },
  "itd.mis.experienceMeta": { en: "The one moment not to miss", it: "Il momento da non perdere" },
  "itd.mis.restaurant": { en: "Reserve the first dinner", it: "Prenota la prima cena" },
  "itd.mis.restaurantMeta": { en: "Arrive to a table already waiting", it: "Arriva con un tavolo già pronto" },
  "itd.mis.transfer":   { en: "Sort the transfer", it: "Sistema il transfer" },
  "itd.mis.transferMeta": { en: "Ferry, bus or car between stops", it: "Traghetto, bus o auto tra le tappe" },
  "itd.mis.day":        { en: "Day {n}", it: "Giorno {n}" },
  "itd.mis.providersH": { en: "All your booking links", it: "Tutti i tuoi link di prenotazione" },

  // ── Trip kit ─────────────────────────────────────────────────────────────
  "itd.kit.pdf":      { en: "Save as PDF", it: "Salva come PDF" },
  "itd.kit.pdfSub":   { en: "A printable keepsake", it: "Un ricordo stampabile" },
  "itd.kit.share":    { en: "Share", it: "Condividi" },
  "itd.kit.shareSub": { en: "A public read-only link", it: "Un link pubblico sola lettura" },
  "itd.kit.edit":     { en: "Customise", it: "Personalizza" },
  "itd.kit.editSub":  { en: "Tune the days to you", it: "Adatta i giorni a te" },
  "itd.kit.restart":  { en: "New trip", it: "Nuovo viaggio" },
  "itd.kit.restartSub": { en: "Start another route", it: "Inizia un'altra rotta" },
  "itd.kit.shared":   { en: "Link copied", it: "Link copiato" },

  // ── Affiliate group heads ────────────────────────────────────────────────
  "itd.prov.flights":     { en: "Flights", it: "Voli" },
  "itd.prov.stays":       { en: "Stays", it: "Alloggi" },
  "itd.prov.experiences": { en: "Experiences", it: "Esperienze" },
  "itd.prov.food":        { en: "Restaurants", it: "Ristoranti" },
  "itd.prov.transport":   { en: "Transport", it: "Trasporti" },
  "itd.affiliateNote":    { en: "Links may include affiliate commissions.", it: "I link potrebbero includere commissioni affiliate." },
};
