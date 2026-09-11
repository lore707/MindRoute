# MindRoute: piano di semplificazione

**Stato:** analisi e piano, nessuna migrazione implementata
**Data:** 11 settembre 2026

## La frase che deve spiegare tutto

MindRoute capisce una persona, le costruisce un viaggio, osserva come lo usa e lo modifica, impara nel tempo e usa ciò che ha imparato per costruire viaggi progressivamente migliori.

Il codice futuro deve poter essere ricondotto a sei funzioni:

1. capire la persona;
2. generare un viaggio personalizzato;
3. permettere di modificarlo senza ricominciare;
4. riconoscere pattern nel tempo;
5. usare quei pattern per migliorare il viaggio successivo;
6. in futuro, comporre intelligentemente più profili.

Se una nuova astrazione non rende più chiara o più affidabile una di queste funzioni, non va aggiunta.

## 1. Come funziona MindRoute oggi

### Il percorso principale

```text
Quiz rapido
  -> risposte e vincoli
  -> conversione in cinque assi numerici
  -> tre destinazioni generate dall'AI
  -> scelta dell'utente
  -> itinerario v2 generato dall'AI
  -> arricchimento con immagini, luoghi, mappa, costi e link
  -> Piano modificabile e Companion
  -> nuovi segnali nel Profilo
```

Il percorso visibile è già valido: il quiz produce rapidamente tre opzioni, la scelta genera un piano strutturato e lo stesso viaggio viene poi letto e modificato nel workspace. Il problema non è il funnel, ma il modo in cui le informazioni sulla persona vengono trasformate e riutilizzate.

### Dove MindRoute capisce oggi la persona

- `QuizFast`, `Profiling` e `QuizLogistics` raccolgono desideri, interessi, ritmo, budget, durata, compagnia e vincoli.
- `shared/traits.ts` trasforma molte risposte in cinque assi: exposure, comfort, social, matter e structure.
- `server/trait-recorder.ts` salva fotografie numeriche del profilo dopo il quiz e dopo la scelta di una destinazione.
- `server/trait-prior.ts` aggrega queste fotografie nel tempo. Un viaggio confermato pesa più di un viaggio soltanto pianificato.
- `server/compass.ts`, il feedback del Portrait e alcuni dati dei viaggi aggiungono altri segnali.
- `server/graph-build.ts` rilegge risposte e assi come Intento, Core Identity, Travel State, principi e tensioni.

Il testo originale non è completamente perso: una parte rimane in `rawSignal`, nel `profilingInput` salvato con il viaggio, nei messaggi del Companion e nelle risposte del Compass. Tuttavia non esiste un'unica memoria da cui recuperare questi elementi. Ogni funzione li legge in modo diverso.

### Dove genera il viaggio

- `server/routes/profiling.ts` prepara il contesto e chiede a `server/matching-engine.ts` tre destinazioni.
- `client/src/pages/Destinations.tsx` mostra le proposte e avvia normalmente la generazione v2, mantenendo un fallback legacy.
- `server/routes/itinerary-gen-v2.ts` combina input corrente, prior numerico, regole, feedback e Graph.
- `server/matching-engine-v2.ts` produce prima la struttura del viaggio e poi i giorni in parallelo.
- Il server sostituisce le parti che non devono essere affidate al modello: URL affiliati, immagini, geocodifica, orari normalizzati e calcoli dei costi.
- Il risultato viene salvato in `itineraries`, con una copia del `profilingInput` e con i dati estendibili in `tripMeta`.

Questa pipeline v2 è una base da mantenere: contiene già molti controlli utili, genera momenti strutturati ed evita di fidarsi dell'AI per URL e aritmetica.

### Dove modifica il viaggio

- Il Piano principale vive in `ItineraryFlow` e nelle schermate in `client/src/components/flow`.
- `PATCH /api/itinerary/:id/edit` salva modifiche ai giorni e ai momenti.
- Le route `refine` e `regenerate-day` possono rigenerare porzioni del viaggio.
- Il Companion dispone di strumenti per aggiungere, rimuovere, sostituire e rigenerare momenti.
- Le vecchie route Studio consentono anche modifiche a contenuti e canvas, benché `/studio` oggi reindirizzi al Piano.

