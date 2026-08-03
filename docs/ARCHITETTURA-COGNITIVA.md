# MindRoute — Architettura Cognitiva v2
## Specifica di prodotto

**Stato:** documento di riferimento per l'evoluzione del sistema di ragionamento di MindRoute.
**Ambito:** Product Design, AI Reasoning, UX. Nessun codice, nessun prompt. Le linee guida tecniche (§12) delimitano l'implementazione futura in Claude Code.
**Prerequisito dichiarato:** il write-path del profilo (trait vector + aggiornamento EMA) è oggi rotto. Tutto ciò che in questo documento riguarda persistenza e evoluzione del profilo (Livello 4 in poi, §9) dipende dalla sua riparazione. È il primo intervento tecnico, prima di qualsiasi parte di questa specifica.

---

## 1. Filosofia

MindRoute oggi raccoglie risposte e le passa a un modello che genera un itinerario. Il sistema funziona come un filtro sofisticato: le risposte restringono lo spazio delle destinazioni, il prompt fa il resto. Il risultato è logisticamente corretto ma identitariamente piatto, perché il modello ragiona su dati grezzi, non su una comprensione.

La nuova filosofia rovescia il centro di gravità. L'itinerario non è il prodotto: è l'ultima conseguenza di un modello mentale del viaggiatore. Il valore competitivo di MindRoute non sarà mai "scrive itinerari migliori" — fra dodici mesi lo farà chiunque con un buon prompt. Il valore è: **MindRoute costruisce una rappresentazione di come questa persona viaggia, e poi decide come deciderebbe lei.**

Tre corollari governano tutto il resto del documento.

Primo: **il sistema non memorizza risposte, memorizza interpretazioni.** La risposta "voglio spendere poco" non è un dato da salvare; è evidenza che alimenta un'ipotesi ("privilegia esperienze rispetto ad alloggio") che a sua volta genera principi operativi.

Secondo: **il sistema produce criteri, mai esercizi commerciali specifici.** Non "vai al ristorante X" ma "cerca una taverna familiare nella parte nord di Alfama, dove è più facile trovare cucina tradizionale a prezzi contenuti". Il criterio è il livello giusto di specificità per lo stadio attuale (nessuna API di inventario) ed è esattamente il formato che le API future (Expedia Rapid, Viator, Tripadvisor) potranno tradurre in inventario reale. Questo principio è già codificato nella lezione appresa "confidently wrong specifics destroy trust": il criterio è onesto per costruzione.

Terzo: **la comprensione emerge, non si programma.** Il collegamento tra pattern lontani ("vuole autenticità" detto parlando di serate + "vuole spendere poco" detto parlando di budget → "quartieri autentici, hotel semplice ben posizionato, budget concentrato sulle esperienze") non può essere una regola deterministica. È un'inferenza dell'LLM. Ma non è libera: è incanalata da una struttura intermedia — il Travel Identity Graph — che dà all'inferenza un formato, un vocabolario e dei vincoli.

---

## 2. Gerarchia del sistema

