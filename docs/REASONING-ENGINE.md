# MindRoute Reasoning Engine — Specification v1.1

**Posizione:** documento canonico del ragionamento di MindRoute. Sostituisce integralmente la v1.0. Completa "Architettura Cognitiva v2": quello definisce cosa fa il sistema e quando; questo definisce come il motore osserva, interpreta, formula ipotesi, risolve contraddizioni e trasforma un'identità in decisioni. Se un comportamento del motore non è derivabile da questo documento, non va implementato.
**Novità della v1.1:** l'Intento come radice del ragionamento (§2), il Graph a due livelli Core/State (§3), l'arco narrativo come stadio della cascata (§7-D2), ordine della cascata rivisto.
**Ambito:** solo teoria del ragionamento. Nessuna UI, nessun prompt, nessun codice.

---

## 1. Il principio fondante: ragionamento incanalato al servizio di una trasformazione

La domanda a cui il motore risponde non è "che viaggio è coerente con questa persona?" ma:

> **Di quale esperienza ha bisogno questa persona, in questo momento della sua vita e in questo contesto di viaggio?**

La coerenza non sparisce: resta il criterio *misurabile* del motore (§10). Ma la coerenza è sempre coerenza *rispetto a qualcosa*, e quel qualcosa è l'Intento (§2). "Fa vivere meglio questa persona?" non è testabile direttamente; "ogni decisione serve la trasformazione che questa persona sta cercando, nel modo in cui questa persona viaggia?" lo è. La prima è l'ambizione, la seconda è la sua forma operativa. Il motore implementa la seconda per perseguire la prima.

Resta valida la risoluzione della tensione determinismo/libertà: **il motore è un'inferenza LLM vincolata da tre strutture — un vocabolario obbligatorio, un modello causale di prior, una pipeline con stadi non saltabili.** Il vocabolario definisce in che termini il motore può pensare; il modello causale (§5, §6) definisce cosa il motore sa prima di incontrare l'utente; la pipeline (§4) definisce l'ordine del pensiero. Dentro i vincoli l'inferenza è dell'LLM ed è il valore del sistema; fuori, l'output è invalido per costruzione. La Knowledge Base (§9) è dove vocabolario e prior vivono, versionati.

---

## 2. L'Intento: la trasformazione desiderata

### 2.1 Bisogni, non preferenze

Il sistema attuale contiene già questa intuizione — la "life phase reading" del motore ("ritrovarmi" = cerca identità, "staccare davvero" = esausto, "sentirmi vivo" = fase piatta, "meravigliarmi" = ha perso lo stupore, "festeggiare" = transizione positiva, "uscire dalla comfort zone" = pronto a trasformarsi) — ma la tratta come una nota di colore nel prompt. La v1.1 la promuove a **radice del ragionamento**.

La distinzione formale: le **preferenze** descrivono *come* una persona viaggia (le dimensioni del §5); l'**Intento** descrive *perché* viaggia adesso e *cosa deve produrre* il viaggio. Sono ortogonali, e la dimostrazione è il caso che nessun sistema a preferenze può risolvere: due persone con budget 1500, camminata alta, cibo locale alto — preferenze identiche. Una ha bisogno di rallentare, l'altra di sentirsi viva. I due viaggi devono essere strutturalmente diversi (arco, ritmo, tipo di picco, densità), pur usando gli stessi materiali (quartieri veri, taverne, camminate). Le preferenze scelgono i materiali; l'Intento decide l'edificio.

### 2.2 Natura dell'Intento

L'Intento è un'inferenza come le altre, non un campo del form. Ha evidenze (la risposta alla domanda sulla sensazione cercata, il tono del testo libero, il contesto di vita se emerge), ha confidenza, può essere sbagliato, e la sua verifica è la **prima priorità del Conversation Engine**: se il motore ha frainteso l'Intento, ogni altra correzione è cosmetica. È anche il campo più adatto alla verifica esposta ("mi sembra che questo viaggio ti serva più a staccare la spina che a riempirti di stimoli — è così?"), perché è la domanda che fa sentire capiti.

L'Intento può essere composito e in tensione ("staccare" + "sentirmi vivo" = decompressione E rottura), e la tensione si conserva secondo la regola di S4 — mai media, sempre alternanza o sequenza (prima decomprimere, poi accendere: l'arco narrativo del §7-D2 è lo strumento naturale per risolvere le tensioni di Intento nel tempo invece che nel compromesso).