La modifica funziona, ma le azioni non confluiscono in un registro unico. Di conseguenza MindRoute spesso modifica il viaggio senza imparare chiaramente cosa è successo e in quale contesto.

### Dove impara oggi

- I `traitSnapshots` registrano il profilo numerico in momenti diversi.
- La scelta tra tre destinazioni viene trasformata in una preferenza rivelata.
- `trip_status` distingue i viaggi pianificati da quelli realmente effettuati.
- `compassSignals` conserva risposte e correzioni al Portrait.
- salvataggi, prenotazioni, click affiliati ed emozioni sono conservati in tabelle o dentro `tripMeta`.
- `account-insights.ts`, `portrait-insights.ts` e `portrait.ts` producono letture e insight.

Questi dati hanno valore, ma non formano ancora il ciclo completo comportamento -> pattern -> insight -> decisione -> risultato -> feedback. In particolare, una modifica concreta all'itinerario non diventa automaticamente un'evidenza contestualizzata e recuperabile nella generazione successiva.

### Dove usa oggi ciò che ha imparato

La generazione riceve più blocchi distinti: trait prior, travel rules, segnali Compass, feedback Portrait, lettura del Portrait e, quando attivo, Travel Identity Graph. Questo migliora la personalizzazione, ma rende difficile rispondere con certezza a due domande semplici:

- quale evidenza reale ha causato questa decisione?
- una preferenza vale sempre o soltanto, per esempio, nei viaggi lunghi in coppia?

### Profili multipli

Non esiste ancora una vera composizione di profili. Il campo relativo ai compagni descrive il contesto, ma non mette a confronto memorie appartenenti a persone diverse.

## 2. Perché il codice è diventato complesso

MindRoute è cresciuto per aggiunte successive, ognuna sensata nel proprio momento:

```text
risposte grezze
  + cinque assi
  + snapshot aggregati
  + preferenze rivelate
  + regole di viaggio
  + segnali Compass
  + feedback Portrait
  + insight del profilo
  + Travel Identity Graph
```

Il risultato non è un singolo modello della persona, ma più rappresentazioni sovrapposte. La stessa idea, per esempio “preferisce ritmi lenti”, può esistere come risposta, valore di un asse, regola, frase del Portrait, feedback o principio del Graph.

Anche il frontend è cresciuto con la strategia “nuova versione accanto alla precedente”. Questa scelta ha ridotto il rischio senza staging, ma ha lasciato componenti e stili di epoche diverse. Lo stesso vale per la generazione: i dati storici v1 devono restare leggibili, ma non è necessario mantenere per sempre più percorsi attivi per creare nuovi viaggi.

La complessità attuale è quindi soprattutto **storica e duplicata**, non necessaria al valore del prodotto.

## 3. Parti duplicate o stratificate

| Bisogno di prodotto | Rappresentazioni attuali | Problema |
|---|---|---|
| Capire un desiderio | answers, fastProfile, constraints, rawSignal | Il testo è distribuito e non recuperato in modo uniforme. |
| Memoria personale | traitSnapshots, Compass, Portrait feedback, tripMeta, chat | Non c'è una fonte unica e tracciabile. |
| Interpretare la persona | traits, destination coherence, travel rules, Portrait, Graph | Più livelli possono dire la stessa cosa con logiche diverse. |
| Generare | motore v1, motore v2, più endpoint streaming | Il percorso attivo non è immediatamente evidente. |
| Modificare | edit, refine, regenerate, Studio content/canvas, Companion tools | Scritture diverse non producono lo stesso tipo di evidenza. |
| Mostrare il viaggio | componenti cinematic, redesign, flow, studio e viste legacy | Molti componenti restano nel repository anche quando non sono montati. |
| Mostrare il profilo | assi, insight deterministici, narrativa AI, evoluzione, Compass | Il Portrait rischia di sembrare una seconda verità invece di una vista della memoria. |

## 4. Parti da mantenere

### Prodotto

- Il quiz rapido, perché riduce l'attesa prima del valore.
- Le tre destinazioni spiegate, perché danno scelta senza lasciare l'utente alla cieca.
- Il Piano come luogo unico in cui vedere e modificare il viaggio.
- Il dettaglio di giorno e di momento, la mappa espandibile e il Controllo.
- Il Companion come modo conversazionale per agire sullo stesso piano.
- Il Portrait, ma come spiegazione trasparente di ciò che MindRoute ha osservato.

