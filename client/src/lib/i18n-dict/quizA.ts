/**
 * quizA.ts — i18n dictionary for QuizCinematicA (Path A, Q1–Q7)
 *
 * Prefix: "qa."
 * Format: { en: "source verbatim", it: "traduzione" }
 *
 * DO NOT modify this file alongside i18n.tsx at the same time.
 * These keys are pending cabling into i18n.tsx; until then t("qa.x")
 * returns the key string, which is harmless.
 *
 * Keys that already exist in i18n.tsx are NOT duplicated here:
 *   - vibe names      → a.q1.chips.*
 *   - need names      → a.q2.chip1..8
 *   - drain names     → chips.*
 *   - visual names    → q4.medina/nordic/temple/desert (+ .sub)
 *   - distance names  → a.q7.chips.*
 *   - q-level texts   → a.q1..q7.text / .hint / .why
 *   - section labels  → section.a.*
 *   - nav labels      → q.back / q.continue / q.selected / sidebar.*
 *   - microcopy       → micro.*
 *   - profile card    → sidebar.profileSoFar / sidebar.privacy
 *
 * QuizCinematicA is fully wired to this dict + i18n.tsx.
 * No hard-coded user-visible strings remain in the component.
 */

export const quizADict: Record<string, { en: string; it: string }> = {

  /* ── Q1 · style ──────────────────────────────────────────────── */
  "qa.q1.eyebrow":       { en: "the colour of the trip",           it: "il colore del viaggio" },
  "qa.q1.counter":       { en: "selected",                         it: "scelte" },

  // vibe .meta strings (not in i18n.tsx)
  "qa.vibe.wild.meta":         { en: "untamed, off the leash",          it: "indomito, senza guinzaglio" },
  "qa.vibe.quiet.meta":        { en: "low volume, deep rest",           it: "volume basso, riposo vero" },
  "qa.vibe.chaotic.meta":      { en: "messy, alive, unpredictable",     it: "caotico, vivo, imprevedibile" },
  "qa.vibe.intimate.meta":     { en: "small, close, personal",          it: "piccolo, vicino, personale" },
  "qa.vibe.solitary.meta":     { en: "just you and the road",           it: "solo tu e la strada" },
  "qa.vibe.regenerating.meta": { en: "come back restored",              it: "tornare rigenerato" },
  "qa.vibe.authentic.meta":    { en: "real over polished",              it: "autentico, non patinato" },
  "qa.vibe.quietluxury.meta":  { en: "understated, refined",            it: "sobrio, raffinato" },
  "qa.vibe.spiritual.meta":    { en: "inward, sacred, still",           it: "interiore, sacro, silenzioso" },
  "qa.vibe.festive.meta":      { en: "music, people, celebration",      it: "musica, gente, celebrazione" },
  "qa.vibe.adventure.meta":    { en: "adrenaline, the edge",            it: "adrenalina, il limite" },
  "qa.vibe.romantic.meta":     { en: "tender, made for two",            it: "tenero, fatto per due" },
  "qa.vibe.cultural.meta":     { en: "history, art, meaning",           it: "storia, arte, significato" },
  "qa.vibe.explorative.meta":  { en: "curiosity-led, no map",           it: "curiosità pura, senza mappa" },

  "qa.q1.cta.full":    { en: "Continue with {n}",  it: "Continua con {n}" },
  "qa.q1.cta.empty":   { en: "Pick at least 1",    it: "Scegline almeno 1" },

  /* ── Q2 · need ───────────────────────────────────────────────── */
  "qa.q2.eyebrow":     { en: "the real compass",                   it: "la vera bussola" },
  "qa.q2.counter":     { en: "selected",                           it: "scelte" },

  // need .meta strings
  "qa.need.disconnect.meta": { en: "switch the daily mind off",          it: "spegnere la testa quotidiana" },
  "qa.need.alive.meta":      { en: "wake something up",                  it: "risvegliare qualcosa" },
  "qa.need.slow.meta":       { en: "drop the pace, breathe",             it: "rallentare, respirare" },
  "qa.need.surprise.meta":   { en: "let it catch you off guard",         it: "lasciarsi sorprendere davvero" },
  "qa.need.recharge.meta":   { en: "come back with a full tank",         it: "tornare con le pile cariche" },
  "qa.need.change.meta":     { en: "shift, even slightly",               it: "cambiare qualcosa, anche poco" },
  "qa.need.celebrate.meta":  { en: "mark the moment",                    it: "lasciare un segno al momento" },
  "qa.need.findself.meta":   { en: "meet who you are far from home",     it: "ritrovarti lontano da casa" },

  // need .feel strings
  "qa.need.disconnect.feel": { en: "You need a real exit door from your everyday self.",         it: "Hai bisogno di una vera porta d'uscita da te stesso." },
  "qa.need.alive.feel":      { en: "You're chasing the spark that routine has dimmed.",          it: "Stai inseguendo la scintilla che la routine ha spento." },
  "qa.need.slow.feel":       { en: "You need permission to do less and feel more.",              it: "Ti serve il permesso di fare meno e sentire di più." },
  "qa.need.surprise.feel":   { en: "You want to be caught off guard by something real.",        it: "Vuoi essere colto di sorpresa da qualcosa di vero." },
  "qa.need.recharge.feel":   { en: "You want to land back home lighter than you left.",         it: "Vuoi tornare a casa più leggero di quando sei partito." },
  "qa.need.change.feel":     { en: "Something needs to move — even a small thing.",             it: "Qualcosa deve muoversi — anche solo un dettaglio." },
  "qa.need.celebrate.feel":  { en: "There's a moment worth marking with a place.",              it: "C'è un momento che vale la pena fermare con un luogo." },
  "qa.need.findself.feel":   { en: "You want to meet the version of you that lives far away.",  it: "Vuoi incontrare la versione di te che vive lontano da casa." },

  "qa.q2.feel.default":  { en: "Hover an answer to see what it means about you.", it: "Passa il mouse su una risposta per capire cosa dice di te." },
  "qa.q2.note.label":    { en: "Want to tell us more?",                           it: "Vuoi raccontarci di più?" },
  "qa.q2.note.optional": { en: "(optional)",                                      it: "(opzionale)" },
  "qa.q2.note.placeholder": { en: "In your own words — the life behind the need…", it: "A modo tuo — la vita che c'è dietro al bisogno…" },

  "qa.q2.back":          { en: "Back to your style",  it: "Torna al tuo stile" },
  "qa.q2.cta.full":      { en: "Continue with {n}",   it: "Continua con {n}" },
  "qa.q2.cta.empty":     { en: "Pick at least 1",     it: "Scegline almeno 1" },

  /* ── Q3 · drains ─────────────────────────────────────────────── */
  "qa.q3.eyebrow":       { en: "the boundaries",                           it: "i confini" },
  "qa.q3.sub":           { en: "What you reject says more than what you want. Pick as many as you feel — even none.", it: "Quello che rifiuti dice più di quello che vuoi. Scegline quanti vuoi — anche nessuno." },
  "qa.q3.counter":       { en: "selected",                                 it: "scelte" },

  // drain .meta strings (the chips.* keys cover names; these are the sub-descriptions)
  "qa.drain.crowded.meta":        { en: "everyone with the same camera",    it: "tutti con la stessa macchina fotografica" },
  "qa.drain.touristy.meta":       { en: "menu in five languages",           it: "menù in cinque lingue" },
  "qa.drain.resort.meta":         { en: "the place stays outside the gate", it: "il luogo vero resta fuori dal cancello" },
  "qa.drain.guided.meta":         { en: "earphone, headcount, no detours",  it: "auricolare, conta, nessuna deviazione" },
  "qa.drain.museums.meta":        { en: "marathon of plaques",              it: "maratona di targhette" },
  "qa.drain.nightlife.meta":      { en: "lights, decibels, late",           it: "luci, decibel, notte fonda" },
  "qa.drain.schedules.meta":      { en: "by-the-minute itinerary",          it: "itinerario minuto per minuto" },
  "qa.drain.transits.meta":       { en: "more travel than trip",            it: "più trasferimento che viaggio" },
  "qa.drain.mornings.meta":       { en: "alarms on holiday? no",            it: "sveglia in vacanza? no grazie" },
  "qa.drain.smalltalk.meta":      { en: "constant social effort",           it: "sforzo sociale continuo" },
  "qa.drain.unfamiliarfood.meta": { en: "every meal a question mark",       it: "ogni pasto un punto interrogativo" },
  "qa.drain.toomuchwalking.meta": { en: "10k steps before breakfast",       it: "10.000 passi prima di colazione" },
  "qa.drain.tooisolated.meta":    { en: "no signal, no people, no help",    it: "niente segnale, niente gente, niente aiuto" },
  "qa.drain.tooexpensive.meta":   { en: "paying for the label",             it: "pagare l'etichetta" },
  "qa.drain.toolong.meta":        { en: "one base, zero rotation",          it: "una base, zero rotazione" },

  "qa.q3.mark.drain":    { en: "Drains",         it: "Prosciuga" },
  "qa.q3.note.label":    { en: "Anything else that kills the vibe?", it: "Qualcos'altro che rovina l'atmosfera?" },
  "qa.q3.note.optional": { en: "(optional)",     it: "(opzionale)" },
  "qa.q3.note.placeholder": { en: "Something specific that ruins a trip for you…", it: "Qualcosa di specifico che rovina un viaggio per te…" },
  "qa.q3.side.why":      { en: "Anti-patterns are identity markers. The combinations define the hard boundaries of your trip — what it can never be.", it: "Gli anti-pattern sono marcatori identitari. Le combinazioni definiscono i confini rigidi del tuo viaggio — quello che non potrà mai essere." },

  "qa.q3.back":          { en: "Back to your need",   it: "Torna al tuo bisogno" },
  "qa.q3.cta.has":       { en: "Continue",            it: "Continua" },
  "qa.q3.cta.none":      { en: "Skip — continue",     it: "Salta — continua" },

  /* ── Q4 · visual pull ────────────────────────────────────────── */
  "qa.q4.eyebrow":       { en: "the visual instinct",  it: "l'istinto visivo" },
  "qa.q4.counter":       { en: "selected",             it: "scelte" },

  "qa.q4.side.why":      { en: "Visual attraction bypasses rational filters. The image you choose reveals your aesthetic soul before words get involved.", it: "L'attrazione visiva bypassa i filtri razionali. L'immagine che scegli rivela la tua anima estetica prima che le parole intervengano." },

  "qa.q4.back":          { en: "Back to drains",     it: "Torna ai freni" },
  "qa.q4.cta.full":      { en: "Continue with {n}",  it: "Continua con {n}" },
  "qa.q4.cta.empty":     { en: "Pick at least 1",    it: "Scegline almeno 1" },

  /* ── Q5 · chaos ──────────────────────────────────────────────── */
  "qa.q5.eyebrow":        { en: "structure & chaos",   it: "struttura e caos" },
  "qa.q5.sub":            { en: "Your relationship with the unexpected changes the kind of trip that nourishes you instead of draining you.", it: "Il tuo rapporto con l'imprevisto cambia il tipo di viaggio che ti nutre invece di prosciugarti." },

  // pace stage names / meta / feel
  "qa.pace.structured.name":   { en: "Structured",          it: "Strutturato" },
  "qa.pace.structured.meta":   { en: "every day already mapped",          it: "ogni giornata già tracciata" },
  "qa.pace.structured.feel":   { en: "You want a clear plan so you can stop thinking and just feel.",   it: "Vuoi un piano chiaro per smettere di pensare e iniziare a sentire." },
  "qa.pace.balanced.name":     { en: "Balanced",            it: "Bilanciato" },
  "qa.pace.balanced.meta":     { en: "the spine is set, the rest isn't", it: "la struttura c'è, il resto no" },
  "qa.pace.balanced.feel":     { en: "You want a structure to lean on and freedom to wander off it.", it: "Vuoi una struttura su cui appoggiarti e libertà di allontanartene." },
  "qa.pace.spontaneous.name":  { en: "Spontaneous",         it: "Spontaneo" },
  "qa.pace.spontaneous.meta":  { en: "decide it in the morning",          it: "decidi al mattino" },
  "qa.pace.spontaneous.feel":  { en: "You want the day to surprise you — no slot, no countdown, no map.", it: "Vuoi che la giornata ti sorprenda — nessuno slot, nessun conto alla rovescia, nessuna mappa." },

  "qa.q5.btn.structured.label":  { en: "Structured",    it: "Strutturato" },
  "qa.q5.btn.structured.small":  { en: "plan first",    it: "prima si pianifica" },
  "qa.q5.btn.balanced.label":    { en: "Balanced",      it: "Bilanciato" },
  "qa.q5.btn.balanced.small":    { en: "spine + space", it: "struttura + spazio" },
  "qa.q5.btn.spontaneous.label": { en: "Spontaneous",   it: "Spontaneo" },
  "qa.q5.btn.spontaneous.small": { en: "figure it out there", it: "lo capisci lì" },

  "qa.q5.side.why":      { en: "Two travellers in the same place can have opposite trips. Your tolerance for chaos is what makes one of them feel like yours.", it: "Due viaggiatori nello stesso posto possono vivere esperienze opposte. La tua tolleranza per il caos è ciò che rende uno di loro il tuo viaggio." },

  "qa.q5.back":          { en: "Back to visual pull",  it: "Torna all'istinto visivo" },
  "qa.q5.cta":           { en: "Continue",             it: "Continua" },

  /* ── Q6 · identity filter ────────────────────────────────────── */
  "qa.q6.eyebrow":       { en: "what you reject",      it: "ciò che rifiuti" },
  "qa.q6.sub":           { en: 'No wrong answers. Even "I don\'t know" tells us something about you.', it: 'Nessuna risposta sbagliata. Anche "non lo so" ci dice qualcosa di te.' },
  "qa.q6.optional.pill": { en: "✦ Optional · skip if nothing comes to mind", it: "✦ Opzionale · salta se non ti viene niente in mente" },
  "qa.q6.word":          { en: "word",                 it: "parola" },
  "qa.q6.words":         { en: "words",                it: "parole" },
  "qa.q6.your.words":    { en: "your words",           it: "le tue parole" },

  "qa.q6.side.why":      { en: "What you reject defines you almost as much as what you desire. It's a direct way to learn what could never feel like the right trip for you.", it: "Quello che rifiuti ti definisce quasi quanto quello che desideri. È un modo diretto per capire cosa non potrà mai sembrare il viaggio giusto per te." },

  "qa.q6.back":          { en: "Back to chaos level",  it: "Torna al livello di caos" },
  "qa.q6.cta.has":       { en: "Continue",             it: "Continua" },
  "qa.q6.cta.none":      { en: "Skip — continue",      it: "Salta — continua" },

  /* ── Q7 · distance ───────────────────────────────────────────── */
  "qa.q7.eyebrow":       { en: "comfort & rupture",    it: "comfort e rottura" },
  "qa.q7.sub":           { en: 'Close is comfort. Far is transformation. "Anywhere" is maximum openness — let us surprise you.', it: 'Vicino è comfort. Lontano è trasformazione. "Ovunque" è apertura massima — lasciaci sorprenderti.' },

  // distance .meta strings (a.q7.chips.* covers names only)
  "qa.dist.close.meta":     { en: "a few hours, no jet lag",      it: "poche ore, niente jet lag" },
  "qa.dist.continent.meta": { en: "familiar, but elsewhere",      it: "familiare, ma altrove" },
  "qa.dist.far.meta":       { en: "another world, another clock", it: "un altro mondo, un altro orologio" },
  "qa.dist.anywhere.meta":  { en: "maximum openness",             it: "apertura massima" },

  // distance .dur strings (short operational labels)
  "qa.dist.close.dur":      { en: "≤4h · no flights",  it: "≤4h · nessun volo" },
  "qa.dist.continent.dur":  { en: "short haul",         it: "corto raggio" },
  "qa.dist.far.dur":        { en: "long haul",          it: "lungo raggio" },
  "qa.dist.anywhere.dur":   { en: "no limits",          it: "nessun limite" },

  "qa.q7.side.why":      { en: "Distance reveals your comfort zone and your desire for rupture. It's the last constraint we need before we start matching places to you.", it: "La distanza rivela la tua comfort zone e il desiderio di rottura. È l'ultimo vincolo che ci serve prima di trovare il tuo posto nel mondo." },

  "qa.q7.back":          { en: "Back to identity filter", it: "Torna al filtro identitario" },
  "qa.q7.cta.has":       { en: "Continue",                it: "Continua" },
  "qa.q7.cta.none":      { en: "Choose a distance",       it: "Scegli una distanza" },

  /* ── Profile card ─────────────────────────────────────────────── */
  "qa.profile.q1":       { en: "Q1 · style",     it: "Q1 · stile" },
  "qa.profile.q2":       { en: "Q2 · need",      it: "Q2 · bisogno" },
  "qa.profile.q3":       { en: "Q3 · drains",    it: "Q3 · freni" },
  "qa.profile.q4":       { en: "Q4 · visual",    it: "Q4 · visivo" },
  "qa.profile.q5":       { en: "Q5 · chaos",     it: "Q5 · caos" },
  "qa.profile.q6":       { en: "Q6 · filter",    it: "Q6 · filtro" },
  "qa.profile.q7":       { en: "Q7 · distance",  it: "Q7 · distanza" },
  "qa.profile.awaiting":  { en: "awaiting your choice…", it: "in attesa della tua scelta…" },
  "qa.profile.noted":     { en: "noted",            it: "annotato" },
  "qa.profile.patterns":  { en: "pattern",          it: "pattern" },
  "qa.profile.patterns.pl": { en: "patterns",       it: "pattern" },

  /* ── Q1 sub-line (longer hint specific to QuizCinematicA) ─────── */
  "qa.q1.sub":  { en: "Pick up to 3. The combination reveals who you are far more than any single one.", it: "Scegline fino a 3. La combinazione racconta molto di più di qualsiasi scelta presa da sola." },

  /* ── Q2 sub-line ─────────────────────────────────────────────── */
  "qa.q2.sub":  { en: "Not what you want to do — what you need to feel. Pick up to 3.", it: "Non quello che vuoi fare — quello che hai bisogno di sentire. Scegline fino a 3." },

  /* ── Q3 why (SideCard body, longer version in A vs B) ─────────── */
  /* note: qa.q3.side.why already covers this — no duplicate needed */

  /* ── Side panel head labels ───────────────────────────────────── */
  "qa.side.whyHead":     { en: "Why this question?", it: "Perché questa domanda?" },
  "qa.side.privacyHead": { en: "Privacy",             it: "Privacy" },
};