### 2.3 Effetto sulla pipeline

L'Intento diventa il **Principio Zero**: precede e ordina tutti gli altri. In S5 nessun principio può contraddirlo; nella cascata ogni stadio lo riceve come primo vincolo; nella tracciabilità ogni decisione deve poter risalire o a un principio identitario o direttamente all'Intento. La KB mantiene un catalogo delle trasformazioni (§9) con gli effetti strutturali di ciascuna — l'equivalente per l'Intento di quello che il §5 è per le dimensioni.

---

## 3. Il Graph a due livelli: Core Identity e Travel State

### 3.1 Il problema

Non esiste "il viaggiatore": esistono versioni della stessa persona. Da solo cerca di perdersi; in coppia romanticismo; con amici energia; con la famiglia semplicità. Un Graph monolitico impara che "ama i boutique hotel" da un viaggio di coppia e lo applica al viaggio con cinque amici: la contaminazione tra contesti è l'errore sistematico più grave che un sistema con memoria possa fare — peggio di non avere memoria, perché sbaglia con sicurezza.

### 3.2 I due livelli

**Core Identity** — ciò che si ripete attraverso i contesti. Le dimensioni con evidenza in più contesti di viaggio, i principi che sopravvivono al cambio di compagnia, l'estetica, il rapporto con autenticità e novità. Cambia lentamente, ha memoria lunga, decade poco. È ciò che rende MindRoute capace di dire "ti conosco".