### Sistema

- Gli input strutturati che cambiano direttamente il piano: budget, date, durata, partenza, compagnia, ritmo dichiarato, accessibilità e vincoli.
- L'itinerario v2 a momenti e la generazione parallela.
- Le verifiche deterministiche già presenti: costi ricalcolati, URL controllati, date gestite dal server, geografia ottenuta da fonti reali.
- `tripMeta` per dati specifici di un viaggio e le tabelle dedicate per dati personali interrogabili nel tempo.
- Autenticazione, controllo di proprietà, rate limiting, condivisione, PDF e affiliazioni.
- Il Design Operating System, i token, i font e i principi responsive.
- La lettura dei viaggi v1 storici.

## 5. Parti da unificare

### Una sola fonte di verità, con una sintesi derivata

Ogni informazione utile sulla persona deve entrare attraverso un solo punto e mantenere la propria provenienza. Questo non significa rileggere tutta la cronologia a ogni generazione.

```text
Evidenza
- contenuto originale
- origine
- momento
- contesto del viaggio
- forza: dichiarato, osservato o ipotesi
- stato: attiva, corretta o ignorata
- eventuali evidenze da cui deriva
```

Una risposta esplicita e un comportamento non sono la stessa cosa. Un'inferenza dell'AI non è un fatto. Conservare questa distinzione permette a MindRoute di riconoscere contraddizioni senza trasformare una singola azione in una verità permanente.

Il modello corretto ha tre livelli e una sola verità:

```text
EVIDENCE MEMORY
cosa la persona ha realmente detto o fatto
  -> DERIVED USER MODEL
     sintesi compatta, contestuale e tracciabile
       -> CURRENT TRIP CONTEXT
          ciò che conta nel viaggio di oggi
```

La Evidence Memory è la fonte della verità. Il Derived User Model non compete con essa: è una sintesi ricostruibile, con confidence e riferimenti alle evidenze. Il Current Trip Context applica quella sintesi a compagnia, durata, destinazione, momento e vincoli attuali. La generazione riceve il modello compatto e soltanto poche evidenze rilevanti, non l'intera storia dell'utente.

La memoria non sostituisce i vincoli operativi. “Budget massimo 1.500 euro” resta un dato strutturato; “preferisce spendere sul cibo piuttosto che sull'hotel” può emergere come pattern sostenuto da più evidenze.

### Un solo ingresso alla personalizzazione

Matching, generazione, Portrait e Companion non devono assemblare autonomamente trait, segnali e insight. Devono chiedere una cosa sola:

```text
dammi le evidenze rilevanti per questa decisione e questo contesto
```

All'inizio il recupero usa soltanto utente, contesto, tipo di evento, viaggio e data. Embedding e vector database non fanno parte della prima implementazione e verranno valutati soltanto quando il volume reale li renderà necessari.

### Un solo percorso per i nuovi itinerari

- Tutti i nuovi viaggi devono essere creati con lo schema v2.
- Il fallback v1 va mantenuto soltanto finché serve alla stabilità, poi rimosso dalla creazione.
- I lettori v1 restano per i viaggi storici.
- Quiz, partenza da una meta e creazione da zero devono convergere sulla stessa funzione di generazione.

### Un solo modo di registrare le modifiche

Una modifica manuale, una modifica da Companion e una rigenerazione devono prima aggiornare il Piano e poi registrare lo stesso formato di evento. L'evento descrive ciò che è accaduto, non cosa “significa psicologicamente”. Il significato emerge solo dopo ricorrenze sufficienti.

### Una sola esperienza principale

Il Piano resta il prodotto. Mappa e Controllo sono lenti espandibili dello stesso viaggio. Il Portrait è la memoria spiegata. Le vecchie implementazioni visive possono essere eliminate dopo aver verificato gli import reali, senza creare un'altra versione sostitutiva.

## 6. Parti da eliminare o deprecare

Non vanno cancellate nella prima fase. Vanno prima scollegate dalle decisioni, misurate e poi rimosse.

