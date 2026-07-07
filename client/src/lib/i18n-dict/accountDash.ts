/**
 * accountDash.ts — chiavi i18n per AccountDashboard (la nuova dashboard
 * principale dell'utente loggato). Prefisso: "acd."
 * Le stringhe possono contenere placeholder {n} {d} {m} {name} {word}
 * interpolati lato componente (helper `tx`). I tag <em>…</em> sono renderizzati
 * via dangerouslySetInnerHTML dove indicato.
 */
export const accountDashDict: Record<string, { en: string; it: string }> = {
  // ── Sidebar ──────────────────────────────────────────────────────────────
  "acd.nav.home":      { en: "Home",     it: "Home" },
  "acd.nav.resume":    { en: "Resume",   it: "Riprendi" },
  "acd.nav.portrait":  { en: "Portrait", it: "Ritratto" },
  "acd.nav.trips":     { en: "Trips",    it: "Viaggi" },
  "acd.nav.atlas":     { en: "Atlas",    it: "Atlante" },
  "acd.settings":      { en: "Settings", it: "Impostazioni" },

  // ── Topbar ───────────────────────────────────────────────────────────────
  "acd.tb.search":     { en: "Search your trips, places, memories…", it: "Cerca tra i tuoi viaggi, mete, ricordi…" },
  "acd.tb.fromProfile":{ en: "✦ Generate from profile", it: "✦ Genera dal profilo" },
  "acd.tb.newItin":    { en: "+ New itinerary", it: "+ Nuovo itinerario" },
  "acd.newItin":       { en: "New itinerary", it: "Nuovo itinerario" },

  // ── Hero ─────────────────────────────────────────────────────────────────
  "acd.hero.greeting": { en: "Welcome back,", it: "Bentornato," },
  "acd.hero.sub":      { en: "Here's your <em>MindRoute</em> — everything in its place, today.", it: "Ecco la tua <em>MindRoute</em> — tutto al suo posto, oggi." },
  "acd.hero.resumeCta":{ en: "Resume {name} →", it: "Riprendi {name} →" },

  // ── Common ───────────────────────────────────────────────────────────────
  "acd.back":          { en: "Home", it: "Home" },
  "acd.open":          { en: "Open the itinerary →", it: "Apri l'itinerario →" },
  "acd.seeAll":        { en: "See all →", it: "Vedi tutti →" },

  // ── Home · next / resume teaser ─────────────────────────────────────────
  "acd.next.k":        { en: "Pick up where you left off", it: "Riprendi dove eri" },
  "acd.next.meta":     { en: "Last opened · {date}", it: "Ultimo aperto · {date}" },

  // ── Home · daily pick (genera dal profilo) ──────────────────────────────
  "acd.pick.eyebrow":  { en: "Made for you, today", it: "Suggerito per te, oggi" },
  "acd.pick.title":    { en: "A new trip, <em>read from who you are</em>.", it: "Un nuovo viaggio, <em>letto da chi sei</em>." },
  "acd.pick.tag":      { en: "From your profile", it: "Scelto dal tuo profilo" },
  "acd.pick.meta":     { en: "No quiz · straight from your travel DNA", it: "Niente quiz · dal tuo DNA di viaggio" },
  "acd.pick.name":     { en: "Generate from your profile", it: "Genera dal tuo profilo" },
  "acd.pick.whyK":     { en: "Why it fits you", it: "Perché è per te" },
  "acd.pick.whyFallback": { en: "We start from how you travel — your rhythm, your places, your kind of silence — and turn it into three destinations.", it: "Partiamo da come viaggi — il tuo ritmo, i tuoi posti, il tuo tipo di silenzio — e lo trasformiamo in tre destinazioni." },
  "acd.pick.cta":      { en: "Generate from my profile →", it: "Genera dal mio profilo →" },
  "acd.pick.ctaAlt":   { en: "Start the quiz →", it: "Inizia il quiz →" },
  "acd.pick.ghost":    { en: "Browse my trips", it: "Sfoglia i miei viaggi" },

  // ── Home · daily pick reale (meta dal catalogo, coerenza-vettori) ───────
  "acd.pick.realTag":  { en: "A place that's you", it: "Una meta che ti somiglia" },
  "acd.pick.realCta":  { en: "Generate a trip like this →", it: "Genera un viaggio così →" },

  // ── Home · empty state (0 viaggi) ───────────────────────────────────────
  "acd.empty.eyebrow": { en: "Welcome to MindRoute", it: "Benvenuto su MindRoute" },
  "acd.empty.title":   { en: "Your first trip <em>starts with you</em>.", it: "Il tuo primo viaggio <em>parte da te</em>." },
  "acd.empty.sub":     { en: "Answer 7 questions about who you are — not about places. We turn them into a destination, a day-by-day itinerary, and bookings ready to go.", it: "Rispondi a 7 domande su chi sei — non sui luoghi. Le trasformiamo in una destinazione, un itinerario giorno per giorno e prenotazioni pronte." },
  "acd.empty.step1":   { en: "Answer 7 questions about you", it: "Rispondi a 7 domande su di te" },
  "acd.empty.step2":   { en: "Get 3 destinations chosen by feeling", it: "Ricevi 3 mete scelte per come ti senti" },
  "acd.empty.step3":   { en: "A day-by-day plan, ready to book", it: "Un piano giorno per giorno, pronto da prenotare" },
  "acd.empty.cta":     { en: "Start the quiz →", it: "Inizia il quiz →" },

  // ── Home · completa le prenotazioni ─────────────────────────────────────
  "acd.book.eyebrow":  { en: "Finish booking", it: "Completa le prenotazioni" },
  "acd.book.title":    { en: "<em>Ready</em> to book.", it: "<em>Pronti</em> da prenotare." },
  "acd.book.progress": { en: "{n}/{tot} booked", it: "{n}/{tot} prenotato" },
  "acd.book.cta":      { en: "Finish →", it: "Completa →" },

  // ── Home · mood ─────────────────────────────────────────────────────────
  "acd.mood.title":    { en: "Start <em>from a mood</em>.", it: "Inizia <em>dall'umore</em>." },
  "acd.mood.hint":     { en: "Not sure where to go? Start from how you feel.", it: "Non sai dove andare? Parti da come ti senti." },
  "acd.mood.1":        { en: "I need to switch off", it: "Ho bisogno di staccare" },
  "acd.mood.2":        { en: "I want real nature", it: "Voglio natura vera" },
  "acd.mood.3":        { en: "Surprise me", it: "Sorprendimi" },

  // ── Home · pointers ─────────────────────────────────────────────────────
  "acd.point.portraitK": { en: "Your portrait", it: "Il tuo ritratto" },
  "acd.point.atlasK":    { en: "Your atlas", it: "Il tuo atlante" },
  "acd.point.atlasV":    { en: "<em class='gold'>{m} {mu}</em>, {d} {du} {tv}.", it: "<em class='gold'>{m} {mu}</em>, {d} {du} {tv}." },
  "acd.point.portraitFallback": { en: "Your traveller profile takes shape with every trip.", it: "Il tuo profilo viaggiatore prende forma a ogni viaggio." },

  // ── Resume view ─────────────────────────────────────────────────────────
  "acd.resume.eyebrow":{ en: "To resume", it: "Da riprendere" },
  "acd.resume.title":  { en: "Waiting for you <em>halfway through</em>.", it: "Ti aspettano <em>a metà strada</em>." },
  "acd.resume.sub":    { en: "The itineraries you opened and saved. Pick up right where you left off.", it: "Gli itinerari che hai aperto e salvato. Riprendi da dove eri." },
  "acd.resume.badge":  { en: "Last opened · {date}", it: "Ultimo aperto · {date}" },
  "acd.resume.continue": { en: "Keep exploring", it: "Continua a esplorare" },
  "acd.resume.savedEyebrow": { en: "Saved", it: "Salvati" },
  "acd.resume.savedTitleMany": { en: "Another <em>{n} open</em>.", it: "Altri <em>{n} aperti</em>." },
  "acd.resume.savedTitleOne":  { en: "One more <em>open</em>.", it: "Un altro <em>aperto</em>." },
  "acd.resume.empty":  { en: "Nothing to resume yet — every itinerary you build lands here.", it: "Niente da riprendere, per ora — ogni itinerario che costruisci finisce qui." },

  // ── Portrait view ───────────────────────────────────────────────────────
  "acd.portrait.eyebrow":  { en: "Your portrait", it: "Il tuo ritratto" },
  "acd.portrait.titleMany":{ en: "After {n} trips, <em>we know who you are</em>.", it: "Dopo {n} viaggi, <em>sappiamo chi sei</em>." },
  "acd.portrait.titleOne": { en: "After your first trip, <em>a portrait begins</em>.", it: "Dopo il primo viaggio, <em>un ritratto comincia</em>." },
  "acd.portrait.titleNone":{ en: "Your portrait <em>is taking shape</em>.", it: "Il tuo ritratto <em>prende forma</em>." },
  "acd.portrait.sub":      { en: "A living synthesis, built from how you choose — not what you declare. It refines with every trip.", it: "Una sintesi viva, costruita da come scegli — non da quello che dichiari. Si affina a ogni viaggio." },
  "acd.portrait.regen":    { en: "Regenerate ↻", it: "Rigenera ↻" },
  "acd.portrait.share":    { en: "Share ↗", it: "Condividi ↗" },
  "acd.portrait.sharing":  { en: "Preparing…", it: "Preparo…" },
  "acd.portrait.synK":     { en: "Synthesis", it: "Sintesi" },
  "acd.portrait.synWho":   { en: "for {name}", it: "per {name}" },
  "acd.portrait.paradox":  { en: "Your paradox", it: "Il tuo paradosso" },
  "acd.portrait.evoK":     { en: "How you're changing", it: "Come stai cambiando" },
  "acd.portrait.srcSolid": { en: "Synthesised from {n} trips", it: "Sintetizzato da {n} viaggi" },
  "acd.portrait.srcForming": { en: "A first portrait, refining with every trip", it: "Un primo ritratto, che si affina a ogni viaggio" },
  "acd.portrait.srcNascent": { en: "Still learning who you are — more trips, more precision", it: "Stiamo ancora imparando chi sei — più viaggi, più preciso" },
  "acd.portrait.traitsH":  { en: "Dominant traits", it: "Tratti dominanti" },
  "acd.portrait.traitsHint": { en: "How much each dimension weighs in your choices.", it: "Quanto pesa ogni dimensione nelle tue scelte." },

  // ── Collection view ─────────────────────────────────────────────────────
  "acd.coll.eyebrow":  { en: "The collection", it: "La collezione" },
  "acd.coll.title":    { en: "My <em class='gold'>trips</em>.", it: "I miei <em class='gold'>viaggi</em>." },
  "acd.coll.sub":      { en: "{n} {nu} · {d} dreamed {dw}. Search, filter, reopen.", it: "{n} {nu} · {d} {dw} di sogno. Cerca, filtra, riapri." },
  "acd.coll.search":   { en: "Search destination…", it: "Cerca destinazione…" },
  "acd.coll.empty":    { en: "No trips in this region… yet.", it: "Nessun viaggio in questa regione… ancora." },
  "acd.region.all":    { en: "All", it: "Tutti" },
  "acd.region.europe": { en: "Europe", it: "Europa" },
  "acd.region.asia":   { en: "Asia", it: "Asia" },
  "acd.region.africa": { en: "Africa", it: "Africa" },
  "acd.region.americas": { en: "Americas", it: "Americhe" },
  "acd.region.oceania": { en: "Oceania", it: "Oceania" },

  // ── Atlas view ──────────────────────────────────────────────────────────
  "acd.atlas.eyebrow": { en: "Your atlas", it: "Il tuo atlante" },
  "acd.atlas.title":   { en: "<em class='gold'>{d} days</em> spent elsewhere.", it: "<em class='gold'>{d} giorni</em> passati altrove." },
  "acd.atlas.sub":     { en: "Every point is a trip you built with MindRoute.", it: "Ogni punto è un viaggio che hai costruito con MindRoute." },
  "acd.atlas.placesEyebrow": { en: "The places", it: "I luoghi" },
  "acd.atlas.placesTitle": { en: "Where you've <em class='gold'>been</em>.", it: "Dove sei <em class='gold'>stato</em>." },

  // ── Units ───────────────────────────────────────────────────────────────
  "acd.unit.trips":      { en: "trips", it: "viaggi" },
  "acd.unit.trip":       { en: "trip", it: "viaggio" },
  "acd.unit.days":       { en: "days", it: "giorni" },
  "acd.unit.day":        { en: "day", it: "giorno" },
  "acd.unit.places":     { en: "places", it: "mete" },
  "acd.unit.place":      { en: "place", it: "meta" },
  "acd.unit.continents": { en: "continents", it: "continenti" },
  "acd.unit.continent":  { en: "continent", it: "continente" },
  "acd.unit.itineraries":{ en: "itineraries", it: "itinerari" },
  "acd.unit.itinerary":  { en: "itinerary", it: "itinerario" },
  "acd.unit.touched":    { en: "touched", it: "toccate" },
  "acd.unit.touchedOne": { en: "touched", it: "toccata" },

  // ── AccountAtlas (Leaflet map component, shared) ────────────────────────
  "acd.atlasc.eyebrow":  { en: "Your atlas", it: "Il tuo atlante" },
  "acd.atlasc.titlePost":{ en: "days<br/>spent elsewhere.", it: "giorni<br/>passati altrove." },
  "acd.atlasc.sub":      { en: "Every place you imagined, on a single map. A story told by the places you opened.", it: "Ogni meta che hai immaginato, su una sola mappa. Una storia raccontata dai luoghi che hai aperto." },
  "acd.atlasc.loading":  { en: "Drawing your map…", it: "Disegniamo la tua mappa…" },
  "acd.atlasc.empty":    { en: "Your map fills in as soon as you generate your first itinerary.", it: "La tua mappa si popolerà appena genererai il primo itinerario." },
  "acd.atlasc.emptyUnplaced": { en: "We couldn’t pin your places on the map yet — they’re listed just below.", it: "Non siamo ancora riusciti a posizionare le tue mete sulla mappa — le trovi elencate qui sotto." },
  "acd.atlasc.statTrips":      { en: "Trips", it: "Viaggi" },
  "acd.atlasc.statDays":       { en: "Days", it: "Giorni" },
  "acd.atlasc.statPlaces":     { en: "Places", it: "Mete" },
  "acd.atlasc.statPlacesOne":  { en: "Place", it: "Meta" },
  "acd.atlasc.statContinents": { en: "Continents", it: "Continenti" },
  "acd.atlasc.statContinentsOne": { en: "Continent", it: "Continente" },
  "acd.atlasc.unlocatedOne":   { en: "place not placed on the map", it: "meta non posizionata sulla mappa" },
  "acd.atlasc.unlocatedMany":  { en: "places not placed on the map", it: "mete non posizionate sulla mappa" },
  "acd.atlasc.popOpen":        { en: "Open the itinerary →", it: "Apri l'itinerario →" },

  // ── Drawer ──────────────────────────────────────────────────────────────
  "acd.dr.account":    { en: "Account", it: "Account" },
  "acd.dr.settings":   { en: "Settings", it: "Impostazioni" },
  "acd.dr.prefs":      { en: "Preferences", it: "Preferenze" },
  "acd.dr.lang":       { en: "Language", it: "Lingua" },
  "acd.dr.langVal":    { en: "English", it: "Italiano" },
  "acd.dr.profileGroup": { en: "Your travel profile", it: "Il tuo profilo di viaggio" },
  "acd.dr.retakeQuiz": { en: "Retake the quiz", it: "Rivedi il quiz" },
  "acd.dr.retakeVal":  { en: "Open", it: "Apri" },
  "acd.dr.fromProfile":{ en: "Generate from profile", it: "Genera dal profilo" },
  "acd.dr.fromProfileVal": { en: "Start", it: "Avvia" },
  "acd.dr.compare":    { en: "Compare trips", it: "Confronta viaggi" },
  "acd.dr.compareVal": { en: "Open", it: "Apri" },
  "acd.dr.how":        { en: "How it works", it: "Come funziona" },
  "acd.dr.howVal":     { en: "Open", it: "Apri" },
  "acd.dr.logout":     { en: "↗ Sign out", it: "↗ Esci" },
  "acd.dr.delete":     { en: "Delete account", it: "Elimina account" },
  "acd.dr.deleteConfirm": { en: "Are you sure you want to delete your account? This cannot be undone.", it: "Sei sicuro di voler eliminare l'account? L'azione è irreversibile." },
};
