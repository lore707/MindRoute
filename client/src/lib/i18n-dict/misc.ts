/**
 * misc.ts — chiavi i18n per componenti e pagine minori.
 * Prefissi:
 *   "cmp."   Compare
 *   "fpm."   FromProfileModal
 *   "rec."   RecognitionBanner
 *   "stream." ItineraryStream
 *   "nf."    not-found
 *
 * NON modificare i18n.tsx — questo file verrà cablato separatamente.
 * Finché non è cablato, t("cmp.x") ritorna la chiave (comportamento
 * di fallback del provider).
 */
export const miscDict: Record<string, { en: string; it: string }> = {

  // ── Compare ──────────────────────────────────────────────────────────────
  "cmp.eyebrow":         { en: "Compare",                               it: "Confronta" },
  "cmp.title":           { en: "Two trips side by side",                it: "Due viaggi fianco a fianco" },
  "cmp.subtitle":        { en: "Costs, duration, energy, key moments — to decide without overthinking.", it: "Costi, durata, energia, momenti chiave — per decidere senza pensarci troppo." },
  "cmp.minTrips":        { en: "You need at least 2 trips to compare.", it: "Servono almeno 2 viaggi per confrontare." },
  "cmp.newTrip":         { en: "Generate a new one",                    it: "Generane uno nuovo" },
  "cmp.placeholder":     { en: "Choose a trip…",                        it: "Scegli un viaggio…" },
  "cmp.empty":           { en: "Select a trip for side {side}.",        it: "Seleziona un viaggio per il lato {side}." },
  "cmp.whyYours":        { en: "Why it was yours",                      it: "Perché era per te" },
  "cmp.highlights":      { en: "Highlights",                            it: "Highlights" },
  "cmp.dayArc":          { en: "Daily arc",                             it: "Arco giornaliero" },
  "cmp.open":            { en: "Open itinerary",                        it: "Apri itinerario" },
  "cmp.swap":            { en: "⇄ Swap",                                it: "⇄ Inverti" },
  "cmp.backAccount":     { en: "Back to account",                       it: "Torna all'account" },
  "cmp.statDays":        { en: "days",                                  it: "giorni" },
  "cmp.statCost":        { en: "cost",                                  it: "costo" },
  "cmp.statEnergy":      { en: "energy",                                it: "energia" },
  // Day shorthand prefix — "D1", "D2" (EN) vs "G1", "G2" (IT)
  "cmp.dayPrefix":       { en: "D",                                     it: "G" },

  // ── FromProfileModal ──────────────────────────────────────────────────────
  "fpm.eyebrow":         { en: "Profile shortcut",                      it: "Shortcut profilo" },
  "fpm.title":           { en: "Generate from your profile",            it: "Genera dal tuo profilo" },
  "fpm.desc":            { en: "Skip the quiz: we start from your aggregated profile built on your {n} previous trips. We've pre-filled the fields below from your patterns — change only what you need.", it: "Salti il quiz: partiamo dal tuo profilo aggregato sui {n} viaggi precedenti. Abbiamo già riempito i campi sotto dai tuoi pattern — modifica solo se serve." },
  "fpm.labelCompanions": { en: "Travelling with",                       it: "Compagnia" },
  "fpm.labelDuration":   { en: "Duration · {n} days",                  it: "Durata · {n} giorni" },
  "fpm.labelDepart":     { en: "Departing from",                        it: "Parti da" },
  "fpm.placeholderDepart":{ en: "Milan, Rome…",                         it: "Milano, Roma…" },
  "fpm.labelWhen":       { en: "When",                                  it: "Quando" },
  "fpm.labelBudget":     { en: "Budget",                                it: "Budget" },
  "fpm.labelOverride":   { en: "What changes this time?",               it: "Cosa cambia questa volta?" },
  "fpm.optional":        { en: "(optional)",                            it: "(opzionale)" },
  "fpm.placeholderOverride": { en: "E.g. this time with friends, long weekend, no Europe…", it: "Es. stavolta con amici, weekend lungo, no Europa…" },
  "fpm.charCount":       { en: "{n}/300",                               it: "{n}/300" },
  "fpm.generating":      { en: "Generating…",                           it: "Generando…" },
  "fpm.generate":        { en: "Generate 3 destinations",               it: "Genera 3 destinazioni" },
  "fpm.errorGeneric":    { en: "Error",                                 it: "Errore" },
  "fpm.close":           { en: "Close",                                 it: "Chiudi" },
  // companion labels
  "fpm.comp.solo":       { en: "Solo",                                  it: "Solo/a" },
  "fpm.comp.couple":     { en: "As a couple",                          it: "In coppia" },
  "fpm.comp.friends":    { en: "Friends",                               it: "Amici" },
  "fpm.comp.family":     { en: "Family",                                it: "Famiglia" },
  // budget labels
  "fpm.bud.low":         { en: "Low",                                   it: "Basso" },
  "fpm.bud.mid":         { en: "Mid",                                   it: "Medio" },
  "fpm.bud.high":        { en: "High",                                  it: "Alto" },
  "fpm.bud.unlimited":   { en: "No limit",                              it: "Senza limite" },
  // override suggestion chips
  "fpm.ex.friends":      { en: "this time with friends",                it: "stavolta con amici" },
  "fpm.ex.highBudget":   { en: "high budget",                          it: "budget alto" },
  "fpm.ex.noEurope":     { en: "no Europe",                            it: "no Europa" },
  "fpm.ex.longWeekend":  { en: "long weekend",                         it: "weekend lungo" },
  "fpm.ex.different":    { en: "something different from usual",        it: "qualcosa di diverso dal solito" },

  // ── GenerationSheet (pannello dei vincoli, 2026-08) ───────────────────────
  // Sostituisce FromProfileModal: stesso lavoro, ma mostra anche COSA del
  // ritratto entrerà nella generazione, e lascia spegnerlo.
  "gs.eyebrow.pinned":   { en: "You chose this one",                     it: "L'hai scelta tu" },
  "gs.eyebrow.profile":  { en: "From your profile",                      it: "Dal tuo profilo" },
  "gs.title.profile":    { en: "A journey built on you",                 it: "Un viaggio costruito su di te" },
  "gs.sub.pinned":       { en: "Three ways to live this place, shaped around who you are. Set the boundaries first.", it: "Tre modi di vivere questo posto, tagliati su chi sei. Prima i paletti." },
  "gs.sub.profile":      { en: "No quiz. Three destinations from everything you've already told us — you only set the boundaries.", it: "Niente quiz. Tre destinazioni da tutto quello che ci hai già detto — tu metti solo i paletti." },
  "gs.sec.when":         { en: "When",                                   it: "Quando" },
  "gs.sec.you":          { en: "What I'll use of you",                   it: "Cosa userò di te" },
  "gs.sec.note":         { en: "Anything different this time?",          it: "Qualcosa di diverso, stavolta?" },
  "gs.lbl.date":         { en: "Departure",                              it: "Partenza" },
  "gs.lbl.days":         { en: "Days",                                   it: "Giorni" },
  "gs.lbl.from":         { en: "Leaving from",                           it: "Parti da" },
  "gs.lbl.who":          { en: "With",                                   it: "Con chi" },
  "gs.lbl.budget":       { en: "Budget",                                 it: "Budget" },
  "gs.dateHint":         { en: "The only thing I can't work out on my own. Leave it empty and the trip comes without dates.", it: "L'unica cosa che non posso dedurre da solo. Lascia vuoto e il viaggio esce senza date." },
  "gs.chipsHint":        { en: "Tap to switch one off. What you switch off does not reach the generation.", it: "Tocca per spegnerne uno. Quello che spegni non arriva alla generazione." },
  "gs.chipsAllOff":      { en: "Everything off: this trip will be built on the boundaries alone.", it: "Tutto spento: questo viaggio nascerà solo dai paletti." },
  "gs.chipsNone":        { en: "Not enough travels yet to read you. The boundaries below are all I have.", it: "Non ho ancora abbastanza viaggi per leggerti. Sotto ci sono solo i paletti." },
  "gs.noteHint":         { en: "It gets read literally, and it outranks your history where they clash.", it: "Viene letta alla lettera, e batte la tua storia dove sono in conflitto." },
  "gs.cta.pinned":       { en: "Build it",                               it: "Costruiscilo" },
  "gs.cta.profile":      { en: "Find the three",                         it: "Trova le tre" },
  "gs.working":          { en: "Working…",                               it: "Ci sto lavorando…" },
  "gs.close":            { en: "Close",                                  it: "Chiudi" },

  // ── RecognitionBanner ─────────────────────────────────────────────────────
  "rec.eyebrow":         { en: "I recognised you",                      it: "Ti ho riconosciuto" },
  "rec.fallbackHeadline":{ en: "I already know what kind of traveller you are.", it: "So già che viaggiatore sei." },
  "rec.desc":            { en: "Distilled from your {n} previous trips. Start from here — or redo the quiz if you want something different this time.", it: "Distillato dai tuoi {n} viaggi precedenti. Puoi partire da qui — o rifare il quiz se stavolta vuoi qualcosa di diverso." },
  "rec.cta.use":         { en: "Generate 3 trips from this profile",    it: "Genera 3 viaggi da questo profilo" },
  "rec.cta.change":      { en: "I want to change something",            it: "Voglio cambiare qualcosa" },

  // ── ItineraryStream ───────────────────────────────────────────────────────
  "stream.back":         { en: "Back",                                  it: "Indietro" },
  "stream.building":     { en: "✦ Building your itinerary...",          it: "✦ Costruendo il tuo itinerario..." },
  "stream.ready":        { en: "Your itinerary",                        it: "Il tuo itinerario" },
  "stream.writing":      { en: "MindRoute is writing your trip...",     it: "MindRoute sta scrivendo il tuo viaggio..." },
  "stream.whyYours":     { en: "Why this is your trip",                 it: "Perché è il tuo viaggio" },
  "stream.dayLabel":     { en: "day",                                   it: "giorno" },
  "stream.morning":      { en: "Morning",                               it: "Mattina" },
  "stream.lunch":        { en: "Lunch",                                 it: "Pranzo" },
  "stream.afternoon":    { en: "Afternoon",                             it: "Pomeriggio" },
  "stream.evening":      { en: "Evening",                               it: "Sera" },
  "stream.budget":       { en: "💰 Estimated budget",                   it: "💰 Budget stimato" },
  "stream.packing":      { en: "🎒 What to pack",                      it: "🎒 Cosa portare" },
  "stream.viewFull":     { en: "View full itinerary →",                 it: "Vedi itinerario completo →" },

  // ── not-found ─────────────────────────────────────────────────────────────
  "nf.eyebrow":          { en: "404",                                   it: "404" },
  "nf.title":            { en: "You're off course.",                    it: "Sei fuori rotta." },
  "nf.desc":             { en: "The page you were looking for doesn't exist — or maybe doesn't exist yet. Head back to the map and let's start again.", it: "La pagina che cercavi non esiste — o forse non esiste ancora. Torna alla mappa e ricominciamo." },
  "nf.cta":              { en: "Back to home →",                        it: "Torna alla home →" },
};