- I cinque assi attuali come cuore della generazione. Il concetto di profilo sintetico resta, ma diventa un Derived User Model semplice, dinamico, contestuale, tracciabile e non limitato a cinque numeri.
- La trasformazione automatica di ogni risposta qualitativa in un peso numerico.
- L'uso contemporaneo di prior, Portrait e Graph come tre fonti separate nello stesso prompt.
- La creazione di nuovi itinerari v1 e gli endpoint di streaming non più chiamati dal frontend.
- Il `profilingInputs` globale dopo il backfill dei viaggi legacy, perché può mescolare dati tra utenti.
- Le route Studio canvas/content se non hanno più un'interfaccia attiva.
- I componenti drop-in non montati, dopo una verifica degli import e delle esportazioni condivise.
- Le regole duplicate tra server e client quando esiste già una fonte centrale.

Non vanno eliminati i dati storici, il supporto in lettura a v1 o i controlli deterministici soltanto perché appartengono a un'epoca precedente.

## 7. Organizzazione futura secondo le sei funzioni

L'obiettivo non è creare sei cartelle, ma rendere evidente il proprietario di ogni comportamento.

### 1. Capire la persona

**Input:** quiz, testo libero, scelte, modifiche, feedback, Companion, Compass e stato reale del viaggio.
**Output:** evidenze immutabili e contestualizzate.
**Regola:** si conserva ciò che è accaduto o è stato detto, senza anticiparne il significato.

Un unico modulo condiviso definisce il formato; un unico modulo server salva e recupera le evidenze. Le route esistenti lo chiamano, ma non interpretano da sole i dati.

### 2. Generare un viaggio personalizzato

**Input:** vincoli strutturati del viaggio + evidenze rilevanti + cataloghi/fonti reali.
**Output:** tre destinazioni oppure un itinerario v2.
**Regola:** l'AI interpreta e compone; il codice verifica ciò che è misurabile.

Il motore v2 resta il generatore. La semplificazione riguarda il contesto che riceve, non una sua riscrittura completa.

### 3. Permettere di modificare il viaggio

**Input:** comando manuale o richiesta al Companion.
**Output:** modifica atomica della sola parte selezionata + evento osservabile.
**Regola:** ciò che l'utente non ha chiesto di cambiare resta invariato.

Tutte le modifiche confluiscono nello stesso salvataggio validato dei giorni v1/v2, anche se l'interfaccia che le avvia è diversa.

### 4. Imparare dai pattern

**Input:** evidenze dello stesso utente, filtrate per contesto.
**Output:** ipotesi con confidenza e riferimenti alle evidenze.
**Regola:** una singola azione non diventa una preferenza; le inferenze possono essere confermate, corrette, ignorate o superate.

Il riconoscimento dei pattern può iniziare con soglie semplici e interpretazione AI su gruppi di eventi. Non serve progettare in anticipo tutte le categorie di viaggiatore.

### 5. Trasformare gli insight in viaggi migliori

**Input:** decisione da prendere + contesto corrente + evidenze e pattern pertinenti.
**Output:** scelta concreta e motivazione tracciabile.
**Regola:** ogni motivazione importante cita evidenze realmente fornite al modello; riferimenti inesistenti vengono scartati dal codice.

Il sistema deve salvare sia la decisione sia il suo “perché”. Il feedback dell'utente sul risultato torna nella memoria come nuova evidenza, chiudendo il ciclo.

### 6. Combinare più profili

**Input futuro:** evidenze rilevanti di più persone, consenso esplicito e contesto condiviso.
**Output futuro:** punti comuni, tensioni e compromessi spiegati.
**Regola:** non fare la media di due profili e non esporre dati privati di una persona all'altra.

Questa funzione non va implementata ora. Una memoria legata all'utente e contestualizzata rende però possibile aggiungerla senza cambiare il modello dati principale.

## 8. Flusso dati proposto

```text
1. L'utente dichiara qualcosa o compie un'azione
2. MindRoute salva l'evidenza originale con fonte e contesto
3. Una decisione richiede personalizzazione
4. MindRoute recupera soltanto le evidenze pertinenti
5. L'AI interpreta desideri, tensioni e pattern nel contesto attuale
6. Il codice applica vincoli e controlli misurabili
7. L'AI compone la proposta finale
8. MindRoute salva decisione, motivazione ed evidenze usate
9. L'utente accetta, modifica, rifiuta o vive il viaggio
10. Il risultato diventa nuova evidenza
```

