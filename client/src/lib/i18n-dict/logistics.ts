/**
 * i18n-dict/logistics.ts
 * Stringhe nuove per QuizLogistics.tsx — prefisso "ql."
 * Le chiavi già in i18n.tsx (form.*, months.*, q.*) NON sono qui.
 */
export const logisticsDict: Record<string, { en: string; it: string }> = {

  /* ── Chapter labels (used in eyebrow) ───────────────────────────── */
  "ql.ch2.label":      { en: "Chapter II",                      it: "Capitolo II" },
  "ql.ch3.label":      { en: "Chapter III",                     it: "Capitolo III" },

  /* ── Section status badges ────────────────────────────────────────── */
  "ql.status.open":    { en: "open",                            it: "da impostare" },
  "ql.status.set":     { en: "set",                             it: "impostato" },

  /* ── Month abbreviations (used as button labels; nm stays as stored id) */
  "ql.months.jan":     { en: "Jan",  it: "Gen" },
  "ql.months.feb":     { en: "Feb",  it: "Feb" },
  "ql.months.mar":     { en: "Mar",  it: "Mar" },
  "ql.months.apr":     { en: "Apr",  it: "Apr" },
  "ql.months.may":     { en: "May",  it: "Mag" },
  "ql.months.jun":     { en: "Jun",  it: "Giu" },
  "ql.months.jul":     { en: "Jul",  it: "Lug" },
  "ql.months.aug":     { en: "Aug",  it: "Ago" },
  "ql.months.sep":     { en: "Sep",  it: "Set" },
  "ql.months.oct":     { en: "Oct",  it: "Ott" },
  "ql.months.nov":     { en: "Nov",  it: "Nov" },
  "ql.months.dec":     { en: "Dec",  it: "Dic" },

  /* ── Effort slider stop labels (track ticks) ─────────────────────── */
  "ql.effort.stop.0":  { en: "Low",     it: "Basso" },
  "ql.effort.stop.1":  { en: "Easy",    it: "Facile" },
  "ql.effort.stop.2":  { en: "Normal",  it: "Normale" },
  "ql.effort.stop.3":  { en: "Active",  it: "Attivo" },
  "ql.effort.stop.4":  { en: "High",    it: "Alto" },
  "ql.effort.stop.5":  { en: "Extreme", it: "Estremo" },

  /* ── TripCard footer ─────────────────────────────────────────────── */
  "ql.tc.stamped":     { en: "stamped",                         it: "timbrato" },

  /* ── Chapter II header ───────────────────────────────────────────── */
  "ql.ch2.strip":      { en: "Chapter II · The frame",          it: "Capitolo II · La cornice" },
  "ql.ch2.anchors":    { en: "{n} of 5 anchors set",             it: "{n} di 5 ancore impostate" },
  "ql.ch2.eyebrow":    { en: "giving it real shape",             it: "dargli una forma reale" },
  "ql.ch2.title":      { en: "Now, the <em>practical</em><br />shape of it.", it: "Ora, la <em>forma pratica</em><br />di tutto questo." },
  "ql.ch2.sub":        { en: "Five quick anchors — budget, time, length, company, departure. We'll keep it light. The texture comes next.", it: "Cinque ancore rapide — budget, periodo, durata, compagnia, partenza. Ci vorrà poco. La texture arriva dopo." },

  /* ── Chapter III header ──────────────────────────────────────────── */
  "ql.ch3.strip":      { en: "Chapter III · The texture",        it: "Capitolo III · La texture" },
  "ql.ch3.textures":   { en: "{n} of 5 textures set",            it: "{n} di 5 texture impostate" },
  "ql.ch3.eyebrow":    { en: "the texture of your days",         it: "la texture delle tue giornate" },
  "ql.ch3.title":      { en: "And the <em>texture</em><br />of your days.", it: "E la <em>texture</em><br />delle tue giornate." },
  "ql.ch3.sub":        { en: "How you move, where you sleep, what you eat, how hard you push your body. The small grain that makes a trip yours.", it: "Come ti muovi, dove dormi, cosa mangi, quanto spingi il corpo. Il piccolo dettaglio che rende un viaggio davvero tuo." },

  /* ── Section titles & hints ──────────────────────────────────────── */
  /* §1 Budget */
  "ql.s1.title":       { en: "How much do you want to spend?",   it: "Quanto vuoi spendere?" },
  "ql.s1.hint":        { en: "Per person, all in — flights, stays, food, the whole texture.", it: "Per persona, tutto incluso — voli, soggiorni, cibo, ogni dettaglio." },
  "ql.s1.est.label":   { en: "Estimated for your trip",          it: "Stima per il tuo viaggio" },
  "ql.s1.est.empty":   { en: "Pick a tier and a duration to see a range", it: "Scegli una fascia e una durata per vedere la stima" },
  "ql.s1.open.wallet": { en: "Hide the numbers — surprise me",   it: "Nascondi i numeri — sorprendimi" },

  /* §1 Budget tiers */
  "ql.tier.shoestring.lbl":   { en: "Local & simple",       it: "Locale e semplice" },
  "ql.tier.shoestring.range": { en: "Under €500 pp",        it: "Meno di €500 pp" },
  "ql.tier.mid.lbl":          { en: "Comfortable middle",   it: "Comfort equilibrato" },
  "ql.tier.mid.range":        { en: "€500 – €1,500 pp",     it: "€500 – €1.500 pp" },
  "ql.tier.upper.lbl":        { en: "Considered comfort",   it: "Comfort scelto" },
  "ql.tier.upper.range":      { en: "€1,500 – €3,000 pp",   it: "€1.500 – €3.000 pp" },
  "ql.tier.open.lbl":         { en: "Money isn't the limit", it: "Il denaro non è un limite" },
  "ql.tier.open.range":       { en: "€3,000+ pp",            it: "€3.000+ pp" },

  /* §2 When */
  "ql.s2.title":       { en: "When do you want to go?",     it: "Quando vuoi partire?" },
  "ql.s2.hint":        { en: "Fixed dates, a flexible month, or just a season — whatever you know right now.", it: "Date fisse, un mese flessibile, o solo una stagione — qualsiasi cosa tu sappia adesso." },
  "ql.when.dates":     { en: "Exact dates",                 it: "Date precise" },
  "ql.when.month":     { en: "Flexible month",              it: "Mese flessibile" },
  "ql.when.period":    { en: "Flexible period",             it: "Periodo flessibile" },
  "ql.when.leaving":   { en: "Leaving",                     it: "Partenza" },
  "ql.when.returning": { en: "Returning",                   it: "Ritorno" },
  "ql.when.picked":    { en: "{n} picked",                  it: "{n} selezionati" },
  "ql.period.spring":  { en: "Spring",   it: "Primavera" },
  "ql.period.summer":  { en: "Summer",   it: "Estate" },
  "ql.period.autumn":  { en: "Autumn",   it: "Autunno" },
  "ql.period.winter":  { en: "Winter",   it: "Inverno" },
  "ql.period.anytime": { en: "Anytime",  it: "Quando capita" },

  /* §3 Duration */
  "ql.s3.title":       { en: "How long do you have?",       it: "Quanto tempo hai?" },
  "ql.s3.hint":        { en: "A weekend is its own thing. Two weeks is a different animal entirely.", it: "Un weekend è una cosa. Due settimane sono tutt'altro." },
  "ql.dur.weekend.lbl":  { en: "Long weekend",              it: "Weekend lungo" },
  "ql.dur.weekend.meta": { en: "3–4 days",                  it: "3–4 giorni" },
  "ql.dur.week.lbl":     { en: "One week",                  it: "Una settimana" },
  "ql.dur.week.meta":    { en: "5–7 days",                  it: "5–7 giorni" },
  "ql.dur.twoweek.lbl":  { en: "10–14 days",               it: "10–14 giorni" },
  "ql.dur.twoweek.meta": { en: "two unhurried weeks",       it: "due settimane senza fretta" },

  /* §4 Who */
  "ql.s4.title":        { en: "Who are you traveling with?", it: "Con chi viaggi?" },
  "ql.s4.hint":         { en: "Changes everything about pace, places, and the way we plan.", it: "Cambia tutto: ritmo, luoghi e il modo in cui pianifichiamo." },
  "ql.who.solo.lbl":    { en: "Solo",                        it: "Da solo" },
  "ql.who.solo.sub":    { en: "just me",                     it: "solo io" },
  "ql.who.partner.lbl": { en: "Partner",                     it: "Partner" },
  "ql.who.partner.sub": { en: "the two of us",               it: "noi due" },
  "ql.who.friends.lbl": { en: "Friends",                     it: "Amici" },
  "ql.who.friends.sub": { en: "a small group",               it: "un piccolo gruppo" },
  "ql.who.family.lbl":  { en: "Family",                      it: "Famiglia" },
  "ql.who.family.sub":  { en: "with kids",                   it: "con bambini" },

  /* Group form */
  "ql.group.head.family":  { en: "Who's in the family?",   it: "Chi è in famiglia?" },
  "ql.group.head.friends": { en: "Who's in the group?",    it: "Chi è nel gruppo?" },
  "ql.group.adults":       { en: "Adults",                 it: "Adulti" },
  "ql.group.children":     { en: "Children",               it: "Bambini" },
  "ql.group.children.sub": { en: "under 18",               it: "under 18" },
  "ql.group.aria.fewer.adults":   { en: "Fewer adults",    it: "Meno adulti" },
  "ql.group.aria.more.adults":    { en: "More adults",     it: "Più adulti" },
  "ql.group.aria.fewer.children": { en: "Fewer children",  it: "Meno bambini" },
  "ql.group.aria.more.children":  { en: "More children",   it: "Più bambini" },
  "ql.group.kids.ages.lbl":       { en: "Each child's age", it: "Età di ogni bambino" },
  "ql.group.kids.age.placeholder":{ en: "age",              it: "età" },

  /* §5 Departure */
  "ql.s5.title":       { en: "Where are you departing from?", it: "Da dove parti?" },
  "ql.s5.hint":        { en: "So we can price the journey honestly — and find flights you'll actually take.", it: "Così possiamo stimare il viaggio in modo onesto e trovare voli che prenderai davvero." },
  "ql.s5.placeholder": { en: "e.g. Milan, London, New York…", it: "es. Milano, Londra, New York…" },
  "ql.s5.saved":       { en: "Saved · ",                      it: "Salvate · " },

  /* ── Chapter II sidebar ──────────────────────────────────────────── */
  "ql.side.ch2.why.head":    { en: "Why these five",             it: "Perché queste cinque" },
  "ql.side.ch2.why.body":    { en: "These are the practical anchors that turn an idea into an itinerary. We'll quote and time everything around them — and surface places that match.", it: "Sono le ancore pratiche che trasformano un'idea in un itinerario. Quoteremo e tempificheremo tutto attorno a queste — e faremo emergere i luoghi che ci corrispondono." },
  "ql.side.ch2.back.lbl":    { en: "← Back to what to avoid",   it: "← Torna a cosa evitare" },
  "ql.side.ch2.next.lbl":    { en: "Continue to the texture →", it: "Continua verso la texture →" },

  /* TripCard */
  "ql.tc.head":         { en: "Your trip so far",        it: "Il tuo viaggio finora" },
  "ql.tc.departure":    { en: "departure",               it: "partenza" },
  "ql.tc.somewhere":    { en: "somewhere in Asia",       it: "da qualche parte in Asia" },
  "ql.tc.triptype":     { en: "Trip type",               it: "Tipo di viaggio" },
  "ql.tc.rhythm":       { en: "Rhythm",                  it: "Ritmo" },
  "ql.tc.feeling":      { en: "Feeling",                 it: "Sensazione" },
  "ql.tc.avoid":        { en: "Avoid",                   it: "Evitare" },
  "ql.tc.avoid.val":    { en: "{n} patterns",            it: "{n} pattern" },
  "ql.tc.when":         { en: "When",                    it: "Periodo" },
  "ql.tc.company":      { en: "Company",                 it: "Compagnia" },
  "ql.tc.group":        { en: "Group",                   it: "Gruppo" },
  "ql.tc.tier":         { en: "Tier",                    it: "Fascia" },
  "ql.tc.length":       { en: "Length",                  it: "Durata" },
  "ql.tc.tbchosen":     { en: "to be chosen",            it: "da scegliere" },
  "ql.tc.adult.s":      { en: "adult",                   it: "adulto" },
  "ql.tc.adult.p":      { en: "adults",                  it: "adulti" },
  "ql.tc.kid.s":        { en: "kid",                     it: "bambino" },
  "ql.tc.kid.p":        { en: "kids",                    it: "bambini" },
  "ql.tc.est.pending":  { en: "estimate pending",        it: "stima in corso" },
  "ql.tc.discovery":    { en: "Discovery",               it: "Scoperta" },
  "ql.tc.flowing":      { en: "Flowing",                 it: "Fluente" },
  "ql.tc.feelplace":    { en: "Feel the place",          it: "Sentire il luogo" },

  /* ── Chapter III sections ────────────────────────────────────────── */
  /* §1 Movement */
  "ql.t1.title":       { en: "How do you want to move?",  it: "Come vuoi muoverti?" },
  "ql.t1.hint":        { en: "This shapes the entire structure of your itinerary.", it: "Questo definisce la struttura dell'intero itinerario." },
  "ql.move.base.lbl":  { en: "Base camp",                 it: "Base fissa" },
  "ql.move.base.meta": { en: "One place, deep immersion. You wake up in the same bed each morning.", it: "Un posto, immersione totale. Ti svegli nello stesso letto ogni mattina." },
  "ql.move.two.lbl":   { en: "Two stops",                 it: "Due tappe" },
  "ql.move.two.meta":  { en: "Two contrasting zones. A capital and a coast, a mountain and a city.", it: "Due zone diverse. Una capitale e una costa, una montagna e una città." },
  "ql.move.disc.lbl":  { en: "Discovery",                 it: "Scoperta" },
  "ql.move.disc.meta": { en: "Move, explore, change. A route across regions — never twice in the same place.", it: "Muoversi, esplorare, cambiare. Un percorso tra regioni — mai due volte nello stesso posto." },

  /* §2 Sleep */
  "ql.t2.title":           { en: "Where do you prefer to sleep?",         it: "Dove preferisci dormire?" },
  "ql.t2.hint":            { en: "Shapes hotel and stay recommendations. Price is per room, per night.", it: "Orienta le raccomandazioni su hotel e soggiorni. Prezzo a camera, per notte." },
  "ql.sleep.hostel.name":  { en: "Hostel · Capsule",                      it: "Ostello · Capsule" },
  "ql.sleep.hostel.meta":  { en: "Shared rooms, capsule pods, the bare necessities.", it: "Camere condivise, capsule, lo stretto necessario." },
  "ql.sleep.hostel.range": { en: "€0 – 30",                               it: "€0 – 30" },
  "ql.sleep.budget.name":  { en: "Budget but nice",                       it: "Economico ma carino" },
  "ql.sleep.budget.meta":  { en: "Honest little hotels, guesthouses, character intact.", it: "Piccoli hotel onesti, guest house, carattere intatto." },
  "ql.sleep.budget.range": { en: "€30 – 60",                              it: "€30 – 60" },
  "ql.sleep.mid.name":     { en: "Mid-comfort",                           it: "Comfort medio" },
  "ql.sleep.mid.meta":     { en: "Real beds, a fridge, a city-view sometimes.", it: "Letti veri, un frigo, vista sulla città a volte." },
  "ql.sleep.mid.range":    { en: "€60 – 120",                             it: "€60 – 120" },
  "ql.sleep.bout.name":    { en: "Boutique · Design",                     it: "Boutique · Design" },
  "ql.sleep.bout.meta":    { en: "Stays you remember as part of the trip.", it: "Soggiorni che ricordi come parte del viaggio." },
  "ql.sleep.bout.range":   { en: "€120 – 200",                            it: "€120 – 200" },
  "ql.sleep.lux.name":     { en: "Luxury",                                it: "Lusso" },
  "ql.sleep.lux.meta":     { en: "The hotel itself is one of the destinations.", it: "L'hotel stesso è una delle destinazioni." },
  "ql.sleep.lux.range":    { en: "€200+",                                 it: "€200+" },
  "ql.sleep.mix.name":     { en: "Mix it",                                it: "Mix" },
  "ql.sleep.mix.meta":     { en: "Save some nights, splurge on others — your call.", it: "Risparmi su alcune notti, spendi su altre — come vuoi." },
  "ql.sleep.mix.range":    { en: "varies",                                it: "variabile" },

  /* §3 Food */
  "ql.t3.title":            { en: "How do you want to eat?",               it: "Come vuoi mangiare?" },
  "ql.t3.hint":             { en: "Food is part of the journey. Tell us how much of one.", it: "Il cibo è parte del viaggio. Dicci quanto." },
  "ql.food.street.name":    { en: "Street food & markets",                 it: "Street food e mercati" },
  "ql.food.street.meta":    { en: "Plastic stools, paper bowls, lines that locals queue in.", it: "Sgabelli di plastica, ciotole di carta, file di soli locali." },
  "ql.food.street.range":   { en: "€5 – 15",                               it: "€5 – 15" },
  "ql.food.local.name":     { en: "Budget local mix",                      it: "Mix locale economico" },
  "ql.food.local.meta":     { en: "Family-run kitchens, neighborhood favorites.", it: "Cucine di famiglia, posti del quartiere." },
  "ql.food.local.range":    { en: "€10 – 25",                              it: "€10 – 25" },
  "ql.food.good.name":      { en: "Some good restaurants",                 it: "Qualche buon ristorante" },
  "ql.food.good.meta":      { en: "Worth dressing up a bit for. Wine on the table.", it: "Vale la pena di vestirsi un po'. Vino in tavola." },
  "ql.food.good.range":     { en: "€20 – 50",                              it: "€20 – 50" },
  "ql.food.foodie.name":    { en: "Foodie — food IS the trip",             it: "Foodie — il cibo È il viaggio" },
  "ql.food.foodie.meta":    { en: "Planned around tables. Tastings, chef-led, slow lunches.", it: "Pianificato intorno ai tavoli. Degustazioni, chef's table, pranzi lenti." },
  "ql.food.foodie.range":   { en: "€40+",                                  it: "€40+" },
  "ql.food.mix.name":       { en: "Mix it",                                it: "Mix" },
  "ql.food.mix.meta":       { en: "Street food daily, one big dinner per stop.", it: "Street food ogni giorno, una cena importante per tappa." },
  "ql.food.mix.range":      { en: "varies",                                it: "variabile" },

  /* §4 Effort */
  "ql.t4.title":        { en: "How much physical effort?",     it: "Quanto sforzo fisico?" },
  "ql.t4.hint":         { en: "Changes the kind of days we plan — from cable-cars to multi-day treks.", it: "Cambia il tipo di giornate che pianifichiamo — dalle funivie ai trekking di più giorni." },
  "ql.effort.0.lbl":    { en: "Comfort",                       it: "Comfort" },
  "ql.effort.0.copy":   { en: "Taxis at the door, escalators welcome. We won't put you on a 6km walking day.", it: "Taxi alla porta, scale mobili benvenute. Non ti metteremo in una giornata da 6 km a piedi." },
  "ql.effort.1.lbl":    { en: "Easy",                          it: "Leggero" },
  "ql.effort.1.copy":   { en: "A little walking, plenty of stops. We pace gently.", it: "Un po' di cammino, tante soste. Andiamo con calma." },
  "ql.effort.2.lbl":    { en: "Normal",                        it: "Normale" },
  "ql.effort.2.copy":   { en: "Happy on your feet most of the day. Standard city pace.", it: "In piedi per la maggior parte della giornata. Ritmo cittadino standard." },
  "ql.effort.3.lbl":    { en: "Active",                        it: "Attivo" },
  "ql.effort.3.copy":   { en: "Long walking days, hikes up to half a day, varied terrain.", it: "Giornate lunghe a piedi, escursioni fino a mezza giornata, terreni variati." },
  "ql.effort.4.lbl":    { en: "High",                          it: "Intenso" },
  "ql.effort.4.copy":   { en: "All-day walking, real hikes, early mountain starts. You like the burn.", it: "Cammino tutto il giorno, escursioni vere, partenze in montagna all'alba. Ti piace la fatica." },
  "ql.effort.5.lbl":    { en: "Extreme",                       it: "Estremo" },
  "ql.effort.5.copy":   { en: "Serious trekking, multi-day routes, bring the boots.", it: "Trekking serio, percorsi di più giorni, metti gli scarponi." },

  /* §5 Diet */
  "ql.t5.title":        { en: "Any dietary restrictions?",     it: "Restrizioni alimentari?" },
  "ql.t5.hint":         { en: "So we never point you toward the wrong kind of place.", it: "Così evitiamo di indirizzarti verso posti che per te non funzionerebbero." },
  "ql.diet.none":       { en: "I eat everything",              it: "Mangio tutto" },
  "ql.diet.veg":        { en: "Vegetarian",                    it: "Vegetariano" },
  "ql.diet.vegan":      { en: "Vegan",                         it: "Vegano" },
  "ql.diet.gf":         { en: "Gluten-free",                   it: "Senza glutine" },
  "ql.diet.lactose":    { en: "Lactose-free",                  it: "Senza lattosio" },
  "ql.diet.halal":      { en: "Halal",                         it: "Halal" },
  "ql.diet.kosher":     { en: "Kosher",                        it: "Kosher" },
  "ql.diet.allergy":    { en: "Specific allergies",            it: "Allergie specifiche" },
  "ql.diet.unrestricted": { en: "unrestricted",                it: "senza restrizioni" },
  "ql.diet.flagged":    { en: "{n} flagged",                   it: "{n} segnalate" },

  /* §6 Notes */
  "ql.t6.title":        { en: "Anything else we should know?", it: "C'è qualcos'altro che dovremmo sapere?" },
  "ql.t6.hint":         { en: "Accessibility, fears, special needs — or just something important to mention.", it: "Accessibilità, paure, esigenze particolari — o qualsiasi cosa importante da tenere presente." },
  "ql.t6.head.lbl":     { en: "Whatever you'd tell a friend who's planning this for you", it: "Quello che diresti a un amico che lo sta pianificando per te" },
  "ql.t6.optional":     { en: "Optional",                      it: "Opzionale" },
  "ql.t6.placeholder":  { en: "For example: I'm afraid of flights longer than 4 hours, I need wheelchair accessibility, I prefer ground floor rooms…", it: "Per esempio: temo i voli sopra le 4 ore, ho bisogno di accessibilità per sedia a rotelle, preferisco camere al piano terra…" },
  "ql.t6.noted":        { en: "noted",                         it: "annotato" },
  "ql.t6.optional.status": { en: "optional",                   it: "opzionale" },
  "ql.t6.words":        { en: "{n} words",                     it: "{n} parole" },

  /* Note suggestions */
  "ql.note.flight":     { en: "I'm afraid of long flights",    it: "Temo i voli lunghi" },
  "ql.note.wheelchair": { en: "I need wheelchair access",       it: "Ho bisogno di accessibilità per sedia a rotelle" },
  "ql.note.baby":       { en: "I'm traveling with a baby",     it: "Viaggio con un neonato" },
  "ql.note.altitude":   { en: "Please avoid altitude",         it: "Evitare l'altitudine" },

  /* ── Chapter III sidebar ─────────────────────────────────────────── */
  "ql.side.ch3.why.head":  { en: "Why this matters",          it: "Perché conta" },
  "ql.side.ch3.why.body":  { en: "Two travelers with the same budget can have completely different trips. These six knobs decide whether yours feels rough and real, or smooth and curated — or anything in between.", it: "Due viaggiatori con lo stesso budget possono avere viaggi completamente diversi. Questi sei parametri decidono se il tuo sarà grezzo e reale, levigato e curato — o qualunque via di mezzo." },
  "ql.side.ch3.back.lbl":  { en: "← Back to the frame",      it: "← Torna alla cornice" },
  "ql.side.ch3.next.lbl":  { en: "Show me where this can take me →", it: "Fammi vedere dove può portarmi →" },

  /* RecipeCard */
  "ql.recipe.head":     { en: "The texture · your recipe",    it: "La texture · la tua ricetta" },
  "ql.recipe.title":    { en: "A trip with this grain",       it: "Un viaggio con questo ritmo" },
  "ql.recipe.movement": { en: "Movement",                     it: "Movimento" },
  "ql.recipe.sleep":    { en: "Sleep",                        it: "Sonno" },
  "ql.recipe.food":     { en: "Food",                         it: "Cibo" },
  "ql.recipe.effort":   { en: "Effort",                       it: "Sforzo" },
  "ql.recipe.diet":     { en: "Diet",                         it: "Dieta" },
  "ql.recipe.notes":    { en: "Notes",                        it: "Note" },
  "ql.recipe.tbchosen": { en: "to be chosen",                 it: "da scegliere" },

  /* Diet summary */
  "ql.diet.sum.none":   { en: "I eat everything",             it: "Mangio tutto" },

  /* Privacy (repeated in both chapters) */
  "ql.privacy.head":    { en: "Privacy",                      it: "Privacy" },
  "ql.privacy.body":    { en: "Your answers shape your destinations. Never stored, never shared.", it: "Le tue risposte servono solo a costruire il viaggio. Non vengono salvate né condivise." },
};
