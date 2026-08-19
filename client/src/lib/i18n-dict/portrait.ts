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
  // Il titolo e' spezzato in DUE righe, e la seconda tiene incollato l'accento
  // alla parola che lo precede: "you are today." / "sei oggi.".
  // Prima la seconda riga era vuota in italiano, e t() ricadeva sull'inglese —
  // a schermo usciva "Ecco chi sei you are oggi.". Nessuna chiave vuota, mai.
  "pt.hero.l1": { en: "This is who", it: "Ecco chi" },
  "pt.hero.l2": { en: "you are", it: "sei" },
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

  // Ancoraggio della tappa: il VIAGGIO, non l'anno.
  "pt.evo.after": { en: "after {dest}", it: "dopo {dest}" },
  "pt.evo.nth": { en: "change {n}", it: "{n}° cambiamento" },
  "pt.evo.open": { en: "Read why", it: "Leggi perché" },
  "pt.evo.detailK": { en: "What it says about you", it: "Cosa dice di te" },
  "pt.evo.evidenceK": { en: "Where this comes from", it: "Da dove viene" },
  "pt.evo.evidence": {
    en: "Your profile moved on this axis between two trips — {from} became {to}.",
    it: "Il tuo profilo si è mosso su questo asse fra due viaggi: da {from} a {to}.",
  },
  "pt.evo.evidenceTrip": {
    en: "It showed up around {dest}{when}.",
    it: "Si è visto attorno a {dest}{when}.",
  },
  "pt.evo.nowT": { en: "Where you're heading", it: "Dove stai andando" },
  "pt.evo.nowK": { en: "Now", it: "Adesso" },
  "pt.evo.nowTryK": { en: "What to try next", it: "Cosa provare adesso" },
  // Si mostra solo quando la lettura e' stata scritta sui viaggi di QUESTA
  // persona: e' la differenza fra un ritratto e un oroscopo, e va detta.
  "pt.evo.personal": { en: "Written on your own trips", it: "Scritta sui tuoi viaggi" },

  // La LETTURA: cosa quel cambiamento dice della persona, non del viaggio.
  // È il cuore del capitolo — il viaggio usato come specchio.
  "pt.evo.exposure.hi.why": {
    en: "You stopped asking a place to be reassuring. Curiosity is winning over the need to know in advance how it will go.",
    it: "Hai smesso di chiedere a un posto di essere rassicurante. La curiosità sta vincendo sul bisogno di sapere in anticipo come andrà.",
  },
  "pt.evo.exposure.lo.why": {
    en: "You went back instead of moving on. Depth started mattering more than novelty — you wanted to know a place, not collect it.",
    it: "Sei tornato invece di andare oltre. La profondità ha iniziato a contare più della novità: volevi conoscere un posto, non collezionarlo.",
  },
  "pt.evo.comfort.hi.why": {
    en: "You began choosing trips that could go wrong. That usually happens when the rest of life feels a little too predictable.",
    it: "Hai iniziato a scegliere viaggi che potevano andare storti. Di solito succede quando il resto della vita comincia a sembrare troppo prevedibile.",
  },
  "pt.evo.comfort.lo.why": {
    en: "You stopped needing the trip to prove something. Resting became a legitimate reason to leave, not a wasted day.",
    it: "Hai smesso di chiedere al viaggio di dimostrare qualcosa. Riposare è diventata una ragione legittima per partire, non un giorno sprecato.",
  },
  "pt.evo.social.hi.why": {
    en: "You started building trips around people rather than places. The destination became the excuse, not the point.",
    it: "Hai iniziato a costruire i viaggi attorno alle persone più che ai posti. La destinazione è diventata la scusa, non il punto.",
  },
  "pt.evo.social.lo.why": {
    en: "You started travelling to hear yourself think. Solitude stopped being a compromise and became the reason.",
    it: "Hai iniziato a viaggiare per sentirti pensare. La solitudine ha smesso di essere un ripiego ed è diventata la ragione.",
  },
  "pt.evo.matter.hi.why": {
    en: "Landscape took over from architecture. You look for places that don't need to be explained to be understood.",
    it: "Il paesaggio ha preso il posto dell'architettura. Cerchi luoghi che non hanno bisogno di essere spiegati per essere capiti.",
  },
  "pt.evo.matter.lo.why": {
    en: "Cities came back. You want places with people in them: layers, noise, things that only happen where someone lives.",
    it: "Le città sono tornate. Vuoi posti abitati: stratificazioni, rumore, cose che succedono solo dove qualcuno vive.",
  },
  "pt.evo.structure.hi.why": {
    en: "You started wanting the day mapped out. Often that's not rigidity — it's wanting to spend energy on the trip, not on deciding.",
    it: "Hai iniziato a volere la giornata già disegnata. Spesso non è rigidità: è voler spendere energia nel viaggio, non nel decidere.",
  },
  "pt.evo.structure.lo.why": {
    en: "You started leaving the day open. What you're protecting is the chance of something you couldn't have planned.",
    it: "Hai iniziato a lasciare la giornata aperta. Quello che stai proteggendo è la possibilità di qualcosa che non potevi programmare.",
  },

  // Il nodo finale, versione BREVE (≤5 parole): chiuso deve dire dove stai
  // andando, non ripetere la frase della tappa precedente.
  "pt.evo.dirShort.exposure.hi": { en: "Toward the unfamiliar.", it: "Verso ciò che non conosci." },
  "pt.evo.dirShort.exposure.lo": { en: "Toward going back deeper.", it: "Verso il tornare più a fondo." },
  "pt.evo.dirShort.comfort.hi": { en: "Toward friction.", it: "Verso l'attrito." },
  "pt.evo.dirShort.comfort.lo": { en: "Toward rest.", it: "Verso il riposo." },
  "pt.evo.dirShort.social.hi": { en: "Toward company.", it: "Verso la compagnia." },
  "pt.evo.dirShort.social.lo": { en: "Toward solitude.", it: "Verso la solitudine." },
  "pt.evo.dirShort.matter.hi": { en: "Toward wide landscapes.", it: "Verso i paesaggi larghi." },
  "pt.evo.dirShort.matter.lo": { en: "Toward lived-in cities.", it: "Verso le città abitate." },
  "pt.evo.dirShort.structure.hi": { en: "Toward a clearer plan.", it: "Verso un piano più chiaro." },
  "pt.evo.dirShort.structure.lo": { en: "Toward leaving room.", it: "Verso il lasciare spazio." },

  // Il nodo finale: la DIREZIONE + cosa provare, non un polo ripetuto.
  "pt.evo.dir.exposure.hi": {
    en: "You're moving toward the unfamiliar. The next step isn't further — it's somewhere you have no reference for at all.",
    it: "Ti stai spostando verso ciò che non conosci. Il passo successivo non è più lontano: è un posto di cui non hai proprio riferimenti.",
  },
  "pt.evo.dir.exposure.lo": {
    en: "You're moving toward returning. Try going back to one place you liked and staying twice as long.",
    it: "Ti stai spostando verso il ritorno. Prova a tornare in un posto che ti è piaciuto e restarci il doppio.",
  },
  "pt.evo.dir.comfort.hi": {
    en: "You're moving toward friction. The interesting move now is a trip whose outcome you genuinely can't predict.",
    it: "Ti stai spostando verso l'attrito. La mossa interessante adesso è un viaggio di cui non puoi davvero prevedere l'esito.",
  },
  "pt.evo.dir.comfort.lo": {
    en: "You're moving toward rest. The next trip should have fewer stops than you think you need, not more.",
    it: "Ti stai spostando verso il riposo. Il prossimo viaggio dovrebbe avere meno tappe di quante pensi di volerne, non di più.",
  },
  "pt.evo.dir.social.hi": {
    en: "You're moving toward company. Try a place where meeting people is the structure, not a coincidence.",
    it: "Ti stai spostando verso la compagnia. Prova un posto dove incontrare persone è la struttura, non una coincidenza.",
  },
  "pt.evo.dir.social.lo": {
    en: "You're moving toward solitude. Try somewhere where being alone is easy and doesn't have to be explained.",
    it: "Ti stai spostando verso la solitudine. Prova un posto dove stare da soli è facile e non va spiegato a nessuno.",
  },
  "pt.evo.dir.matter.hi": {
    en: "You're moving toward nature. The next step is a landscape big enough to make the plan feel unimportant.",
    it: "Ti stai spostando verso la natura. Il passo successivo è un paesaggio abbastanza grande da far sembrare il programma poco importante.",
  },
  "pt.evo.dir.matter.lo": {
    en: "You're moving toward cities. Try one you'd never have picked for its landmarks — pick it for how people live there.",
    it: "Ti stai spostando verso le città. Provane una che non avresti mai scelto per i monumenti: scegliila per come ci si vive.",
  },
  "pt.evo.dir.structure.hi": {
    en: "You're moving toward structure. Keep the plan, but leave one day of the trip deliberately undecided.",
    it: "Ti stai spostando verso la struttura. Tieni il programma, ma lascia un giorno del viaggio deliberatamente non deciso.",
  },
  "pt.evo.dir.structure.lo": {
    en: "You're moving toward improvising. Try a destination where improvising is actually possible — not one that punishes it.",
    it: "Ti stai spostando verso l'improvvisare. Prova una destinazione dove improvvisare è davvero possibile, non una che lo punisce.",
  },

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

  // La lettura lunga di ogni scoperta: cosa vuol dire davvero, e cosa
  // proveremmo al posto tuo. Si apre al clic — in pillola resta il titolo.
  "pt.ins.detailK": { en: "What this really means", it: "Cosa vuol dire davvero" },
  "pt.ins.tryK": { en: "What we'd try instead", it: "Cosa proveremmo al posto tuo" },
  "pt.ins.useK": { en: "Use this for my next trip", it: "Usalo per il prossimo viaggio" },

  "pt.in.contLoyal.d": {
    en: "One continent isn't a limit — it's a language you've learned. The risk is that comfort starts choosing for you: you go where you already know how things work, and call it preference.",
    it: "Un continente non è un limite: è una lingua che hai imparato. Il rischio è che sia la comodità a scegliere per te — vai dove sai già come funzionano le cose, e lo chiami gusto.",
  },
  "pt.in.contGap.d": {
    en: "A continent you've never touched isn't a gap in a collection. It's a set of assumptions you've never had to check.",
    it: "Un continente mai toccato non è un buco in una collezione. È un insieme di convinzioni che non hai mai dovuto verificare.",
  },
  "pt.in.season.d": {
    en: "Travelling only in the warm months means you've only met places at their most crowded and most performed. Off season the same place has to be itself.",
    it: "Viaggiare solo nei mesi caldi vuol dire aver conosciuto i posti solo nella loro versione più affollata e più recitata. Fuori stagione lo stesso posto è costretto a essere sé stesso.",
  },
  "pt.in.durLong.d": {
    en: "Long trips say you don't want to consume a place, you want to inhabit it. It also means you're better than most at the second week — where most people get restless.",
    it: "I viaggi lunghi dicono che non vuoi consumare un posto, vuoi abitarlo. Vuol dire anche che sei più bravo della media nella seconda settimana, dove i più si annoiano.",
  },
  "pt.in.durShort.d": {
    en: "Short trips aren't a compromise: they're a rhythm. But they push you toward places that are easy to reach — and easy to reach is rarely where you're surprised.",
    it: "I viaggi brevi non sono un ripiego: sono un ritmo. Però ti spingono verso posti facili da raggiungere, e ciò che è facile da raggiungere raramente è dove ti sorprendi.",
  },
  "pt.in.dreamer.d": {
    en: "Planning is a way of wanting. But a trip you never took teaches you nothing about yourself — and this profile only becomes real with the ones you actually go on.",
    it: "Progettare è un modo di desiderare. Ma un viaggio che non hai fatto non ti insegna niente su di te — e questo profilo diventa reale solo con quelli che parti davvero.",
  },
  "pt.in.nature.d": {
    en: "Nature keeps coming back in what you ask for. Usually that's not about landscape: it's about wanting a place that doesn't ask anything of you.",
    it: "La natura torna sempre in quello che chiedi. Di solito non riguarda il paesaggio: riguarda il volere un posto che non ti chiede niente.",
  },
  "pt.in.unplanned.d": {
    en: "You protect the unplanned part of the day. That's where the things you actually remember tend to happen — but it needs places that make it possible.",
    it: "Difendi la parte non programmata della giornata. È lì che succedono le cose che poi ricordi davvero — ma servono posti che la rendano possibile.",
  },
  "pt.in.comfort.d": {
    en: "The familiar is winning a little more each trip. Nothing wrong with that — as long as it's a choice and not the path of least resistance.",
    it: "Il familiare vince un po' di più a ogni viaggio. Niente di male, finché è una scelta e non la strada che oppone meno resistenza.",
  },
  "pt.in.solo.d": {
    en: "Travelling alone is the clearest thing about you. It's not avoiding people: it's needing a place where nobody expects a version of you.",
    it: "Viaggiare da solo è la cosa più netta di te. Non è evitare le persone: è aver bisogno di un posto dove nessuno si aspetta una versione di te.",
  },

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