Il sistema è composto da livelli con confini netti. Ogni livello ha un input, un output e una responsabilità unica. Nessun livello può assorbire responsabilità di un altro: quando succede (es. il quiz che prova a "capire" invece di delimitare, o l'itinerario generato direttamente dalle risposte) il sistema degrada nella versione attuale.

```
L0  Facts            vincoli deterministici — delimitano il problema
L1  Prima Ipotesi    bozza interpretativa — basta per 3 destinazioni
L2  Journey          valore immediato — itinerario v1
L3  Conversation     riduzione dell'incertezza del modello
L4  Identity Graph   il modello mentale persistente
L5  Rigenerazione    itinerario v2 = Facts + Graph + destinazione
L6  Evoluzione       comportamento d'uso → Graph aggiornato → viaggi futuri
```

Il punto architetturale decisivo: **l'LLM di generazione non vede mai le risposte grezze del quiz.** Vede Facts + Graph. Le risposte esistono solo come input del processo di interpretazione (L1 e L3). Questo disaccoppiamento è ciò che permette in futuro di cambiare modello, aggiungere API o riscrivere il quiz senza toccare la logica di generazione.

---

## 3. Livello 0 — Facts

I Facts sono fatti, non identità. Budget, giorni, periodo, partenza, numero e tipo di compagni, destinazione se già nota (Path B), vincoli hard (accessibilità, paure, esigenze dichiarate). Il quiz FAST attuale li raccoglie già bene e va preservato nella sua velocità: l'onboarding resta 45–60 secondi.

Regola di appartenenza: un dato è un Fact se e solo se è **verificabile e non interpretabile**. "Budget 800€" è un Fact. "Vuole spendere poco" non lo è mai — è un'inferenza, anche quando l'utente lo dice testualmente, perché il suo significato dipende dal contesto (spendere poco su cosa? per lasciare spazio a cosa?).

I Facts hanno due funzioni e due sole: delimitare lo spazio delle soluzioni (reachability, seasonality, budget-math — i check già presenti nel motore attuale restano validi) e parametrizzare l'output (numero giorni, date affiliate). Non entrano mai nel ragionamento identitario.

---

## 4. Livello 1 — Prima Ipotesi

Con i Facts più le poche domande psicologiche del quiz FAST, il sistema costruisce una **bozza interpretativa**, non un profilo. La bozza ha tre proprietà obbligatorie:

**È esplicitamente incerta.** Ogni affermazione porta un grado di confidenza. "Probabilmente cerca rallentamento (alta confidenza, dichiarato). Probabilmente aperta a destinazioni poco ovvie (bassa confidenza, inferita dal tono)." L'incertezza non è un difetto da nascondere: è il carburante del Livello 3 — la conversazione esiste per ridurla, e il Conversation Engine sceglierà le domande proprio guardando dove la confidenza è bassa.

**È sufficiente, non completa.** Serve solo a scegliere 3 destinazioni sensate e a generare un primo itinerario plausibile. Il criterio di qualità della Prima Ipotesi non è "quanto è accurata" ma "quanto è utile a produrre 3 proposte che l'utente riconosce come pensate per lui". Il sistema attuale (Haiku, ~$0.02) resta l'esecutore di questo livello.

**È già in formato Graph.** La Prima Ipotesi è un Travel Identity Graph embrionale: stesse dimensioni, stessi campi, valori più incerti. Non esiste un formato "bozza" separato che poi va convertito. Questo evita una traduzione tra rappresentazioni e rende il refine del L3 un'operazione di aggiornamento, non di ricostruzione.

---

## 5. Livello 2 — Journey

L'utente sceglie una delle 3 destinazioni e riceve immediatamente l'itinerario v1. Ha già ricevuto valore prima di qualsiasi approfondimento. Questo è irrinunciabile: nessuna versione futura del sistema può inserire attrito tra scelta e itinerario.

L'itinerario v1 è dichiaratamente costruito su una comprensione parziale, e questa parzialità diventa **materiale narrativo**, non debolezza. È la premessa che rende naturale il Livello 3: "ho costruito questo con le poche cose che so di te" è una frase che crea desiderio di correzione, mentre "compila il tuo profilo" crea attrito.

---

## 6. Livello 3 — Conversation Engine

È il cuore della v2 ed è il livello che oggi non esiste (l'attuale quiz di approfondimento logistico viene sostituito, non affiancato).

### 6.1 Cosa non è

Non è un questionario: non c'è una sequenza fissa, non c'è una barra di progresso, non c'è un numero predefinito di domande. Non è una chat libera: l'utente non può portare la conversazione ovunque, e l'AI non improvvisa domande dal nulla.

### 6.2 Il meccanismo: ipotesi → verifica

L'unità di conversazione non è la domanda ma la **verifica di ipotesi**. Il sistema guarda il Graph, identifica la dimensione a più alto impatto con confidenza più bassa, e propone all'utente l'ipotesi che ha già formulato:

> "Mi sembra che per te il viaggio conti di più quando puoi uscire dall'hotel e trovarti subito dentro la vita del quartiere, più che avere una camera particolarmente confortevole. È così?"
> [Sì] [Non proprio] [Spiegami perché lo pensi]

Le tre risposte hanno tre funzioni distinte. "Sì" alza la confidenza e chiude la dimensione. "Non proprio" apre un follow-up mirato (una sola domanda dal catalogo, §6.3) e registra la smentita — le smentite valgono più delle conferme, perché correggono. "Spiegami perché lo pensi" è la risposta più preziosa dal punto di vista del prodotto: espone il ragionamento del sistema ("lo penso perché quando ti ho chiesto della serata ideale hai parlato di osservare, non di fare") e costruisce fiducia mostrando che il sistema *pensa* invece di schedare. È il momento in cui MindRoute smette di sembrare un form e inizia a sembrare intelligente.

### 6.3 Il catalogo di domande

Le domande non emergono liberamente: emergono da un **catalogo progettato** (~40–60 domande a regime, ~15–20 per la prima versione). L'LLM sceglie dal catalogo; non inventa. Questo è il compromesso corretto tra controllabilità e adattività: la selezione è dinamica, il contenuto è progettato.

Ogni voce del catalogo è definita da questa scheda:

| Campo | Contenuto |
|---|---|
| Dimensione primaria | quale asse del Graph misura |
| Dimensioni secondarie | quali altri assi informa indirettamente |
| Inferenze possibili | le letture che ogni tipo di risposta abilita |
| Superfici influenzate | quali decisioni di viaggio modifica (minimo due, §8) |
| Condizione di attivazione | quando l'LLM può sceglierla (es. "confidenza su AUTENTICITÀ < 0.6 e destinazione urbana") |
| Formato | verifica di ipotesi / domanda aperta breve / scelta tra scenari |

**Regola di ammissione al catalogo:** una domanda che modifica una sola superficie del viaggio viene eliminata. "Preferisci boutique hotel?" modifica solo l'hotel: fuori. "Quando torni la sera, cosa ti fa sentire nel posto giusto?" modifica quartiere, hotel, ristoranti, ritmo, trasporti: dentro. Questa regola da sola distingue una domanda-inferenza da una domanda-filtro, ed è il criterio con cui va costruita la matrice di progettazione (§10) prima di scrivere una sola domanda.

### 6.4 Regole di condotta della conversazione

La conversazione ha un budget: massimo 4–6 verifiche per sessione, poi il sistema propone la rigenerazione anche se restano incertezze. Un modello che vuole capire tutto subito è indistinguibile da un questionario. Le incertezze residue non sono un problema: sono il materiale del Livello 6.

La conversazione non è obbligatoria né immediata. Il pattern più potente è quello differito: l'utente genera, guarda, esce; al ritorno il sistema apre con una singola verifica ("Ieri ti ho costruito Lisbona. C'è una cosa che non sono riuscito a capire di te…"). Una domanda contestuale al rientro vale più di sei domande a raffica post-generazione.

Ogni turno della conversazione produce un **delta sul Graph** — mai una risposta salvata. Se il write-path non scrive, la conversazione è teatro: da qui il prerequisito in testa al documento.

---

## 7. Livello 4 — Travel Identity Graph

### 7.1 Natura

Il Graph è la rappresentazione persistente del viaggiatore. Non è un vettore di preferenze: è un modello composto da quattro strati di natura diversa.

**Dimensioni quantitative** (assi continui 0–1, con confidenza per ciascuno). Set iniziale proposto, da validare contro la matrice del §10:

| Asse | Cosa misura | Superfici principali |
|---|---|---|
| Autenticità | locale/reale vs curato/turistico | quartiere, ristoranti, esperienze |
| Ritmo | densità vs lentezza della giornata | struttura giorni, n. tappe, pause |
| Novità | imprevisto vs familiare | tipologia esperienze, margine libero |
| Comfort | quanto il riposo pesa nelle scelte | fascia hotel, posizione vs qualità camera |
| Energia sociale | immersione tra persone vs osservazione | serate, tipo esperienze, quartieri |
| Camminabilità | tolleranza/piacere del camminare | trasporti, raggio delle giornate |
| Esplorazione cibo | quanto il cibo è motore del viaggio | peso ristorativo, esperienze gastronomiche |
| Controllo | pianificato vs emergente | rigidità itinerario, alternative, orari |
| Estetica vs efficienza | bellezza del percorso vs ottimizzazione | ordine tappe, scelta tragitti |

**Principi di viaggio** (frasi operative derivate dalle dimensioni, massimo 5–7 attivi). "Ogni giornata deve avere un momento lento." "Dormire in quartieri veri, non in zone hotel." "Concentrare il budget sulle esperienze, non sull'alloggio." I principi sono il formato in cui il Graph parla al generatore: l'LLM di L5 riceve principi, non numeri. I numeri servono al sistema per decidere quali principi attivare e con che priorità.

**Tensioni e contraddizioni** — conservate, mai appiattite. "Staccare" + "sentirmi vivo" non fa media: produce il principio "alternare decompressione e rottura". Il motore attuale già lo dice ("contradictions as signals, never flatten"): nel Graph questa intuizione diventa un campo strutturale, non una riga di prompt.

**Ipotesi aperte** — le affermazioni a bassa confidenza in attesa di verifica, con la loro provenienza ("inferita da risposta sulla serata ideale, quiz del 12/07"). Sono la coda di lavoro del Conversation Engine.

### 7.2 Cosa il Graph non contiene

Non contiene risposte testuali del quiz (esistono altrove come log, non come modello). Non contiene destinazioni o attività specifiche. Non contiene dati sensibili non pertinenti al viaggio: se un utente rivela contesto personale delicato durante la conversazione, il sistema ne estrae solo l'implicazione di viaggio ("ha bisogno di ritmi morbidi"), mai il fatto in sé.

### 7.3 Aggiornamento

Ogni fonte scrive sul Graph con un peso diverso: smentita esplicita in conversazione (peso massimo) > conferma esplicita > comportamento ripetuto su più viaggi > comportamento singolo > inferenza da quiz. Il meccanismo di scrittura è l'EMA già progettato: risposta comportamentale recente pesa più del passato, ma il passato non si azzera. La confidenza di una dimensione sale con conferme concordanti e scende quando comportamento e dichiarazione divergono — e la divergenza genera un'ipotesi aperta, non una correzione silenziosa.

---

## 8. Livello 5 — Rigenerazione: dai principi alle decisioni

La rigenerazione riceve tre input: Facts, Graph (principi + tensioni + dimensioni rilevanti), destinazione scelta. Non riceve risposte.

Il cambio di formulazione del problema è la parte più importante. Il generatore non risolve più "consiglia un hotel": risolve "trova il quartiere che permette a questa persona di vivere i suoi principi, poi descrivi che tipo di struttura cercare lì". La catena decisionale per ogni superficie:

**Quartiere prima di tutto.** Il quartiere è la decisione madre: determina hotel, ristorante, serate e metà del ritmo. Autenticità alta + comfort medio + camminabilità alta → "dormi tra Graça e Mouraria, non in Baixa". Il criterio di quartiere è anche il criterio affiliate più monetizzabile (zona → query hotel).

**Hotel come conseguenza.** Dal quartiere + comfort + budget-allocation deriva il criterio struttura: "guesthouse o boutique semplice, la camera conta meno della strada su cui esci". Mai un nome.

**Ristorazione come situazione, non come indirizzo.** Esplorazione cibo + autenticità + budget → "piccola taverna frequentata dai residenti nella parte nord di Alfama, cucina tradizionale a prezzi contenuti". Il criterio contiene sempre: zona probabile, stile, fascia prezzo — i tre parametri che Tripadvisor/TheFork sanno tradurre.

**Esperienze per funzione nel viaggio.** Ogni esperienza proposta dichiara (internamente) quale principio serve: il free walking nei vicoli serve "osservare la vita locale", non riempie uno slot. Tipologia + momento ideale + durata sono esattamente i parametri Viator/GetYourGuide/Civitatis.

**Trasporti come espressione del ritmo.** Camminabilità alta + estetica > efficienza → "attraversa a piedi anche quando il tram sarebbe più veloce: il tragitto è parte della giornata". Camminabilità bassa → logica opposta, e il criterio diventa monetizzabile (transit pass, transfer).

**Ritmo come struttura della giornata.** I principi determinano l'architettura del giorno prima del contenuto: dove sta il momento lento, quanto margine non pianificato, quante tappe. Questo si integra con lo schema momentV2 e con la regola già stabilita che la densità di CTA segue la funzione del momento, non la lunghezza del viaggio.

Regola trasversale di coerenza: **ogni decisione deve poter citare il principio che la giustifica.** Se una scelta dell'itinerario non discende da nessun principio del Graph, è rumore generico e il generatore deve poterla sostituire. Questo è il test di qualità della rigenerazione: non "l'itinerario è bello?" ma "ogni scelta è spiegabile con il modello di questa persona?".

---

## 9. Livello 6 — Evoluzione

Il quiz e la conversazione costruiscono la prima metà del Graph. La seconda metà — a regime la più affidabile — viene dal comportamento: quale delle 3 destinazioni ha scelto (e quali ha scartato: lo scarto è segnale quanto la scelta), quali sezioni dell'itinerario apre, quali affiliate clicca, se rigenera e cosa cambia, cosa ripete nei viaggi successivi.

Ogni evento comportamentale è un'evidenza debole che aggiorna il Graph via EMA. Nessun evento singolo cambia un principio; pattern ripetuti sì. Quando il comportamento contraddice il dichiarato (dice autenticità 0.9, clicca solo hotel 4 stelle in centro), il sistema non corregge in silenzio: genera un'ipotesi aperta che il Conversation Engine potrà verificare al momento giusto. Questo chiude il cerchio: quiz → ipotesi, comportamento → evidenza, conversazione → verifica, Graph → memoria.

Questo livello dipende interamente da: (a) write-path funzionante, (b) utenti reali con viaggi reali. Non è progettabile oltre questo paragrafo prima di avere entrambi. La lezione "ship before building the feedback loop" si applica per intero.

---

## 10. Progettare il catalogo: la matrice prima delle domande

Non si scrive una domanda prima di aver costruito la matrice. La matrice è una tabella con una riga per domanda candidata e queste colonne: *cosa misura* (asse primario), *inferenze possibili* (per ogni tipo di risposta), *superfici modificate* (minimo due o si elimina), *condizione di attivazione*, *formato*. La matrice serve a tre cose: verificare la copertura (ogni asse del Graph deve avere almeno 3 domande che lo misurano da angoli diversi), eliminare le ridondanze (due domande che producono le stesse inferenze sono una domanda), e stanare le domande-filtro travestite.

Caratteristiche delle buone domande, dedotte da quelle che già funzionano nel quiz attuale: parlano di situazioni, non di categorie ("quando torni la sera…" non "che hotel preferisci"); ammettono risposte che sorprendono chi risponde; misurano il primario attraverso un proxy laterale (la domanda sulla serata che misura l'autenticità); e non contengono mai il nome della superficie che influenzano di più — se la domanda dice "hotel", l'utente risponde da cliente, non da persona.

---

## 11. Guardrail anti-degenerazione

Il sistema ha due modi di fallire, e vanno resi impossibili per costruzione.

**Degenerazione in questionario:** succede se le domande diventano sequenziali, se compare un progresso da completare, se la conversazione è bloccante prima del valore, o se il sistema chiede ciò che potrebbe inferire. Contromisure: budget di 4–6 verifiche, conversazione sempre posticipabile, ogni domanda deve superare la condizione di attivazione (il sistema deve *avere bisogno* di quella risposta), formato verifica-di-ipotesi come default.

**Degenerazione in chat libera:** succede se l'utente può digitare qualsiasi cosa e l'AI improvvisa. Contromisure: risposte prevalentemente a scelta (Sì / Non proprio / Spiegami), campo libero solo come follow-up di una smentita, domande solo dal catalogo, e un perimetro esplicito — il Conversation Engine parla solo del modo di viaggiare dell'utente, e riporta gentilmente dentro il perimetro qualsiasi deriva.

---

## 12. Linee guida per l'implementazione futura

Queste sono delimitazioni per Claude Code, non design tecnico.

**Ordine di costruzione.** (1) Riparare il write-path EMA e popolare i trait vector: senza, nulla di questo documento è implementabile. (2) Definire lo schema del Graph (dimensioni, principi, tensioni, ipotesi, confidenze) come struttura dati versionata. (3) Far generare la Prima Ipotesi già in formato Graph e passare al generatore Graph + Facts invece delle risposte grezze — questo da solo migliora la coerenza dell'output senza toccare la UX. (4) Solo dopo, costruire il Conversation Engine e la rigenerazione. I punti 1–3 non cambiano nulla di visibile all'utente e sono compatibili con il flusso attuale; il punto 4 è la prima modifica di prodotto.

**Compatibilità con l'esistente.** Il routing a due modelli resta: Haiku per L1 (Prima Ipotesi + 3 destinazioni), Sonnet per L5 (rigenerazione). Il Conversation Engine è un caso d'uso Haiku (selezione dal catalogo + formulazione verifica: compito piccolo e frequente). I check deterministici del motore attuale (seasonality, reachability, budget-math, Path A/B) restano al L0/L1 invariati. Il prompt caching già implementato si sposa bene con un catalogo statico di domande e con lo schema fisso del Graph.

**Cosa non costruire ora.** Nessuna API di inventario (i criteri sono il prodotto, non un ripiego). Nessuna estrazione comportamentale sofisticata al L6 oltre agli eventi già tracciati in GA4/DB (scelta destinazione, click affiliate). Nessuna interfaccia grafica del Graph per l'utente (il "profilo nominato" stile Wrapped resta roadmap post-lancio, come già deciso).

**Criterio di successo della v2.** Non la precisione delle raccomandazioni, ma la coerenza: leggendo un itinerario generato, ogni scelta deve essere riconducibile a un principio del Graph, e due utenti con Graph diversi sulla stessa destinazione devono ricevere itinerari visibilmente diversi nelle stesse superfici (quartiere, ritmo, ristorazione, esperienze). Questo è testabile a mano con profili sintetici prima di qualsiasi utente reale.