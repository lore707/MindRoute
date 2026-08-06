// Flusso itinerario a schermate (2026-08) — prefisso "if.".
// Sei schermate: Overview · Giorno · Tappa · Mappa · Logistica · Modifica.
// Regola di copy: mai promettere dati che non abbiamo (nessun "biglietto
// confermato", nessun numero di posto). L'alloggio è sempre una ZONA.
export const itineraryFlowDict: Record<string, { en: string; it: string }> = {
  // ── comune ───────────────────────────────────────────────────────────────
  "if.back": { en: "Back", it: "Indietro" },
  "if.day": { en: "Day {n}", it: "Giorno {n}" },
  "if.days": { en: "days", it: "giorni" },
  "if.dayOne": { en: "day", it: "giorno" },
  "if.stops": { en: "stops", it: "tappe" },
  "if.stopOne": { en: "stop", it: "tappa" },
  "if.loading": { en: "Loading…", it: "Caricamento…" },
  "if.save": { en: "Save", it: "Salva" },
  "if.saved": { en: "Saved", it: "Salvato" },
  "if.notes": { en: "Notes", it: "Note" },
  "if.share": { en: "Share", it: "Condividi" },
  "if.close": { en: "Close", it: "Chiudi" },

  // ── 1 · Overview ─────────────────────────────────────────────────────────
  "if.ov.title": { en: "Journey", it: "Journey" },
  "if.ov.lede": {
    en: "The same trip, day after day. Timeline, map and logistics always in sync.",
    it: "Lo stesso viaggio, giorno dopo giorno. Timeline, mappa e logistica sempre sincronizzate.",
  },
  "if.ov.themeKick": { en: "The theme of this journey", it: "Il tema di questo viaggio" },
  "if.ov.themeMore": { en: "Read more", it: "Scopri di più" },
  "if.ov.progress": { en: "complete", it: "completato" },
  "if.ov.settings": { en: "Logistics", it: "Logistica" },
  "if.ov.backToTrips": { en: "My trips", it: "I miei viaggi" },
  "if.ov.highlights": { en: "What you'll remember", it: "Quello che ricorderai" },
  "if.ov.closing": { en: "Before you go", it: "Prima di partire" },

  // ── 2 · Giorno ───────────────────────────────────────────────────────────
  "if.day.mapCta": { en: "See the day on the map", it: "Vedi il giorno sulla mappa" },
  "if.day.edit": { en: "Edit itinerary", it: "Modifica itinerario" },
  "if.day.add": { en: "Add a stop", it: "Aggiungi tappa" },
  "if.day.empty": { en: "No stops for this day yet.", it: "Nessuna tappa per questo giorno." },
  "if.day.walk": { en: "on foot", it: "a piedi" },
  "if.day.spend": { en: "est. spend", it: "spesa stimata" },

  // ── 3 · Tappa ────────────────────────────────────────────────────────────
  "if.mo.why": { en: "Why here, why now?", it: "Perché qui e ora?" },
  "if.mo.planB": { en: "If it falls through", it: "Se salta" },
  "if.mo.openMaps": { en: "Open in Google Maps", it: "Apri in Google Maps" },
  "if.mo.next": { en: "Next stop", it: "Prossima tappa" },
  "if.mo.prev": { en: "Previous stop", it: "Tappa precedente" },
  "if.mo.notFound": { en: "This stop is no longer part of the day.", it: "Questa tappa non fa più parte del giorno." },
  "if.mo.noteHint": { en: "Your note on this stop", it: "La tua nota su questa tappa" },
  "if.mo.noteSaved": { en: "Note saved", it: "Nota salvata" },
  "if.mo.copied": { en: "Link copied", it: "Link copiato" },

  // ── 4 · Mappa ────────────────────────────────────────────────────────────
  "if.map.title": { en: "Map", it: "Mappa" },
  "if.map.center": { en: "Center on me", it: "Centra su di me" },
  "if.map.navigate": { en: "Navigate the route", it: "Naviga il percorso" },
  "if.map.story": { en: "Back to the day", it: "Torna al giorno" },
  "if.map.noPoints": { en: "No geolocated stops for this day.", it: "Nessuna tappa geolocalizzata per questo giorno." },
  "if.map.realRoute": { en: "Calculated route", it: "Percorso calcolato" },
  "if.map.estRoute": { en: "Estimated link", it: "Collegamento stimato" },

  // ── 5 · Logistica ────────────────────────────────────────────────────────
  "if.log.title": { en: "Logistics", it: "Logistica" },
  "if.log.transport": { en: "Transport", it: "Trasporti" },
  "if.log.stay": { en: "Stay", it: "Alloggio" },
  "if.log.notes": { en: "Useful notes", it: "Note utili" },
  "if.log.budget": { en: "Budget", it: "Budget" },
  "if.log.export": { en: "Export itinerary", it: "Esporta itinerario" },
  "if.log.tz": { en: "Time zone", it: "Fuso orario" },
  "if.log.tzSame": { en: "No difference", it: "Nessuna differenza" },
  "if.log.tzAhead": { en: "{n}h ahead", it: "{n}h avanti" },
  "if.log.tzBehind": { en: "{n}h behind", it: "{n}h indietro" },
  "if.log.currency": { en: "Currency", it: "Valuta" },
  "if.log.language": { en: "Language", it: "Lingua" },
  "if.log.emergency": { en: "Emergency", it: "Emergenze" },
  "if.log.localTime": { en: "Local time now", it: "Ora locale adesso" },
  "if.log.bookedMark": { en: "I've booked this", it: "L'ho prenotato" },
  "if.log.booked": { en: "Booked", it: "Prenotato" },
  "if.log.clickFirst": { en: "Open the link first, then you can confirm.", it: "Apri prima il link, poi puoi confermare." },
  "if.log.stayIsArea": {
    en: "MindRoute recommends an area and a style, never a single property: you pick the room, we make sure the neighbourhood is the right one.",
    it: "MindRoute consiglia una zona e uno stile, mai una struttura singola: la camera la scegli tu, noi ci assicuriamo che il quartiere sia quello giusto.",
  },
  "if.log.otherOptions": { en: "Other options", it: "Altre opzioni" },
  "if.log.essential": { en: "Essential", it: "Essenziale" },
  "if.log.recommended": { en: "Recommended", it: "Consigliato" },
  "if.log.pdfLocked": {
    en: "The full PDF unlocks once flight and stay are confirmed.",
    it: "Il PDF completo si sblocca quando volo e alloggio sono confermati.",
  },
  "if.log.noTransport": { en: "No transfers recorded between the stops of this trip.", it: "Nessun trasferimento registrato fra le tappe di questo viaggio." },

  // ── 6 · Modifica ─────────────────────────────────────────────────────────
  "if.ed.title": { en: "Edit itinerary", it: "Modifica itinerario" },
  "if.ed.saveChanges": { en: "Save changes", it: "Salva modifiche" },
  "if.ed.saving": { en: "Saving…", it: "Salvataggio…" },
  "if.ed.savedOk": { en: "Changes saved", it: "Modifiche salvate" },
  "if.ed.saveErr": { en: "Could not save. Try again.", it: "Non sono riuscito a salvare. Riprova." },
  "if.ed.add": { en: "Add a stop", it: "Aggiungi tappa" },
  "if.ed.remove": { en: "Remove this stop", it: "Rimuovi questa tappa" },
  "if.ed.moveUp": { en: "Move up", it: "Sposta su" },
  "if.ed.moveDown": { en: "Move down", it: "Sposta giù" },
  "if.ed.newTitle": { en: "New stop", it: "Nuova tappa" },
  "if.ed.newDesc": { en: "Describe what happens here.", it: "Racconta cosa succede qui." },
  "if.ed.titleField": { en: "Title", it: "Titolo" },
  "if.ed.descField": { en: "Description", it: "Descrizione" },
  "if.ed.timeField": { en: "Time", it: "Orario" },
  "if.ed.dirty": { en: "Unsaved changes", it: "Modifiche non salvate" },
  "if.ed.discard": { en: "Discard", it: "Annulla" },
};