Tre confini devono restare netti:

```text
FATTI OPERATIVI -> applicati direttamente
EVIDENZE PERSONALI -> conservate senza reinterpretazione
INFERENZE -> ipotesi tracciabili e correggibili
```

## 9. Dati necessari

Servono tre contenitori piccoli e privati, separati dai viaggi condivisibili.

### Evidenze personali

Campi minimi:

- utente;
- tipo: dichiarazione, comportamento o feedback;
- contenuto originale;
- fonte e identificativo della fonte;
- contesto: viaggio, destinazione, compagnia, durata e momento;
- forza: esplicita o osservata;
- stato: attiva, corretta o ignorata;
- data.

La coppia fonte + identificativo deve impedire duplicati quando una richiesta viene ritentata.

### Derived User Model

È una sintesi compatta e sostituibile, non una nuova fonte di verità. Contiene:

- un breve riassunto del modo di viaggiare emerso finora;
- pochi pattern attivi;
- confidence per ogni pattern;
- contesti in cui il pattern vale;
- identificativi delle evidenze che lo sostengono;
- versione e data dell'ultimo aggiornamento.

Il modello viene aggiornato quando arrivano evidenze significative, non reinterpretato da zero durante ogni generazione. Se viene eliminato può essere ricostruito dalla Evidence Memory.

### Decisioni personalizzate significative

Campi minimi:

- utente e viaggio interessato;
- oggetto della decisione;
- scelta effettuata;
- motivazione;
- identificativi delle evidenze usate;
- feedback successivo dell'utente;
- data.

Queste informazioni non devono entrare nei link pubblici o nel `tripMeta` condivisibile.

Non si registra ogni scelta tecnica del generatore. Si registrano soltanto eventi utili all'apprendimento futuro, inizialmente limitati a: `destination_selected`, `destination_rejected`, `activity_removed`, `activity_replaced`, `day_regenerated`, `pace_changed`, `suggestion_confirmed`, `suggestion_rejected` e `trip_confirmed`.

### Compatibilità dati

- `traitSnapshots.rawSignal` può alimentare un backfill di evidenze dichiarate senza cancellare gli snapshot.
- `profilingInput` dei viaggi conserva il contesto originale e resta invariato.
- `compassSignals`, chat e stato viaggio continuano a esistere; inizialmente vengono anche tradotti nel nuovo formato tramite un solo write path.
- Gli assi restano leggibili durante la transizione, ma smettono progressivamente di guidare nuove decisioni.

Poiché la memoria è un dato personale interrogabile tra viaggi, merita tabelle dedicate e non un nuovo campo JSON dentro ogni itinerario. La modifica DB va distribuita prima del codice che la usa, oppure creata con una migrazione idempotente verificata all'avvio. Non va ripetuto il rischio attuale di pubblicare codice prima dello schema.

## 10. Frontend

Il frontend non deve aggiungere una nuova sezione “Memoria”. Deve rendere visibile il ciclo nei punti in cui serve.

- **Quiz:** conserva il testo dell'utente e distingue chiaramente desideri da vincoli.
- **Destinazioni:** ogni card spiega perché è compatibile e permette di approfondire le evidenze usate.
- **Piano:** “Perché qui?” mostra motivazioni brevi e verificabili; la modifica resta contestuale.
- **Companion:** agisce sul Piano e rende visibile cosa ha cambiato, lasciando confermare o annullare.
- **Profilo:** mostra pattern in linguaggio naturale, contesto, livello di certezza ed evidenze; consente conferma, correzione o esclusione.

Il principio visivo resta: una decisione principale per schermata, dettagli progressivi, fotografia utile alla comprensione, contrasti accessibili e stessa gerarchia su desktop e mobile.

## 11. Strumenti esterni

Gli strumenti esterni devono restare dietro punti di accesso unici:

- immagini in `server/unsplash.ts`;
- luoghi e grounding in `experience-bank`, OSM/Wikidata e geocodifica;
- percorso e trasporti nei moduli già dedicati;
- meteo tramite Open-Meteo;
- affiliazioni in `server/affiliate-config.ts`;
- AI tramite i motori di generazione e il Companion.

