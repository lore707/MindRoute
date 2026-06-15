/**
 * account.ts — chiavi i18n per MyAccount e AccountRedesign.
 * Prefisso: "acct."
 * NON modificare i18n.tsx — questo file verrà cablato separatamente.
 * Finché non è cablato, t("acct.x") ritorna la chiave (comportamento
 * di fallback del provider).
 */
export const accountDict: Record<string, { en: string; it: string }> = {

  // ── Stat labels (heroStats / novelStats) ───────────────────────────────
  "acct.stat.trip.one":         { en: "trip",          it: "viaggio" },
  "acct.stat.trip.many":        { en: "trips",         it: "viaggi" },
  "acct.stat.day.one":          { en: "day",           it: "giorno" },
  "acct.stat.day.many":         { en: "days",          it: "giorni" },
  "acct.stat.dest.one":         { en: "destination",   it: "destinazione" },
  "acct.stat.dest.many":        { en: "destinations",  it: "destinazioni" },
  "acct.stat.cont.one":         { en: "continent",     it: "continente" },
  "acct.stat.cont.many":        { en: "continents",    it: "continenti" },

  // ── novelStats labels ─────────────────────────────────────────────────
  "acct.novel.tripsLabel":      { en: "Trips completed",  it: "Viaggi completati" },
  "acct.novel.daysLabel":       { en: "Days elsewhere",   it: "Giorni altrove" },
  "acct.novel.avgSub":          { en: "Average {n} per trip", it: "Media {n} per viaggio" },
  "acct.novel.soul.one":        { en: "City soul",        it: "Anima di città" },
  "acct.novel.soul.many":       { en: "City souls",       it: "Anime di città" },
  "acct.novel.soulSub":         { en: "To relive",        it: "Da rivivere" },
  "acct.novel.contLabel.one":   { en: "Continent",        it: "Continente" },
  "acct.novel.contLabel.many":  { en: "Continents",       it: "Continenti" },
  "acct.novel.topContSub":      { en: "{label} is your favourite", it: "{label} è il più amato" },

  // ── profileQuote fallbacks ────────────────────────────────────────────
  "acct.profile.noTrips":       {
    en: "You're building your travel profile. Generate more itineraries to discover who you are.",
    it: "Stai costruendo il tuo profilo di viaggio. Genera più itinerari per scoprire chi sei.",
  },
  "acct.profile.forming":       {
    en: "Your traveller profile takes shape with every trip.",
    it: "Il tuo profilo viaggiatore prende forma a ogni viaggio.",
  },

  // ── profileByline ─────────────────────────────────────────────────────
  "acct.byline.base":           { en: "Distilled from your <strong>{n} {label}</strong>", it: "Distillato dai tuoi <strong>{n} {label}</strong>" },
  "acct.byline.evolving":       { en: "· evolving towards <strong>{dir}</strong>", it: "· in evoluzione verso <strong>{dir}</strong>" },

  // ── statsNarrative ────────────────────────────────────────────────────
  "acct.narrative.empty":       {
    en: "Your first trip is still unwritten. MindRoute is here whenever you're ready to go.",
    it: "Il tuo primo viaggio è ancora da scrivere. MindRoute è qui quando vorrai partire.",
  },
  "acct.narrative.text":        {
    en: "You've left {n} times. You've imagined {days} days elsewhere, under {cities} different skies. Keep going.",
    it: "Sei partito {n} volte. Hai immaginato {days} giorni altrove, sotto {cities} cieli diversi. Continua così.",
  },

  // ── statsBold tokens ─────────────────────────────────────────────────
  "acct.bold.times":            { en: "{n} times",       it: "{n} volte" },
  "acct.bold.days":             { en: "{n} days",        it: "{n} giorni" },
  "acct.bold.skies":            { en: "{n} different skies", it: "{n} cieli diversi" },

  // ── continueItems sub ────────────────────────────────────────────────
  "acct.resume.sub":            { en: "{n} days",        it: "{n} giorni" },

  // ── settings rows ────────────────────────────────────────────────────
  "acct.settings.lang":         { en: "Language",        it: "Lingua" },
  "acct.settings.langVal.en":   { en: "English",         it: "English" },
  "acct.settings.langVal.it":   { en: "Italiano",        it: "Italiano" },
  "acct.settings.compare":      { en: "Compare trips",   it: "Confronta viaggi" },
  "acct.settings.compareVal":   { en: "Open /compare",   it: "Apri /compare" },
  "acct.settings.accountRow":   { en: "Account",         it: "Account" },

  // ── secondaryCta ────────────────────────────────────────────────────
  "acct.cta.fromProfile":       { en: "✨ Generate from profile", it: "✨ Genera dal tuo profilo" },
  "acct.cta.exploreMore":       { en: "↓ Keep exploring",        it: "↓ Continua a esplorare" },

  // ── Hero section (AccountRedesign) ────────────────────────────────────
  "acct.hero.greeting":         { en: "Welcome back,",   it: "Bentornato," },
  "acct.hero.titleSuffix":      { en: ", your",          it: ", il tuo" },
  "acct.hero.newItin":          { en: "+ New itinerary", it: "+ Nuovo itinerario" },

  // ── Cap II — Portrait section ─────────────────────────────────────────
  "acct.cap2.eyebrow":          { en: "Chapter II · your portrait",  it: "Capitolo II · il tuo ritratto" },
  "acct.cap2.title.trip.one":   { en: "After {n} trip,",             it: "Dopo {n} viaggio," },
  "acct.cap2.title.trip.many":  { en: "After {n} trips,",            it: "Dopo {n} viaggi," },
  "acct.cap2.titleEm":          { en: "we know <em>who you are</em>.", it: "sappiamo <em>chi sei</em>." },
  "acct.cap2.sub":              {
    en: "Not a score. An observation, written in human language, built only on what you truly chose.",
    it: "Non un punteggio. Un'osservazione, scritta in linguaggio umano, costruita solo su ciò che hai davvero scelto.",
  },

  // ── PortraitReal strings ──────────────────────────────────────────────
  "acct.portrait.mark":         { en: "Your portrait",   it: "Il tuo ritratto" },
  "acct.portrait.for":          { en: "— for {name}",    it: "— per {name}" },
  "acct.portrait.afterTrips":   { en: ", after {n} {label}", it: ", dopo {n} {label}" },
  "acct.portrait.evidence":     { en: "What we infer from",  it: "Da cosa lo deduciamo" },
  "acct.portrait.chosen":       { en: "The destinations you truly chose: <em>{list}</em>.", it: "Le mete che hai davvero scelto: <em>{list}</em>." },
  "acct.portrait.confidence.solid":   {
    en: "Synthesised from {n} {label}",
    it: "Sintetizzato da {n} {label}",
  },
  "acct.portrait.confidence.forming": {
    en: "A first portrait, refined with every trip",
    it: "Un primo ritratto, che si affina a ogni viaggio",
  },
  "acct.portrait.confidence.early":   {
    en: "We're still learning who you are — more trips, more precision",
    it: "Stiamo ancora imparando chi sei — più viaggi, più preciso",
  },
  "acct.portrait.paradoxMark":  { en: "Your paradox",          it: "Il tuo paradosso" },
  "acct.portrait.revealedMark": { en: "The revealing gap",      it: "Lo scarto rivelatore" },
  "acct.portrait.revealedText": {
    en: "In words you seek <strong>{said}</strong>, but in choices you move towards <strong>{chose}</strong>.",
    it: "A parole cerchi <strong>{said}</strong>, ma scegliendo vai verso <strong>{chose}</strong>.",
  },
  "acct.portrait.divider":      { en: "your words, and how they change", it: "le tue parole, e come cambiano" },
  "acct.portrait.seek":         { en: "What you seek",     it: "Cosa cerchi" },
  "acct.portrait.avoid":        { en: "What dims you",     it: "Cosa ti spegne" },
  "acct.portrait.evolution":    { en: "How you're changing", it: "Come stai cambiando" },
  "acct.portrait.dnaToggleOpen":  { en: "Hide your travel DNA", it: "Nascondi il tuo DNA di viaggio" },
  "acct.portrait.dnaToggleClose": { en: "See the numbers behind the portrait", it: "Vedi i numeri dietro il ritratto" },
  "acct.portrait.dnaChev":      { en: "⌄",                 it: "⌄" },
  "acct.portrait.equilibrio":   { en: "balance",           it: "equilibrio" },

  // ── Cap III — Da riprendere ────────────────────────────────────────────
  "acct.cap3.eyebrow":          { en: "Chapter III · to revisit",    it: "Capitolo III · da riprendere" },
  "acct.cap3.title.many":       { en: "{n} trips are waiting for you", it: "{n} viaggi ti aspettano" },
  "acct.cap3.title.one":        { en: "One trip is waiting for you",  it: "Un viaggio ti aspetta" },
  "acct.cap3.titleEm":          { en: "<em>halfway</em>.",            it: "<em>a metà strada</em>." },
  "acct.cap3.sub":              {
    en: "\"You stopped. The story isn't over.\" — itineraries opened, saved, suspended.",
    it: "\"Ti eri fermato. La storia non è finita.\" — gli itinerari aperti, salvati, sospesi.",
  },
  "acct.cap3.lastOpened":       { en: "Last opened · {date}",        it: "Ultimo aperto · {date}" },
  "acct.cap3.resume":           { en: "Resume the trip →",           it: "Riprendi il viaggio →" },
  "acct.cap3.explore":          { en: "Explore another direction",    it: "Esplora un'altra direzione" },

  // ── Cap IV — Collezione ───────────────────────────────────────────────
  "acct.cap4.eyebrow":          { en: "Chapter IV · the collection",  it: "Capitolo IV · la collezione" },
  "acct.cap4.title":            { en: "My <em>trips</em>.",           it: "I miei <em>viaggi</em>." },
  "acct.cap4.subItineraries":   { en: "{n} itineraries",             it: "{n} itinerari" },
  "acct.cap4.subDays":          { en: "· over {n} days dreamed",     it: "· oltre {n} giorni di sogno" },
  "acct.cap4.searchPlaceholder":{ en: "Search destination…",         it: "Cerca destinazione…" },
  "acct.cap4.empty":            { en: "No trips match the active filters.", it: "Nessun viaggio corrisponde ai filtri attivi." },

  // Duration filter labels
  "acct.filter.all":            { en: "All",        it: "Tutte" },
  "acct.filter.short":          { en: "≤3 days",    it: "≤3 giorni" },
  "acct.filter.medium":         { en: "4–7 days",   it: "4–7 giorni" },
  "acct.filter.long":           { en: "8+ days",    it: "8+ giorni" },

  // Region tab labels
  "acct.region.all":            { en: "All",        it: "Tutti" },
  "acct.region.europe":         { en: "Europe",     it: "Europa" },
  "acct.region.asia":           { en: "Asia",       it: "Asia" },
  "acct.region.africa":         { en: "Africa",     it: "Africa" },
  "acct.region.americas":       { en: "Americas",   it: "Americhe" },
  "acct.region.oceania":        { en: "Oceania",    it: "Oceania" },

  // ── Cap V / Settings rail ─────────────────────────────────────────────
  "acct.cap5.settingsLabel":    { en: "Settings · management",       it: "Impostazioni · gestione" },
  "acct.cap5.settingsSub":      {
    en: "All set. Whenever you like, you can sign out or adjust preferences.",
    it: "Tutto pronto. Quando vuoi, puoi uscire o sistemare le preferenze.",
  },
  "acct.cap5.openSettings":     { en: "Open settings →",            it: "Apri impostazioni →" },

  // ── Settings Drawer ───────────────────────────────────────────────────
  "acct.drawer.accountLabel":   { en: "Account",      it: "Account" },
  "acct.drawer.settingsLabel":  { en: "Settings",     it: "Impostazioni" },
  "acct.drawer.close":          { en: "Close",        it: "Chiudi" },
  "acct.drawer.profileGroup":   { en: "Profile",      it: "Profilo" },
  "acct.drawer.nameLabel":      { en: "Name",         it: "Nome" },
  "acct.drawer.emailLabel":     { en: "Email",        it: "Email" },
  "acct.drawer.prefsGroup":     { en: "Preferences",  it: "Preferenze" },
  "acct.drawer.accountGroup":   { en: "Account",      it: "Account" },
  "acct.drawer.signout":        { en: "↗ Sign out",   it: "↗ Esci" },
  "acct.drawer.delete":         { en: "Delete account", it: "Elimina account" },

  // ── Saved moments section (MyAccount extra) ───────────────────────────
  "acct.saved.eyebrow":         { en: "Cross-trip bookmark",         it: "Bookmark trasversale" },
  "acct.saved.title":           { en: "<em>Moments</em> that called you.", it: "<em>Momenti</em> che ti hanno chiamato." },
  "acct.saved.count.one":       { en: "1 saved across your trips.",  it: "1 salvato attraverso i tuoi viaggi." },
  "acct.saved.count.many":      { en: "{n} saved across your trips.", it: "{n} salvat{suffix} attraverso i tuoi viaggi." },
  "acct.saved.momentFallback":  { en: "Moment",                      it: "Momento" },
  "acct.saved.dayLabel":        { en: "· day {n}",                   it: "· giorno {n}" },
  "acct.saved.remove":          { en: "Remove",                      it: "Rimuovi" },

  // ── Compare CTA (MyAccount extra) ────────────────────────────────────
  "acct.compare.text":          {
    en: "Want to see <strong>two trips</strong> side by side?",
    it: "Vuoi vedere <strong>due viaggi</strong> uno accanto all'altro?",
  },
  "acct.compare.cta":           { en: "Compare side by side",        it: "Confronta side-by-side" },

  // ── "Genera dal profilo" modal ────────────────────────────────────────
  "acct.modal.eyebrow":         { en: "Profile shortcut",            it: "Shortcut profilo" },
  "acct.modal.title":           { en: "Generate from your profile",  it: "Genera dal tuo profilo" },
  "acct.modal.desc":            {
    en: "Skip the quiz: we start from your aggregated profile across your {n} previous trips. We've pre-filled the fields below from your patterns — only change what you need.",
    it: "Salti il quiz: partiamo dal tuo profilo aggregato sui {n} viaggi precedenti. Abbiamo già riempito i campi sotto dai tuoi pattern — modifica solo se serve.",
  },
  "acct.modal.close":           { en: "Close",   it: "Chiudi" },

  // Compagnia
  "acct.modal.companions":      { en: "Company",         it: "Compagnia" },
  "acct.modal.solo":            { en: "Solo",            it: "Solo/a" },
  "acct.modal.couple":          { en: "As a couple",     it: "In coppia" },
  "acct.modal.friends":         { en: "Friends",         it: "Amici" },
  "acct.modal.family":          { en: "Family",          it: "Famiglia" },

  // Durata
  "acct.modal.duration":        { en: "Duration · <days> days",      it: "Durata · <days> giorni" },
  "acct.modal.durationLabel":   { en: "Duration · {n} days",         it: "Durata · {n} giorni" },

  // Partenza + Data
  "acct.modal.departFrom":      { en: "Departing from",    it: "Parti da" },
  "acct.modal.departPlaceholder":{ en: "Milan, Rome…",     it: "Milano, Roma…" },
  "acct.modal.when":            { en: "When",              it: "Quando" },

  // Budget
  "acct.modal.budget":          { en: "Budget",            it: "Budget" },
  "acct.modal.budget.low":      { en: "Low",               it: "Basso" },
  "acct.modal.budget.mid":      { en: "Medium",            it: "Medio" },
  "acct.modal.budget.high":     { en: "High",              it: "Alto" },
  "acct.modal.budget.unlimited":{ en: "No limit",          it: "Senza limite" },

  // Context override
  "acct.modal.context":         { en: "What's different this time?", it: "Cosa cambia questa volta?" },
  "acct.modal.contextOptional": { en: "(optional)",                  it: "(opzionale)" },
  "acct.modal.contextPlaceholder":{
    en: "E.g. this time with friends, long weekend, no Europe…",
    it: "Es. stavolta con amici, weekend lungo, no Europa…",
  },
  // Quick-fill suggestion chips
  "acct.modal.chip.friends":    { en: "this time with friends",      it: "stavolta con amici" },
  "acct.modal.chip.highBudget": { en: "high budget",                 it: "budget alto" },
  "acct.modal.chip.noEurope":   { en: "no Europe",                   it: "no Europa" },
  "acct.modal.chip.longWknd":   { en: "long weekend",                it: "weekend lungo" },
  "acct.modal.chip.different":  { en: "something different from usual", it: "qualcosa di diverso dal solito" },

  // Submit / loading
  "acct.modal.submit":          { en: "Generate 3 destinations",     it: "Genera 3 destinazioni" },
  "acct.modal.generating":      { en: "Generating…",                 it: "Generando…" },

  // Delete confirm
  "acct.confirm.delete":        {
    en: "Are you sure you want to delete your account? This action is irreversible.",
    it: "Sei sicuro di voler eliminare l'account? L'azione è irreversibile.",
  },

  // ── Short date month abbreviations (for lang-aware shortDate()) ───────
  "acct.month.0":  { en: "Jan", it: "gen" },
  "acct.month.1":  { en: "Feb", it: "feb" },
  "acct.month.2":  { en: "Mar", it: "mar" },
  "acct.month.3":  { en: "Apr", it: "apr" },
  "acct.month.4":  { en: "May", it: "mag" },
  "acct.month.5":  { en: "Jun", it: "giu" },
  "acct.month.6":  { en: "Jul", it: "lug" },
  "acct.month.7":  { en: "Aug", it: "ago" },
  "acct.month.8":  { en: "Sep", it: "set" },
  "acct.month.9":  { en: "Oct", it: "ott" },
  "acct.month.10": { en: "Nov", it: "nov" },
  "acct.month.11": { en: "Dec", it: "dic" },
};
