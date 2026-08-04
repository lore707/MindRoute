// Landing a 7 scene (riscrittura 2026-07-31 sul mockup) — prefisso "led.".
// I numeri di social proof NON stanno qui: arrivano reali da /api/stats.
// Regola di copy (doc 05): ogni scena apre con una verità, poi la risposta.
// Vietati (doc 00 #14, doc 06): "AI-powered", "best", "revolutionary",
// urgenza, FOMO, "no credit card required" e ogni cliché da marketing.
export const landingEdDict: Record<string, { en: string; it: string }> = {
  // ── Nav ─────────────────────────────────────────────────────────────────
  "led.nav.philosophy": { en: "Philosophy", it: "Filosofia" },
  "led.nav.how":        { en: "How it works", it: "Come funziona" },
  "led.nav.journeys":   { en: "Journeys", it: "Viaggi" },
  "led.nav.memory":     { en: "Memory", it: "Memoria" },
  "led.nav.cta":        { en: "Start your journey", it: "Inizia il viaggio" },

  // ── 01 · La domanda ─────────────────────────────────────────────────────
  "led.hero.eyebrow": { en: "Travel that starts with you", it: "Il viaggio comincia da te" },
  "led.hero.t1":      { en: "Not every destination is meant for", it: "Non ogni destinazione è fatta per" },
  "led.hero.t2":      { en: "everyone.", it: "tutti." },
  "led.hero.sub":     { en: "MindRoute builds journeys that reflect who you are, not just where you say you want to go.", it: "MindRoute costruisce viaggi che riflettono chi sei, non solo dove dici di voler andare." },
  "led.hero.cta":     { en: "Start your journey", it: "Inizia il viaggio" },
  "led.hero.noteT":   { en: "Seven questions.", it: "Sette domande." },
  "led.hero.noteS":   { en: "Less than two minutes.", it: "Meno di due minuti." },
  "led.hero.scroll":  { en: "Scroll to explore", it: "Scorri per scoprire" },

  // ── 02 · La verità ──────────────────────────────────────────────────────
  "led.truth.eyebrow":  { en: "How we choose today", it: "Come scegliamo oggi" },
  "led.truth.t1":      { en: "We all see", it: "Vediamo tutti" },
  "led.truth.t2":      { en: "the same places.", it: "gli stessi posti." },
  "led.truth.capLeft":  { en: "Millions of different people", it: "Milioni di persone diverse" },
  "led.truth.funnel":   { en: "The feed", it: "Il feed" },
  "led.truth.capRight": { en: "Always the same handful", it: "Sempre gli stessi posti" },
  "led.truth.figureAlt": { en: "Many different people funnelled through the feed toward the same handful of destinations", it: "Tante persone diverse incanalate dal feed verso la stessa manciata di destinazioni" },
  "led.truth.note":    { en: "Reels, TikToks, travel boards: the feed repeats the same places until they start to feel like ours.", it: "Reel, TikTok, board di viaggio: il feed ci ripete gli stessi posti finché non ci sembrano nostri." },

  // ── 03 · Chi viaggia ────────────────────────────────────────────────────
  "led.who.t1": { en: "Before asking where to go, we ask", it: "Prima di chiedere dove andare, chiediamo" },
  "led.who.t2": { en: "who", it: "chi" },
  "led.who.t3": { en: "is travelling.", it: "sta viaggiando." },
  "led.who.c1": { en: "Identity", it: "Identità" },
  "led.who.c2": { en: "Needs", it: "Bisogni" },
  "led.who.c3": { en: "Mood", it: "Momento" },
  "led.who.c4": { en: "Experiences", it: "Esperienze" },
  "led.who.c5": { en: "Destination", it: "Destinazione" },
  "led.who.c6": { en: "Journey", it: "Viaggio" },
  "led.who.n1": { en: "A different process.", it: "Un processo diverso." },
  "led.who.n2": { en: "A different kind of journey.", it: "Un viaggio diverso." },

  // ── 04 · La prova ───────────────────────────────────────────────────────
  "led.proof.eyebrow":    { en: "The proof", it: "La prova" },
  "led.proof.t1":         { en: "The same place.", it: "Lo stesso posto." },
  "led.proof.t2":         { en: "Two different journeys.", it: "Due viaggi diversi." },
  "led.proof.sub":        { en: "Same city, same four days, same budget. The only thing that changes is who is travelling.", it: "Stessa città, stessi quattro giorni, stesso budget. L'unica cosa che cambia è chi viaggia." },
  "led.proof.day":        { en: "Day", it: "Giorno" },
  "led.proof.disclaimer": { en: "Illustrative example — two synthetic profiles.", it: "Esempio illustrativo — due profili sintetici." },

  // ── 05 · La memoria ─────────────────────────────────────────────────────
  "led.mem.t1":         { en: "Your journey evolves", it: "Il tuo viaggio evolve" },
  "led.mem.t2":         { en: "with you.", it: "con te." },
  "led.mem.sub":        { en: "Every trip teaches us something. Every memory shapes what comes next — so the next suggestion is never the first one again.", it: "Ogni viaggio ci insegna qualcosa. Ogni ricordo dà forma al prossimo — così il consiglio successivo non è mai più il primo." },
  "led.mem.routeAlt":   { en: "A route connecting past journeys", it: "Una rotta che collega i viaggi passati" },
  "led.mem.disclaimer": { en: "Illustrative example — the profile moves with real trips, never with a single answer.", it: "Esempio illustrativo — il profilo si sposta con i viaggi veri, mai con una singola risposta." },

  // ── 06 · Il prodotto ────────────────────────────────────────────────────
  "led.app.t1":           { en: "All your journeys.", it: "Tutti i tuoi viaggi." },
  "led.app.t2":           { en: "In one place.", it: "In un posto solo." },
  "led.app.sub":          { en: "Your map. Your stories. Your next adventure — and the reason it was chosen for you.", it: "La tua mappa. Le tue storie. La tua prossima avventura — e il motivo per cui è stata scelta per te." },
  "led.app.cta":          { en: "Explore the experience", it: "Esplora l'esperienza" },
  "led.app.previewLabel": { en: "Product preview", it: "Anteprima del prodotto" },
  "led.app.navHome":      { en: "Home", it: "Home" },
  "led.app.navJournal":   { en: "Journal", it: "Diario" },
  "led.app.navMap":       { en: "Map", it: "Mappa" },
  "led.app.navRecs":      { en: "For you", it: "Per te" },
  "led.app.navProfile":   { en: "Profile", it: "Profilo" },
  "led.app.recsHead":     { en: "Your next recommendations", it: "I tuoi prossimi consigli" },
  "led.app.journalHead":  { en: "Your journey journal", it: "Il tuo diario di viaggio" },
  "led.app.match":        { en: "match", it: "affinità" },

  // ── 07 · L'inizio ───────────────────────────────────────────────────────
  "led.end.eyebrow": { en: "Your journey starts here", it: "Il tuo viaggio comincia qui" },
  "led.end.t1":      { en: "The world is waiting. Let's find", it: "Il mondo aspetta. Troviamo" },
  "led.end.t2":      { en: "your place in it.", it: "il tuo posto." },
  "led.end.cta":     { en: "Start your journey", it: "Inizia il viaggio" },

  // ── Numeri reali (/api/stats) ───────────────────────────────────────────
  "led.stats.itineraries":  { en: "itineraries created", it: "itinerari creati" },
  "led.stats.destinations": { en: "destinations explored", it: "destinazioni esplorate" },

  // ── Footer ──────────────────────────────────────────────────────────────
  "led.foot.product": { en: "Product", it: "Prodotto" },
  "led.foot.how":     { en: "How it works", it: "Come funziona" },
  "led.foot.start":   { en: "Start now", it: "Inizia ora" },
  "led.foot.company": { en: "Company", it: "Azienda" },
  "led.foot.privacy": { en: "Privacy policy", it: "Privacy" },
  "led.foot.contact": { en: "Contact", it: "Contatti" },
  "led.foot.follow":  { en: "Follow", it: "Seguici" },
};