La memoria non deve conoscere provider, API o link commerciali. Deve soltanto fornire il contesto personale necessario alla decisione.

## 12. Come evitare nuovo debito tecnico

1. Una nuova informazione personale entra sempre dallo stesso write path.
2. Nessuna route inventa un proprio formato di preferenza o insight.
3. Nessuna inferenza viene salvata senza riferimenti a evidenze reali.
4. I vincoli misurabili non vengono delegati all'AI.
5. Tutti i nuovi viaggi usano una sola pipeline; la seconda resta soltanto per leggere dati storici.
6. Una nuova UI sostituisce quella precedente: dopo un periodo breve, il codice non montato viene rimosso.
7. Ogni comportamento importante ha un test formulato in termini di prodotto, non di implementazione.
8. Ogni modifica al ciclo di apprendimento aggiorna questo documento e una decisione breve in `docs/DECISIONS.md`.
9. Le feature sperimentali sono reversibili, ma non duplicano permanentemente la fonte della verità.
10. Le metriche verificano qualità del ciclo: uso dei suggerimenti, modifiche successive, conferme, correzioni e differenza tra viaggio pianificato e vissuto.

## 13. Come rendere il repository facile per Codex

Un nuovo Codex deve poter partire da tre documenti:

1. questo documento per capire il prodotto e i confini;
2. `docs/AI-GUIDE.md` per non rompere produzione, dati e sicurezza;
3. `docs/operating-system/README.md` per il comportamento visivo.

La futura implementazione dovrà inoltre:

- esporre poche funzioni con nomi di prodotto, per esempio salvare un'evidenza, recuperare evidenze rilevanti e registrare una decisione;
- mantenere gli schemi condivisi accanto ai contratti API;
- annotare chiaramente quali file sono attivi, legacy o in rimozione;
- aggiungere uno script di verifica del ciclo completo;
- eliminare dalla documentazione riferimenti a componenti non più montati;
- evitare nomi generici come manager, engine o orchestrator quando non descrivono una responsabilità reale.

La mappa mentale richiesta al codice deve essere:

```text
QUIZ E AZIONI -> MEMORIA -> GENERAZIONE/MODIFICA -> RISULTATO -> NUOVA MEMORIA
                              |
                              -> CONTROLLI REALI
```

## 14. Compatibilità con viaggi e dati esistenti

- Nessuna riga esistente viene modificata nella prima fase.
- Gli itinerari v1 continuano a essere letti con il dispatch `schemaVersion`.
- Gli itinerari v2 e il loro `tripMeta` restano il formato operativo.
- I `traitSnapshots` continuano a essere scritti finché matching, Portrait e default dipendono da essi.
- Il nuovo sistema viene inizialmente letto in parallelo e può essere disattivato senza perdere il funnel.
- Il backfill copia soltanto evidenze verificabili e mantiene sempre la fonte originaria.
- Le inferenze storiche non vengono promosse automaticamente a fatti.
- Il passaggio al nuovo contesto di generazione avviene per utenti o richieste controllate, confrontando qualità e regressioni.
- Le vecchie tabelle vengono rimosse soltanto dopo che nessun percorso attivo le legge e dopo un backup.

## 15. Rischi e contromisure

| Rischio | Contromisura |
|---|---|
| Una singola modifica diventa una preferenza permanente | Salvare l'evento, non l'interpretazione; richiedere ricorrenza o conferma. |
| L'AI inventa il perché di una scelta | Accettare soltanto riferimenti a evidenze realmente recuperate. |
| Il profilo crea una bolla e ignora il desiderio attuale | Il contesto e le dichiarazioni del viaggio corrente hanno priorità sui pattern storici. |
| Memorie di un contesto contaminano un altro | Recupero per compagnia, durata, destinazione e fase del viaggio. |
| Il nuovo schema rompe produzione | Deploy in due tempi, letture null-safe e fallback completo. |
| La personalizzazione aumenta costo e latenza | Recuperare poche evidenze, riusare le chiamate AI esistenti e non aggiungere un modello per ogni evento. |
| Il Portrait espone dati troppo sensibili | Memoria privata, consenso, possibilità di correggere/escludere e nessuna inclusione nelle condivisioni. |
| La semplificazione cancella capacità utili | Misurare prima di deprecare; rimuovere soltanto dopo equivalenza funzionale verificata. |