**Travel State** — la configurazione di *questo* viaggio. Contiene: la compagnia (solo / coppia / amici / famiglia — con effetti propri, perché la compagnia non è un Fact neutro: modula energia sociale, comfort, ritmo, budget-allocazione), la durata e il formato (weekend vs viaggio lungo cambiano la tolleranza al rischio e la struttura dell'arco), il motivo contingente, il momento personale, e **l'Intento** — che è per natura uno stato, non un tratto: nessuno ha bisogno di staccare per sempre. Lo State nasce a ogni viaggio, eredita i prior del Core, muore con il viaggio lasciando in eredità solo ciò che la regola di routing promuove.

### 3.3 La regola di routing

Dove scrive un'evidenza? La regola unifica ed estende la regola di convergenza multi-contesto di S2:

**Un'evidenza scrive sempre nello State del viaggio corrente. Scrive nel Core solo quando lo stesso segnale ricorre in almeno due State con contesti diversi** (compagnia diversa, o formato diverso). Fino ad allora, il Core registra al massimo un'ipotesi aperta condizionale ("in coppia: comfort alto — da verificare se vale in generale").

Corollari: le dimensioni nel Core possono avere **valori condizionali per contesto** quando i dati mostrano divergenza stabile (energia sociale: 0.3 da solo, 0.7 con amici — entrambe vere, nessuna contraddizione: la "contraddizione" dichiarato/comportamento di S4 va prima verificata come possibile split di contesto, e solo se il contesto è lo stesso è una vera divergenza). La generazione (cascata) legge sempre **Core filtrato dallo State**: mai il Core nudo.

### 3.4 Conseguenza sull'Evidenza

Lo schema dell'Evidenza (§4 della v1.0, invariato nel resto) acquisisce un campo obbligatorio: **contesto di viaggio** (compagnia, formato, Intento attivo al momento del segnale). Un'evidenza senza contesto di viaggio non può essere instradata e quindi non può essere scritta. I click affiliate, le scelte di destinazione, le rigenerazioni ereditano automaticamente il contesto del viaggio in cui avvengono.

---

## 4. La pipeline del ragionamento

Sei stadi, confini invariati rispetto alla v1.0; qui le modifiche introdotte da Intento e Core/State.

```
Input grezzi
   ▼
S1  Semantic Extraction   → Evidenze (con contesto di viaggio)
   ▼
S2  Hypothesis Engine     → Ipotesi (incluso l'Intento, con confidenza)
   ▼
S3  Coherence Pass        → cluster concordanti
   ▼
S4  Contradiction Pass    → tensioni + ipotesi aperte + split di contesto
   ▼
S5  Principle Synthesis   → Principio Zero (Intento) + principi (max 5–7)
   ▼
S6  Graph Write           → routing Core/State + EMA + confidenze
```

**S1 — Semantic Extraction.** Invariato nelle regole (un input → più evidenze; ogni evidenza mappata sul vocabolario o degradata a vincolo/scartata; l'estrazione non interpreta oltre il segnale). Aggiunta: S1 etichetta ogni evidenza con il contesto di viaggio corrente e riconosce i segnali di Intento come classe propria (il "perché" non è una dimensione: ha il suo binario fino a S2).

**S2 — Hypothesis Engine.** I tre meccanismi restano: Proiezione (evidenza forte → effetti causali della dimensione, confidenza ≤ evidenza sorgente), Convergenza (evidenze deboli da contesti tematici diversi → ipotesi più forte; ≥2 contesti tematici obbligatori), Combinazione (dimensioni note → ipotesi composte del §6, che sopprimono le proiezioni singole). Aggiunte: S2 formula sempre un'**ipotesi di Intento**, anche a bassa confidenza — il motore non può arrivare a S5 senza una lettura del perché; e la Proiezione ora usa i prior del Core filtrati dallo State (un comfort "alto nel Core" ma in viaggio con amici zaino-in-spalla proietta attenuato).

**S3 — Coherence Pass.** Invariato: cluster di ipotesi che si rafforzano; la coerenza alza la confidenza del cluster con tetto sotto la conferma esplicita. Aggiunta: un cluster che converge attorno all'Intento (ipotesi identitarie che *spiegano* il bisogno) è il cluster a priorità massima per S5.

**S4 — Contradiction Pass.** Le tre classi restano con i loro trattamenti (tensione identitaria → si conserva, mai media; dichiarato/comportamento → ipotesi aperta + prudenza; ipotesi/vincolo → vince il vincolo, nasce principio di allocazione). Aggiunta la **verifica di split di contesto**: prima di dichiarare una divergenza dichiarato/comportamento, S4 controlla se i due segnali vengono da contesti di viaggio diversi; se sì, non è contraddizione ma valore condizionale (§3.3), e il Core si arricchisce invece di sospendersi.

**S5 — Principle Synthesis.** Le quattro proprietà del principio restano (azionabile, discriminante, tracciabile, prioritizzato; max 5–7 attivi). Modifica strutturale: la sintesi parte dal **Principio Zero** — la formulazione operativa dell'Intento ("questo viaggio serve a decomprimere, poi riaccendere") — e ogni altro principio viene ammesso solo se compatibile con esso e ordinato per quanto lo serve. Un principio identitario vero ma irrilevante per l'Intento corrente resta nel Core e non si attiva in questo viaggio: l'attivazione è per-State, l'esistenza è per-Core.

**S6 — Graph Write.** Applica la regola di routing (§3.3): tutto nello State, nel Core solo per ricorrenza cross-contesto. Ogni scrittura è un delta con provenienza; il Graph deve poter rispondere, per ogni valore, "da dove viene" e "in quali contesti vale".

---

## 5. Come pensa una dimensione: il modello causale

Invariato rispetto alla v1.0 (autenticità, ritmo, novità, comfort, energia sociale, camminabilità, esplorazione cibo, controllo, estetica/efficienza — ciascuna con effetti espliciti agli estremi, valori intermedi che modulano l'intensità senza invertire la direzione). Due precisazioni introdotte dalla v1.1:

Gli effetti si applicano **dopo** il filtro dello State: la compagnia e il formato possono attenuare o amplificare (energia sociale con amici parte già spostata; il ritmo su un weekend si comprime strutturalmente perché l'arco è più corto, non perché la persona è cambiata).

Il **ritmo** cambia natura: nella v1.0 era una dimensione tra le altre con effetti sulla giornata; nella v1.1 i suoi effetti strutturali (blocchi, margini, momento lento) vengono consumati dallo stadio D2 della cascata (arco narrativo), che li fonde con l'Intento. Il ritmo resta un asse del Graph; smette di essere uno stadio implicito della generazione.

---

## 6. Le combinazioni

Invariato il meccanismo (registro nella KB, la combinazione sopprime le proiezioni singole) e il set fondativo della v1.0 (autenticità×budget, autenticità×comfort, autenticità×energia sociale, controllo×novità nelle due varianti, ritmo×cibo, camminabilità×estetica).

Aggiunta della v1.1: le combinazioni **Intento × dimensione**, che sono spesso più determinanti di quelle tra dimensioni. Esempi fondativi per il registro: *staccare × controllo alto* → la decompressione va progettata, non lasciata al caso (a chi ha bisogno di staccare ma vive di controllo non si dà il "giorno vuoto": gli si dà il giorno lento *strutturato*); *sentirsi vivo × comfort alto* → l'intensità di giorno, il recupero pieno la sera — mai sacrificare il secondo per la prima; *ritrovarmi × energia sociale bassa* → spazio contemplativo protetto, il picco è un momento solitario, non un evento; *festeggiare × budget basso* → il budget si concentra su un singolo picco memorabile invece di distribuirsi.

---

## 7. Decision Cascade

Ordine rivisto: **l'arco narrativo sale al secondo posto**, prima dell'alloggio. Motivazione: il ritmo e la struttura del viaggio determinano anche dove ha senso dormire — una persona lenta può permettersi una base più decentrata e vera; una persona che vuole densità no. L'alloggio è conseguenza di quartiere E struttura, quindi viene dopo entrambi.

```
Principio Zero (Intento) + principi attivi
   ▼
D1  Quartieri            la decisione madre
   ▼
D2  Arco narrativo       la storia del viaggio + architettura delle giornate
   ▼
D3  Alloggio             criterio struttura, dentro D1 vincolato da D2
   ▼
D4  Esperienze           riempiono l'arco, per funzione
   ▼
D5  Ristorazione         situazioni, agganciate a D1 + D2
   ▼
D6  Trasporti            conseguenza di D1 + D2 + camminabilità
   ▼
D7  Micro                orari, luce, dettagli di scena
```

**D1 — Quartieri.** Riceve tutti i principi, l'Intento e i Facts. Produce quartiere-base (candidato: la scelta definitiva della base può essere raffinata da D2, vedi backtracking) e 2–4 quartieri-teatro, ciascuno giustificato per principio. Test invariato: se il quartiere-base è sostituibile con "il centro" senza perdere nulla, D1 è fallito.

**D2 — Arco narrativo.** Lo stadio nuovo, e il luogo dove l'Intento diventa struttura. L'utente non ricorda i giorni: ricorda la storia. D2 produce, nell'ordine:

*La forma dell'arco* — derivata dall'Intento e dalla durata. La forma canonica è Arrivo → Esplorazione → Immersione → Picco → Chiusura, ma l'Intento la deforma: "staccare" sposta il picco avanti e lo abbassa (il climax è uno stato, non un evento); "sentirsi vivo" alza e anticipa l'intensità con una chiusura di decompressione; "staccare+sentirsi vivo" produce un doppio movimento (decomprimere nei primi giorni, accendere dopo); un weekend comprime l'arco a tre battute (arrivo-picco-chiusura) e non tollera giorni interlocutori.

*Il picco* — l'esperienza attorno a cui si costruisce la storia (il "defining moment" già presente nel motore attuale, qui formalizzato come output obbligatorio di D2). Il picco è la decisione a massima densità di Intento: viene progettato prima delle altre esperienze e D4 costruisce verso di lui.

*Il ruolo di ogni giorno* — arrivo, costruzione, immersione, picco, decompressione, chiusura — che governa densità dei blocchi, posizione del momento lento, margine non pianificato (dai prior del ritmo, filtrati dallo State) e, per la regola già stabilita, la densità delle CTA: la conversione segue la funzione del giorno, non la lunghezza del viaggio.

**D3 — Alloggio.** Riceve D1 + D2 + comfort + allocazione budget. Il vincolo nuovo da D2: la base deve reggere il ritmo dell'arco (arco lento → base decentrata ammessa se il quartiere è teatro; arco denso → base a corto raggio dai teatri). Produce un criterio (tipologia, fascia, cosa conta), mai un nome.

**D4 — Esperienze.** Riempie i blocchi definiti da D2, per funzione: ogni esperienza dichiara quale principio (o direttamente l'Intento) serve e in quale battuta dell'arco vive. Il ratio iconico/nascosto da autenticità; tipologia, momento, durata sono i parametri affiliate.

**D5 — Ristorazione.** Riceve D1 (zone), D2 (quali pasti sono momenti dell'arco e quali logistica), cibo, budget. Produce situazioni: zona + stile + fascia. Nei giorni in cui D2 fa della cena il centro della battuta, D5 retro-agisce su D4 (il pomeriggio prepara la cena).

**D6 — Trasporti.** Quasi determinato: D1 + D2 + camminabilità + estetica/efficienza. Logica degli spostamenti e criteri monetizzabili.

**D7 — Micro.** Rifinitura (orari solo dove controllo li chiede, luce dove estetica lo chiede). Non può introdurre nulla che non discenda da D1–D6.

**Backtracking.** Invariata la regola: il conflitto risale di uno stadio alla volta, mai direttamente ai principi; il backtracking silenzioso che sacrifica un principio senza dichiararlo resta il bug più grave possibile. Caso nuovo introdotto dall'ordine rivisto: D2 può rimettere in discussione la *base* scelta in D1 (l'arco denso rende insostenibile la base decentrata) senza toccare i quartieri-teatro — è il backtracking più frequente atteso, ed è il motivo per cui D1 marca la base come candidata.

**Tracciabilità.** Ogni decisione registra: principio (o Intento) invocato → cluster → evidenze con provenienza. Catena completa: evidenza → ipotesi → principio → battuta dell'arco → decisione.

---

## 8. Il modello della confidenza

Invariati: l'ordine dei pesi delle fonti (smentita > conferma > pattern multi-viaggio > comportamento singolo > inferenza da quiz > proiezione da prior), le tre soglie d'azione (sotto: prior neutro e decisioni conservative; in mezzo: coda del Conversation Engine per impatto×incertezza; sopra: principi e combinazioni attive), le soglie come parametro di tuning su profili sintetici.

Aggiunte della v1.1: la confidenza è **per-livello** — lo State parte a ogni viaggio dai prior del Core e va riconquistato in fretta (poche evidenze bastano, perché muore col viaggio); il Core sale solo per ricorrenza e decade lentamente. E l'**Intento ha priorità di verifica assoluta**: qualunque sia la coda impatto×incertezza, un Intento sotto soglia si verifica per primo.

---

## 9. Travel Identity Knowledge Base

Invariato lo schema per dimensione (definizione e confini, proxy, pattern di evidenza, effetti, combinazioni, contraddizioni tipiche, domande candidate, impatto) e i due principi cardine: **la copertura sostituisce il numero** (ogni asse misurabile da ≥3 angoli, gli assi ad alto impatto da ≥5; il totale domande è conseguenza, mai obiettivo) e **la KB è il confine del determinismo** (l'enumerabile e stabile vive nella KB; il contestuale e combinatorio nell'inferenza; i pattern ricorrenti migrano dall'inferenza alla KB).

Sezione nuova: il **Catalogo delle Trasformazioni**. Per ogni Intento riconosciuto (staccare, ritrovarmi, sentirsi vivo, meravigliarsi, festeggiare, uscire dalla comfort zone — set fondativo, estendibile): definizione e segnali che lo rivelano; effetti sulla forma dell'arco (posizione e natura del picco, densità, ruolo della chiusura); combinazioni Intento×dimensione registrate (§6); tensioni tipiche con altri Intenti e loro risoluzione ad arco; domande di verifica candidate. Il Catalogo delle Trasformazioni sta all'Intento come il modello causale sta alle dimensioni: il prior che l'inferenza modula ma non ignora.

Le domande del catalogo acquisiscono un campo: **livello misurato** (Core / State / Intento). Le domande di State ("come vi immaginate le serate, voi due?") non possono scrivere nel Core, per costruzione.

---

## 10. Testabilità del motore

Le tre famiglie della v1.0 restano: **Tracciabilità** (ogni decisione risale a principio→cluster→evidenze; una decisione orfana è un fail), **Discriminazione** (Graph diversi, stessa destinazione e Facts → itinerari visibilmente diversi in D1, D2, D4, D5), **Coerenza combinatoria** (ogni combinazione registrata ha il suo profilo sintetico e deve produrre il suo archetipo).

Due famiglie nuove, che testano esattamente ciò che la v1.1 introduce:

**Discriminazione d'Intento.** Due profili sintetici con preferenze *identiche* e Intenti diversi (il caso "rallentare vs sentirsi vivo" del §2.1) devono produrre archi diversi in D2 — forma, posizione del picco, densità — e di conseguenza D4 diversi. Se differiscono solo nel tono del testo, l'Intento non sta governando la struttura: fail.

**Isolamento di contesto.** Un Core costruito con evidenze da un viaggio di coppia, applicato a uno State "con amici", non deve proiettare le preferenze condizionali del contesto coppia (il boutique hotel del §3.1). Il test si costruisce a tavolino: Core con valore condizionale, State col contesto opposto, verifica che D3 non erediti il condizionale sbagliato. È il test anti-contaminazione, e va eseguito su ogni modifica alla regola di routing.