/**
 * i18n-dict/quizB.ts
 * ──────────────────────────────────────────────────────────────────
 * Stringhe nuove per QuizCinematic.tsx (Path B) senza chiave in i18n.tsx.
 * Prefisso "qb.". Formato: { en: string; it: string }.
 *
 * NON modificare i18n.tsx direttamente — sarà cablato separatamente.
 * Finché non lo è, t("qb.x") torna la chiave: comportamento corretto.
 * ──────────────────────────────────────────────────────────────────
 */
export const quizBDict: Record<string, { en: string; it: string }> = {

  /* ── HeaderStrip labels ─────────────────────────────────────── */
  "qb.header.q1":        { en: "The starting point",  it: "Il punto di partenza" },
  "qb.header.q2":        { en: "Where",               it: "Dove" },
  "qb.header.q3":        { en: "Trip type",           it: "Tipo di viaggio" },
  "qb.header.q4":        { en: "Must-see & why",      it: "Cosa vedere e perché" },
  "qb.header.q5":        { en: "The rhythm",          it: "Il ritmo" },
  "qb.header.q6":        { en: "Emotional goals",     it: "Obiettivi emotivi" },
  "qb.header.q7":        { en: "What to avoid",       it: "Cosa evitare" },

  /* ── Q1 eyebrow / title / sub ───────────────────────────────── */
  "qb.q1.eyebrow":       { en: "Question 01 · the starting point",           it: "Domanda 01 · il punto di partenza" },
  "qb.q1.title":         { en: "What kind of traveler\nare you, *today?*",     it: "Che tipo di viaggiatore\nsei, *oggi?*" },
  "qb.q1.sub":           { en: "Start from how you feel today. The rest of the journey will follow that direction.", it: "Parti da come ti senti oggi. Il resto del viaggio seguirà quella direzione." },

  /* ── Q1 PathCard · guided ───────────────────────────────────── */
  "qb.q1.guided.tag":    { en: "Guided discovery",                            it: "Scoperta guidata" },
  "qb.q1.guided.title":  { en: "I don't know where to go.",                   it: "Non so dove andare." },
  "qb.q1.guided.desc":   { en: "If all you know is the feeling you are chasing, we'll turn it into a place that makes sense.", it: "Se sai solo la sensazione che stai cercando, la trasformeremo in un luogo che abbia davvero senso per te." },
  "qb.q1.guided.cta":    { en: "Let the destination emerge",                  it: "Lascia emergere la meta" },

  /* ── Q1 PathCard · intentional ──────────────────────────────── */
  "qb.q1.int.tag":       { en: "Intentional route",                           it: "Rotta intenzionale" },
  "qb.q1.int.title":     { en: "I already have a direction.",                  it: "Ho già una direzione." },
  "qb.q1.int.desc":      { en: "If you have a place, a region, or even just a clear instinct — we'll shape the trip around it.", it: "Se hai un luogo, una regione o anche solo un'intuizione precisa, costruiamo il viaggio intorno a quello." },
  "qb.q1.int.cta":       { en: "Build around my idea",                        it: "Parti dalla mia idea" },
  "qb.q1.int.pin":       { en: "Paris, France",                               it: "Parigi, Francia" },

  /* ── Q1 FooterNav CTA (guided branch) ──────────────────────── */
  "qb.q1.cta.guided":    { en: "Continue with guided",                        it: "Continua con la scoperta guidata" },
  "qb.nav.back":         { en: "Back",                                        it: "Indietro" },
  "qb.nav.continue":     { en: "Continue",                                    it: "Continua" },
  "qb.pick.selected":    { en: "selected",                                    it: "selezionati" },

  /* ── Q2 eyebrow / sub / preview labels ─────────────────────── */
  "qb.q2.eyebrow":       { en: "Question 02 · the territory",                 it: "Domanda 02 · il territorio" },
  "qb.q2.title":         { en: "Where do you\nwant to *go?*",                  it: "Dove vuoi\n*andare?*" },
  "qb.q2.sub":           { en: "Choose the region that feels closest to you right now. We'll narrow it down to a specific destination later.", it: "Scegli la regione che ti sembra più vicina in questo momento. La restringeremo a una destinazione specifica in seguito." },
  "qb.q2.preview.hover": { en: "Sample destination",                          it: "Destinazione di esempio" },
  "qb.q2.preview.sel":   { en: "Your region",                                 it: "La tua regione" },
  "qb.q2.cta.empty":     { en: "Choose a region",                             it: "Scegli una regione" },
  "qb.q2.back":          { en: "Back to question 1",                          it: "Torna alla domanda 1" },

  /* ── REGIONS: dur + coords ──────────────────────────────────── */
  "qb.region.home.dur":       { en: "4h max · no flights",       it: "Max 4h · senza voli" },
  "qb.region.home.coords":    { en: "local · 1–2 timezones",     it: "locale · 1–2 fusi orari" },
  "qb.region.europe.dur":     { en: "Short haul · ~4h max",      it: "Corto raggio · ~4h max" },
  "qb.region.europe.coords":  { en: "35°–70°N · 1–3h flight",   it: "35°–70°N · 1–3h di volo" },
  "qb.region.asia.dur":       { en: "Long haul · 8–12h",         it: "Lungo raggio · 8–12h" },
  "qb.region.asia.coords":    { en: "East & SE · 6–8 timezones", it: "Est e SE asiatico · 6–8 fusi" },
  "qb.region.americas.dur":   { en: "Transcontinental · 10–14h", it: "Transcontinentale · 10–14h" },
  "qb.region.americas.coords":{ en: "N & S · 4–10 timezones",   it: "N e S · 4–10 fusi orari" },
  "qb.region.africa.dur":     { en: "Medium / long · 4–10h",     it: "Medio / lungo raggio · 4–10h" },
  "qb.region.africa.coords":  { en: "30°N–35°S · 2–4 timezones",it: "30°N–35°S · 2–4 fusi orari" },
  "qb.region.oceania.dur":    { en: "Long haul · 20h+ w/ stops", it: "Lungo raggio · 20h+ con scalo" },
  "qb.region.oceania.coords": { en: "Pacific · 10+ timezones",   it: "Pacifico · 10+ fusi orari" },

  /* ── Q2 SideCards ───────────────────────────────────────────── */
  "qb.q2.side.why":      { en: "Geographic constraint is the starting point. The more specific you are, the more precise your itinerary will be.", it: "Il vincolo geografico è il punto di partenza. Più sei specifico, più l'itinerario sarà preciso." },

  /* ── Q3 eyebrow / sub / cta ─────────────────────────────────── */
  "qb.q3.eyebrow":       { en: "Question 03 · the style",                     it: "Domanda 03 · lo stile" },
  "qb.q3.sub":           { en: "Pick up to 3. The combination says more than any single label.", it: "Scegline fino a 3. La combinazione racconta più di ogni etichetta presa da sola." },
  "qb.q3.cta.empty":     { en: "Pick at least 1",                             it: "Scegli almeno 1" },
  "qb.q3.cta.n":         { en: "Continue with",                               it: "Continua con" },
  "qb.q3.back":          { en: "Back to where",                               it: "Torna a dove" },

  /* ── TYPES: meta (the subtitle under each card) ─────────────── */
  "qb.type.culture.meta":   { en: "Museums · old towns",      it: "Musei · centri storici" },
  "qb.type.nature.meta":    { en: "Hikes · open spaces",      it: "Trekking · spazi aperti" },
  "qb.type.food.meta":      { en: "Local cuisine · markets",  it: "Cucina locale · mercati" },
  "qb.type.beach.meta":     { en: "Sea · slow days",          it: "Mare · giornate lente" },
  "qb.type.city.meta":      { en: "Energy · late hours",      it: "Energia · ore piccole" },
  "qb.type.offgrid.meta":   { en: "Remote · disconnected",    it: "Isolato · sconnesso" },
  "qb.type.road.meta":      { en: "Drive · stops along",      it: "Guida · tappe lungo la via" },
  "qb.type.trekking.meta":  { en: "Active · physical",        it: "Attivo · fisico" },
  "qb.type.wellness.meta":  { en: "Reset · restorative",      it: "Reset · rigenerante" },
  "qb.type.discovery.meta": { en: "Let MindRoute pick",       it: "Lascia scegliere a MindRoute" },

  /* ── Q3 SideCards ───────────────────────────────────────────── */
  "qb.q3.side.why":      { en: "The combination of styles matters more than any single label. Three answers tell us the rhythm of your trip.", it: "La combinazione di stili conta più di ogni singola etichetta. Tre risposte ci dicono il ritmo del tuo viaggio." },

  /* ── Q4 eyebrow / sub / cta ─────────────────────────────────── */
  "qb.q4.eyebrow":       { en: "Question 04 · the defining moment",           it: "Domanda 04 · il momento che definisce il viaggio" },
  "qb.q4.title":         { en: "What moments would make\nthis trip truly *special?*", it: "Quali momenti renderebbero\nquesto viaggio davvero *speciale?*" },
  "qb.q4.sub":           { en: "Pick up to 3. The combination tells us everything about what you're really chasing.", it: "Scegline fino a 3. La combinazione ci dice tutto su quello che stai davvero cercando." },
  "qb.q4.cta.empty":     { en: "Pick at least 1",                             it: "Scegli almeno 1" },
  "qb.q4.cta.n":         { en: "Continue with",                               it: "Continua con" },
  "qb.q4.back":          { en: "Back to trip type",                           it: "Torna al tipo di viaggio" },
  "qb.q4.feel.empty":    { en: "Hover an answer to see what it means about you.", it: "Passa il cursore su una risposta per capire cosa dice di te." },

  /* ── MOMENTS: meta + feel ───────────────────────────────────── */
  "qb.moment.food.meta":     { en: "Where only locals eat",                       it: "Dove mangiano solo i locali" },
  "qb.moment.food.feel":     { en: "You want to feel like you belong, not like a tourist.", it: "Vuoi sentirti parte del posto, non un turista." },
  "qb.moment.explore.meta":  { en: "No destination, just walking",                it: "Nessuna meta, solo camminare" },
  "qb.moment.explore.feel":  { en: "You want to feel the place living its own life, around you.", it: "Vuoi sentire il posto che vive la sua vita intorno a te." },
  "qb.moment.iconic.meta":   { en: "The classic, experienced differently",        it: "Il classico, vissuto in modo diverso" },
  "qb.moment.iconic.feel":   { en: "You want to feel the weight of history standing in front of you.", it: "Vuoi sentire il peso della storia mentre ci stai davanti." },
  "qb.moment.nature.meta":   { en: "A day without pavement",                      it: "Una giornata senza asfalto" },
  "qb.moment.nature.feel":   { en: "You want to feel small in front of something bigger than you.", it: "Vuoi sentirti piccolo di fronte a qualcosa che ti supera." },
  "qb.moment.new.meta":      { en: "Never done before, never forgotten",           it: "Mai fatto prima, mai dimenticato" },
  "qb.moment.new.feel":      { en: "You want to feel alive — the kind of memory you'll keep for years.", it: "Vuoi sentirti vivo — il tipo di ricordo che porti con te per anni." },
  "qb.moment.photo.meta":    { en: "Perfect light, perfect moment",               it: "Luce perfetta, momento perfetto" },
  "qb.moment.photo.feel":    { en: "You want one frame that tells everyone where you really were.", it: "Vuoi uno scatto che racconta a tutti dove eri davvero." },
  "qb.moment.discover.meta": { en: "The discovery that makes the trip",           it: "La scoperta che fa il viaggio" },
  "qb.moment.discover.feel": { en: "You want to come back home with a secret nobody else has.", it: "Vuoi tornare a casa con un segreto che non ha nessun altro." },

  /* ── Q4 SideCards ───────────────────────────────────────────── */
  "qb.q4.side.why":      { en: "What feels unmissable reveals your priorities. Why that moment matters reveals the emotional reason behind the whole trip.", it: "Quello che senti irrinunciabile rivela le tue priorità. Il motivo per cui quel momento conta rivela il bisogno emotivo dietro all'intero viaggio." },

  /* ── Q5 eyebrow / title / sub ───────────────────────────────── */
  "qb.q5.eyebrow":       { en: "Question 05 · the rhythm",                    it: "Domanda 05 · il ritmo" },
  "qb.q5.title":         { en: "How do you want\nthe days to *flow?*",         it: "Come vuoi che\n*scorrano* le giornate?" },
  "qb.q5.sub":           { en: "From a schedule that holds you to a sky that doesn't. There's no wrong answer — only your answer.", it: "Da un programma che ti sostiene a un cielo senza confini. Non ci sono risposte sbagliate — solo la tua." },
  "qb.q5.back":          { en: "Back to defining moment",                      it: "Torna al momento che definisce il viaggio" },

  /* ── PACE_STAGES: name + meta + feel ────────────────────────── */
  "qb.pace.structured.name":  { en: "Structured",               it: "Strutturato" },
  "qb.pace.structured.meta":  { en: "every day already mapped", it: "ogni giorno già pianificato" },
  "qb.pace.structured.feel":  { en: "You want a clear plan so you can stop thinking and just feel.", it: "Vuoi un piano chiaro per smettere di pensare e cominciare a sentire." },
  "qb.pace.balanced.name":    { en: "Balanced",                 it: "Bilanciato" },
  "qb.pace.balanced.meta":    { en: "the spine is set, the rest isn't", it: "la struttura c'è, il resto è aperto" },
  "qb.pace.balanced.feel":    { en: "You want a structure to lean on and freedom to wander off it.", it: "Vuoi una struttura su cui appoggiarti e la libertà di allontanartene." },
  "qb.pace.spontaneous.name": { en: "Spontaneous",              it: "Spontaneo" },
  "qb.pace.spontaneous.meta": { en: "decide it in the morning", it: "si decide la mattina" },
  "qb.pace.spontaneous.feel": { en: "You want the day to surprise you — no slot, no countdown, no map.", it: "Vuoi che la giornata ti sorprenda — niente slot, niente conto alla rovescia, niente mappa." },

  /* ── Pace slider stop labels ────────────────────────────────── */
  "qb.pace.stop.structured":  { en: "Structured",   it: "Strutturato" },
  "qb.pace.stop.struct.sub":  { en: "plan first",   it: "prima il piano" },
  "qb.pace.stop.balanced":    { en: "Balanced",     it: "Bilanciato" },
  "qb.pace.stop.bal.sub":     { en: "spine + space",it: "struttura + spazio" },
  "qb.pace.stop.spont":       { en: "Spontaneous",  it: "Spontaneo" },
  "qb.pace.stop.spont.sub":   { en: "decide later", it: "si decide dopo" },

  /* ── Q5 SideCards ───────────────────────────────────────────── */
  "qb.q5.side.why":      { en: "Two travellers in the same place can have opposite trips. The rhythm is what makes one feel like yours.", it: "Due viaggiatori nello stesso posto possono vivere esperienze opposte. Il ritmo è quello che rende uno il tuo." },

  /* ── Q6 eyebrow / title / sub ───────────────────────────────── */
  "qb.q6.eyebrow":       { en: "Question 06 · the feeling you're chasing",    it: "Domanda 06 · la sensazione che cerchi" },
  "qb.q6.title":         { en: "What do you want\nto *feel* on this trip?",    it: "Come vuoi *sentirti*\nin questo viaggio?" },
  "qb.q6.sub":           { en: "Pick up to 3. This is the emotional shape of your journey.", it: "Scegline fino a 3. Questa è la forma emotiva del tuo viaggio." },
  "qb.q6.cta.empty":     { en: "Pick at least 1",                             it: "Scegli almeno 1" },
  "qb.q6.cta.n":         { en: "Continue with",                               it: "Continua con" },
  "qb.q6.back":          { en: "Back to rhythm",                              it: "Torna al ritmo" },
  "qb.q6.feel.empty":    { en: "Hover an answer to see what it really means.", it: "Passa il cursore su una risposta per capire cosa significa davvero." },

  /* ── EMOTIONS: meta + feel ──────────────────────────────────── */
  "qb.emotion.disconnect.meta":  { en: "no schedules, no notifications",          it: "niente programmi, niente notifiche" },
  "qb.emotion.disconnect.feel":  { en: "You want a real exit door from your daily mind.", it: "Vuoi una vera via d'uscita dalla tua mente quotidiana." },
  "qb.emotion.energy.meta":      { en: "come back changed",                       it: "tornare diverso" },
  "qb.emotion.energy.feel":      { en: "You want to land back home a little lighter than you left.", it: "Vuoi tornare a casa un po' più leggero di come sei partito." },
  "qb.emotion.free.meta":        { en: "decide in the morning what to do",        it: "la mattina si decide cosa fare" },
  "qb.emotion.free.feel":        { en: "You want days that don't ask permission from a calendar.", it: "Vuoi giornate che non chiedono permesso a un calendario." },
  "qb.emotion.wonder.meta":      { en: "that feeling you've been missing",        it: "quella sensazione che ti manca" },
  "qb.emotion.wonder.feel":      { en: "You want something to silence the cynical voice in your head.", it: "Vuoi qualcosa che faccia tacere la voce cinica nella tua testa." },
  "qb.emotion.connect.meta":     { en: "genuinely connect with it",               it: "entrare davvero in contatto" },
  "qb.emotion.connect.feel":     { en: "You want a place to enter you, not just pass through your camera.", it: "Vuoi che un luogo ti entri dentro, non solo che passi davanti all'obiettivo." },
  "qb.emotion.comfort.meta":     { en: "push the boundary forward",               it: "sposta il confine in avanti" },
  "qb.emotion.comfort.feel":     { en: "You want the version of yourself you only meet far from home.", it: "Vuoi la versione di te che incontri solo lontano da casa." },

  /* ── Q6 SideCards ───────────────────────────────────────────── */
  "qb.q6.side.why":      { en: "Where matters less than how it makes you feel. Three emotional goals lock the destination into the right register.", it: "Dove conta meno di come ti fa sentire. Tre obiettivi emotivi sintonizzano la destinazione sul registro giusto." },

  /* ── Q7 eyebrow / title / sub ───────────────────────────────── */
  "qb.q7.eyebrow":       { en: "Question 07 · the boundaries",                it: "Domanda 07 · i confini" },
  "qb.q7.title":         { en: "What would *ruin*\nthis trip for you?",         it: "Cosa *rovinerebbe*\nquesto viaggio per te?" },
  "qb.q7.sub":           { en: "Pick as many as you want — even none. Naming what you don't want sharpens the part you do.", it: "Scegline quanti vuoi — anche nessuno. Nominare quello che non vuoi rende più nitido quello che cerchi." },
  "qb.q7.back":          { en: "Back to emotional goals",                      it: "Torna agli obiettivi emotivi" },
  "qb.q7.cta.skip":      { en: "Skip — continue",                             it: "Salta — continua" },

  /* ── AVOIDS: meta (name from chips.* keys) ──────────────────── */
  "qb.avoid.crowded.meta":        { en: "everyone with the same camera",      it: "tutti con la stessa macchina fotografica" },
  "qb.avoid.touristy.meta":       { en: "menu in five languages",             it: "menu in cinque lingue" },
  "qb.avoid.resort.meta":         { en: "the place stays outside the gate",   it: "il posto resta fuori dal cancello" },
  "qb.avoid.guided.meta":         { en: "earphone, headcount, no detours",    it: "auricolare, conta teste, niente deviazioni" },
  "qb.avoid.museums.meta":        { en: "marathon of plaques",                it: "maratona di didascalie" },
  "qb.avoid.nightlife.meta":      { en: "lights, decibels, late",             it: "luci, decibel, notte fonda" },
  "qb.avoid.schedules.meta":      { en: "by-the-minute itinerary",            it: "itinerario minuto per minuto" },
  "qb.avoid.transits.meta":       { en: "more travel than trip",              it: "più trasferimento che viaggio" },
  "qb.avoid.mornings.meta":       { en: "alarms on holiday? no",              it: "sveglie in vacanza? no" },
  "qb.avoid.smalltalk.meta":      { en: "constant social effort",             it: "sforzo sociale continuo" },
  "qb.avoid.unfamiliarfood.meta": { en: "every meal a question mark",         it: "ogni pasto un punto interrogativo" },
  "qb.avoid.toomuchwalking.meta": { en: "10k steps before breakfast",         it: "10.000 passi prima di colazione" },
  "qb.avoid.tooisolated.meta":    { en: "no signal, no people, no help",      it: "nessun segnale, nessuna persona, nessun aiuto" },
  "qb.avoid.tooexpensive.meta":   { en: "paying for the label",               it: "pagare per il marchio" },
  "qb.avoid.toolong.meta":        { en: "one base, zero rotation",            it: "una base fissa, zero rotazione" },

  /* ── Q7 "Avoided" chip mark ─────────────────────────────────── */
  "qb.q7.avoided":       { en: "Avoided",      it: "Evitato" },

  /* ── Q7 SideCards ───────────────────────────────────────────── */
  "qb.q7.side.why":      { en: "A trip is also defined by what's not in it. Knowing your no-zones is half of crafting the right yes.", it: "Un viaggio è definito anche da quello che non contiene. Conoscere le tue zone di rifiuto è metà del lavoro per costruire il sì giusto." },

  /* ── Q3 title (h1 plain text, em handled in JSX) ────────────── */
  "qb.q3.title":         { en: "What *type* of trip?",                           it: "Che *tipo* di viaggio?" },

  /* ── Q5 aria label for range input ─────────────────────────── */
  "qb.q5.aria.pace":     { en: "Trip pace",                                      it: "Ritmo del viaggio" },

  /* ── ProfileCard ─────────────────────────────────────────────── */
  "qb.profile.head":     { en: "Your profile so far",      it: "Il tuo profilo finora" },
  "qb.profile.q1":       { en: "Q1 · path",                it: "D1 · rotta" },
  "qb.profile.q1.guided":{ en: "Guided discovery",         it: "Scoperta guidata" },
  "qb.profile.q1.int":   { en: "Intentional route",        it: "Rotta intenzionale" },
  "qb.profile.q2":       { en: "Q2 · where",               it: "D2 · dove" },
  "qb.profile.q3":       { en: "Q3 · trip type",           it: "D3 · tipo di viaggio" },
  "qb.profile.q4":       { en: "Q4 · defining moment",     it: "D4 · momento che definisce" },
  "qb.profile.q5":       { en: "Q5 · pace",                it: "D5 · ritmo" },
  "qb.profile.q6":       { en: "Q6 · emotional goals",     it: "D6 · obiettivi emotivi" },
  "qb.profile.q7":       { en: "Q7 · avoid",               it: "D7 · evitare" },
  "qb.profile.awaiting": { en: "awaiting your choice…",    it: "in attesa della tua scelta…" },
  "qb.profile.items":    { en: "item",                     it: "voce" },
  "qb.profile.items.pl": { en: "items",                    it: "voci" },

  /* ── paceLabel (ProfileCard value) ─────────────────────────── */
  "qb.pace.label.structured":  { en: "Structured",   it: "Strutturato" },
  "qb.pace.label.spontaneous": { en: "Spontaneous",  it: "Spontaneo" },
  "qb.pace.label.balanced":    { en: "Balanced",     it: "Bilanciato" },

  /* ── SideCard shared heads ──────────────────────────────────── */
  "qb.side.why":         { en: "Why this question",         it: "Perché questa domanda" },
  "qb.side.privacy":     { en: "Privacy",                   it: "Privacy" },
  "qb.side.privacy.txt": { en: "Your answers shape your destinations. Never stored, never shared.", it: "Le tue risposte servono solo a costruire il viaggio. Non vengono salvate né condivise." },
};