## 16. Piano di migrazione progressivo

### Fase 0: fissare il comportamento attuale

- Documentare gli endpoint realmente chiamati dal funnel.
- Aggiungere test di riferimento per quiz -> tre destinazioni -> itinerario v2.
- Verificare modifica manuale, modifica Companion, Portrait e viaggi v1.
- Definire metriche semplici: destinazione scelta, modifica accettata, insight confermato e viaggio confermato.

**Uscita:** possiamo distinguere una semplificazione da una regressione.

### Fase 1: memoria parallela

- Aggiungere i tre contenitori privati: Evidence Memory, Derived User Model e decisioni significative.
- Definire un solo formato Evidence e un solo write path.
- Salvare in parallelo il testo qualitativo del quiz e costruire una prima sintesi direttamente tracciabile.
- Non cambiare ancora matching, generazione o Portrait.

**Uscita:** i dati nuovi sono completi, idempotenti e isolati per utente.

### Fase 2: primo vertical slice

```text
testo qualitativo nel quiz
  -> evidenza salvata
  -> Derived User Model aggiornato
  -> contesto ed evidenze rilevanti recuperati per una decisione reale
  -> generatore v2 la usa
  -> “Perché qui?” mostra la motivazione
  -> conferma/correzione dell'utente viene salvata
```

- Usare una sola chiamata AI già esistente, senza aggiungere latenza visibile.
- Validare nel server gli identificativi citati dal modello.
- Conservare il fallback attuale.

**Uscita:** il ciclo è dimostrato end-to-end su una scelta concreta.

### Fase 3: modifiche come evidenze

- Far convergere edit manuale, Companion e rigenerazione sullo stesso registro eventi.
- Registrare differenze concrete: rimosso, sostituito, spostato, alleggerito, confermato.
- Non generare ancora pattern da un singolo evento.

**Uscita:** MindRoute osserva nello stesso modo tutte le modifiche al Piano.

### Fase 4: pattern e Profilo

- Raggruppare evidenze ricorrenti per contesto.
- Creare inferenze tracciabili con confidenza.
- Rendere il Profilo una vista della memoria con conferma, correzione e ignoramento.
- Misurare quante inferenze vengono confermate e quante corrette.

**Uscita:** gli insight sono utili, spiegabili e correggibili.

### Fase 5: personalizzazione primaria

- Fare usare le evidenze rilevanti alle tre destinazioni e all'itinerario v2.
- Mantenere hard constraints e controlli deterministici separati.
- Confrontare risultati con il sistema trait/Graph su profili sintetici e utenti reali consenzienti.
- Disattivare gradualmente trait, prior e Graph come input della generazione quando il nuovo flusso è stabile.

**Uscita:** il viaggio successivo cambia davvero grazie a ciò che MindRoute ha imparato.

### Fase 6: rimozione della stratificazione

- Rendere v2 l'unico percorso di creazione.
- Eliminare endpoint e componenti non montati dopo audit degli import.
- Rimuovere il fallback globale `profilingInputs` dopo backfill.
- Conservare soltanto i lettori necessari ai viaggi v1.
- Aggiornare `ARCHITECTURE.md`, `AI-GUIDE.md` e `DECISIONS.md` alla realtà finale.

**Uscita:** un nuovo collaboratore trova un solo percorso per ogni responsabilità.

### Fase 7 futura: viaggi condivisi tra profili

- Aggiungere consenso e selezione delle memorie condivisibili.
- Recuperare evidenze per persona e contesto senza fonderle.
- Far emergere accordi, tensioni e compromessi.
- Salvare motivazioni che distinguono i bisogni delle diverse persone.

**Uscita:** il viaggio di gruppo è una composizione spiegata, non una media.

## Decisione proposta

Non riscrivere MindRoute. Conservare il funnel, il Piano, il Companion, la generazione v2 e i controlli reali. Sostituire progressivamente soltanto il centro della personalizzazione: da più rappresentazioni numeriche e narrative scollegate a una memoria di evidenze, pattern tracciabili e decisioni spiegabili.

La prima implementazione da autorizzare è esclusivamente la Fase 1 insieme al vertical slice della Fase 2. Tutto il resto deve attendere che questa prova dimostri un miglioramento reale e misurabile.
