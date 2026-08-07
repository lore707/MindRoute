// Ritratto (redesign 2026-08 sul mockup) — prefisso "pt.".
//
// Vincoli di copy della specifica, rispettati in ENTRAMBE le lingue:
//   · titolo insight ≤ 6 parole · spiegazione ≤ 12 parole
//   · card hero: 1 frase ≤ 4 parole · tappa evoluzione: titolo ≤ 2 parole,
//     frase ≤ 5 parole · frase "what's next" ≤ 12 parole
//   · linguaggio positivo, mai giudicante
//   · vietati i punteggi ("sei un esploratore al 73%") e i conteggi d'uso
//     ("hai usato l'app 27 volte"): sono metriche, non scoperte.
export const portraitDict: Record<string, { en: string; it: string }> = {
  // ── 1 · Hero ─────────────────────────────────────────────────────────────
  "pt.hero.kick": { en: "Your portrait", it: "Il tuo ritratto" },
  "pt.hero.t1": { en: "This is who", it: "Ecco chi sei" },
  "pt.hero.t2": { en: "you are", it: "" },
  "pt.hero.today": { en: "today.", it: "oggi." },
  "pt.hero.lede": {
    en: "We read your choices, not your answers, to build journeys that actually fit.",
    it: "Leggiamo le tue scelte, non le tue risposte, per costruire viaggi che ti somiglino.",
  },
  "pt.hero.confidence": { en: "Confidence", it: "Confidenza" },
  "pt.hero.basedOn": { en: "Based on", it: "Basato su" },
  "pt.hero.journeys": { en: "{n} journeys", it: "{n} viaggi" },
  "pt.hero.journeyOne": { en: "1 journey", it: "1 viaggio" },
  "pt.hero.taken": { en: "journeys taken", it: "viaggi fatti" },
  "pt.hero.planned": { en: "journeys planned", it: "viaggi pianificati" },
  "pt.hero.confWhy": {
    en: "It grows with every trip you confirm you actually took.",
    it: "Cresce a ogni viaggio che confermi di aver fatto davvero.",
  },

  // ── 2 · Snapshot di oggi (3 card) ────────────────────────────────────────
  "pt.snap.title": { en: "Today's snapshot", it: "Come sei adesso" },
  "pt.snap.energy": { en: "What energizes you", it: "Cosa ti accende" },
  "pt.snap.drain": { en: "What drains you", it: "Cosa ti spegne" },
  "pt.snap.reco": { en: "What we recommend", it: "Cosa ti consigliamo" },
  "pt.snap.impactHigh": { en: "High impact", it: "Impatto alto" },
  "pt.snap.impactLow": { en: "Low impact", it: "Impatto basso" },
  "pt.snap.impactNew": { en: "New perspectives", it: "Prospettive nuove" },
  "pt.snap.recoUnfamiliar": { en: "Somewhere unfamiliar", it: "Un posto mai visto" },
  "pt.snap.recoContinent": { en: "{continent}, never yet", it: "{continent}, mai ancora" },
  "pt.snap.empty": {
    en: "Two more trips and this fills itself in.",
    it: "Ancora due viaggi e questo si riempie da solo.",
  },

  // ── 3 · Evoluzione ───────────────────────────────────────────────────────
  "pt.evo.title": { en: "How you've evolved", it: "Come stai cambiando" },
  "pt.evo.now": { en: "Today", it: "Oggi" },
  "pt.evo.empty": {
    en: "Your story starts here. Come back after your next journey.",
    it: "La tua storia comincia qui. Torna dopo il prossimo viaggio.",
  },
  // Tappe: titolo ≤ 2 parole, frase ≤ 5 parole. Una coppia per polo di ogni asse.
  "pt.evo.exposure.hi.t": { en: "Explorer", it: "Esploratore" },
  "pt.evo.exposure.hi.p": { en: "You chased new places.", it: "Cercavi posti nuovi." },
  "pt.evo.exposure.lo.t": { en: "Deep diver", it: "In profondità" },
  "pt.evo.exposure.lo.p": { en: "You returned, and stayed.", it: "Tornavi, e restavi." },
  "pt.evo.comfort.hi.t": { en: "Challenger", it: "Sfidante" },
  "pt.evo.comfort.hi.p": { en: "You left the easy path.", it: "Lasciavi la strada facile." },
  "pt.evo.comfort.lo.t": { en: "Slow traveller", it: "Viaggio lento" },
  "pt.evo.comfort.lo.p": { en: "You learned to travel gently.", it: "Imparavi a viaggiare piano." },
  "pt.evo.social.hi.t": { en: "Together", it: "In compagnia" },
  "pt.evo.social.hi.p": { en: "You travelled with people.", it: "Viaggiavi con le persone." },
  "pt.evo.social.lo.t": { en: "Solo spirit", it: "In solitudine" },
  "pt.evo.social.lo.p": { en: "You travelled to reconnect.", it: "Viaggiavi per ritrovarti." },
  "pt.evo.matter.hi.t": { en: "Nature seeker", it: "La natura" },
  "pt.evo.matter.hi.p": { en: "Landscapes over landmarks.", it: "Paesaggi più che monumenti." },
  "pt.evo.matter.lo.t": { en: "City reader", it: "Le città" },
  "pt.evo.matter.lo.p": { en: "Streets became your map.", it: "Le strade come mappa." },
  "pt.evo.structure.hi.t": { en: "Planner", it: "Organizzato" },
  "pt.evo.structure.hi.p": { en: "You wanted the day clear.", it: "Volevi la giornata chiara." },
  "pt.evo.structure.lo.t": { en: "Improviser", it: "All'improvviso" },
  "pt.evo.structure.lo.p": { en: "You left room to breathe.", it: "Lasciavi spazio al caso." },

  // ── 4 · Insight ──────────────────────────────────────────────────────────
  "pt.ins.title": { en: "What MindRoute has discovered", it: "Cosa MindRoute ha scoperto" },
  "pt.ins.why": { en: "Why", it: "Perché" },
  "pt.ins.locked": {
    en: "A couple more journeys and the real patterns start to show.",
    it: "Ancora un paio di viaggi e i pattern veri cominciano a vedersi.",
  },

  "pt.in.contLoyal.t": { en: "You keep returning to {continent}.", it: "Torni sempre in {continent}." },
  "pt.in.contLoyal.b": { en: "It has become your comfortable distance.", it: "È diventata la tua distanza comoda." },
  "pt.in.contLoyal.w": { en: "{k} of your {n} journeys are there.", it: "{k} dei tuoi {n} viaggi sono lì." },
  "pt.ch.contLoyal": { en: "A continent I have never travelled to.", it: "Un continente in cui non sono mai stato." },

  "pt.in.contGap.t": { en: "A missing chapter: {continent}.", it: "Un capitolo mancante: {continent}." },
  "pt.in.contGap.b": { en: "Never once, in all your journeys.", it: "Mai, in tutti i tuoi viaggi." },
  "pt.in.contGap.w": { en: "None of your {n} journeys went there.", it: "Nessuno dei tuoi {n} viaggi è andato lì." },
  "pt.ch.contGap": { en: "Somewhere in {continent}, off the obvious route.", it: "Qualcosa in {continent}, fuori dalle rotte ovvie." },

  "pt.in.season.t": { en: "You never travel in winter.", it: "Non viaggi mai d'inverno." },
  "pt.in.season.b": { en: "Cold places look different when empty.", it: "I posti freddi cambiano faccia da vuoti." },
  "pt.in.season.w": { en: "None of your {n} dated journeys fall in winter.", it: "Nessuno dei tuoi {n} viaggi datati cade d'inverno." },
  "pt.ch.season": { en: "A winter journey, somewhere quiet and cold.", it: "Un viaggio d'inverno, in un posto silenzioso e freddo." },

  "pt.in.durLong.t": { en: "You travel long, never rushed.", it: "Viaggi a lungo, mai di corsa." },
  "pt.in.durLong.b": { en: "You need time before a place opens.", it: "Ti serve tempo prima che un posto si apra." },
  "pt.in.durLong.w": { en: "Your journeys last {avg} days on average.", it: "I tuoi viaggi durano in media {avg} giorni." },

  "pt.in.durShort.t": { en: "Your journeys are short escapes.", it: "I tuoi viaggi sono fughe brevi." },
  "pt.in.durShort.b": { en: "Close, quick, and often. That works too.", it: "Vicino, veloce, spesso. Funziona anche così." },
  "pt.in.durShort.w": { en: "Your journeys last {avg} days on average.", it: "I tuoi viaggi durano in media {avg} giorni." },
  "pt.ch.durShort": { en: "One long journey, slower than usual.", it: "Un viaggio lungo, più lento del solito." },

  "pt.in.dreamer.t": { en: "You plan more than you leave.", it: "Progetti più di quanto parti." },
  "pt.in.dreamer.b": { en: "Half your journeys are still waiting.", it: "Metà dei tuoi viaggi aspetta ancora." },
  "pt.in.dreamer.w": { en: "{k} of {n} journeys were confirmed as taken.", it: "{k} viaggi su {n} li hai confermati come fatti." },

  "pt.in.nature.t": { en: "You need nature to feel good.", it: "Ti serve natura per stare bene." },
  "pt.in.nature.b": { en: "It shows in almost everything you choose.", it: "Si vede in quasi tutto quello che scegli." },
  "pt.in.nature.w": { en: "Nature appears {k} times in what you look for.", it: "La natura torna {k} volte in quello che cerchi." },

  "pt.in.unplanned.t": { en: "You leave the day open.", it: "Lasci la giornata aperta." },
  "pt.in.unplanned.b": { en: "Too full a plan takes the trip away.", it: "Un programma troppo pieno ti toglie il viaggio." },
  "pt.in.unplanned.w": { en: "Your profile leans clearly toward improvising.", it: "Il tuo profilo pende chiaramente verso l'improvvisare." },

  "pt.in.comfort.t": { en: "You're choosing the familiar more.", it: "Stai scegliendo più spesso il familiare." },
  "pt.in.comfort.b": { en: "Comfortable, and quieter than you used to be.", it: "Comodo, e più tranquillo di prima." },
  "pt.in.comfort.w": { en: "Your profile has moved toward comfort.", it: "Il tuo profilo si è spostato verso il comfort." },
  "pt.ch.comfort": { en: "Something that pulls me out of the familiar.", it: "Qualcosa che mi tiri fuori dal familiare." },

  "pt.in.solo.t": { en: "You travel to be alone.", it: "Viaggi per stare da solo." },
  "pt.in.solo.b": { en: "Silence is the point, not the side effect.", it: "Il silenzio è lo scopo, non l'effetto collaterale." },
  "pt.in.solo.w": { en: "Your profile leans strongly toward solitude.", it: "Il tuo profilo pende molto verso la solitudine." },

  // ── 5 · Prossimo passo ───────────────────────────────────────────────────
  "pt.next.cta": { en: "Generate a journey designed for you", it: "Genera un viaggio pensato per te" },
  "pt.next.seeWhy": { en: "See why", it: "Vedi perché" },
  "pt.next.sub": { en: "Your next journey should challenge that.", it: "Il prossimo viaggio dovrebbe metterlo alla prova." },
  "pt.next.fallbackT": { en: "The portrait is still forming.", it: "Il ritratto si sta ancora formando." },
  "pt.next.fallbackS": { en: "Travel, and it will learn you.", it: "Viaggia, e imparerà a conoscerti." },

  // ── vuoto ────────────────────────────────────────────────────────────────
  "pt.empty.t": { en: "Nothing to read yet.", it: "Ancora niente da leggere." },
  "pt.empty.s": {
    en: "Your portrait is built from real journeys, not from a quiz. Take the first one.",
    it: "Il tuo ritratto nasce dai viaggi veri, non da un quiz. Fai il primo.",
  },
};
