// Mappa chip → immagine background contestuale
// Usato per il layer sfocato dietro ogni domanda

export const questionBackgrounds: Record<string, string> = {

  // PATH B — Q1 Dove (geo)
  close:     "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80", // strada europea vicina
  europe:    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80", // Parigi/Europa
  asia:      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&q=80", // tempio Asia
  americas:  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1600&q=80", // New York / Ande
  africa:    "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&q=80", // savana Africa
  oceania:   "https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1600&q=80", // Great Barrier Reef

  // PATH B — Q2 Tipo di viaggio
  culture:   "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1600&q=80", // medina/cultura
  nature:    "https://images.unsplash.com/photo-1511497584788-876760111969?w=1600&q=80", // foresta nordica
  food:      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80", // tavola ristorante
  beach:     "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80", // spiaggia tropicale
  city:      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80", // skyline città
  offgrid:   "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80", // wilderness isolata
  roadtrip:  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80", // strada deserta road trip
  trekking:  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80", // sentiero montagna
  wellness:  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1600&q=80", // spa/relax
  discovery: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80", // mappa/esplorazione

  // PATH B — Q3 Momento
  "mangiare nei posti locali":               "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80",
  "perdermi nei quartieri autentici":        "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1600&q=80",
  "vedere luoghi iconici":                   "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&q=80",
  "stare immerso nella natura":              "https://images.unsplash.com/photo-1511497584788-876760111969?w=1600&q=80",
  "vivere qualcosa di completamente nuovo":  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80",

  // PATH B — Q6 Sensazione
  "Staccare davvero dalla routine":     "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80", // montagna pace
  "Ritrovare energia e leggerezza":     "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1600&q=80", // onda mare
  "Sentirmi libero e spontaneo":        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80", // strada aperta
  "Meravigliarmi di nuovo":             "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&q=80", // tempio
  "Sentire profondamente il luogo":     "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80", // mercato
  "Uscire dalla mia zona di comfort":   "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80", // wilderness

  // PATH A — Q1 Stile
  wild:          "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80",
  quiet:         "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
  chaotic:       "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1600&q=80",
  intimate:      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80",
  solitary:      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80",
  regenerating:  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1600&q=80",
  authentic:     "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80",
  quietluxury:   "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=80",
  spiritual:     "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&q=80",
  festive:       "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&q=80",
  adventure:     "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80",
  romantic:      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80",
  cultural:      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80",
  explorative:   "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80",

  // PATH A — Q7 Distanza
  continent: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80",
  far:       "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&q=80",
  anywhere:  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80",

  // DEFAULT — nessuna selezione o domande slider/text
  default:   "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80",
};

// Ritorna l'URL del background per la chip selezionata
// Se multi-select, usa la prima selezione
export function getQuestionBackground(selectedValues: string[]): string {
  if (!selectedValues || selectedValues.length === 0) return questionBackgrounds.default;
  const first = selectedValues[0];
  return questionBackgrounds[first] ?? questionBackgrounds.default;
}