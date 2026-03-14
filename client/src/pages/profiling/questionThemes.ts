// Tema visivo per ogni chip — immagine reale + overlay tematico
// Sostituisce il vecchio sistema di sfondi sfocati e SVG
 
export interface QuestionTheme {
  imageUrl: string;
  overlayLight: string;
  overlayDark: string;
}
 
export const questionThemes: Record<string, QuestionTheme> = {
 
  // PATH B Q1 — Dove
  close: {
    imageUrl: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.28) 100%)",
  },
  europe: {
    imageUrl: "https://images.unsplash.com/photo-uUZoS_jnzZM?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,245,255,0.54) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,15,40,0.42) 0%, rgba(0,0,0,0.30) 100%)",
  },
  asia: {
    imageUrl: "https://images.unsplash.com/photo-SBK40fdKbAg?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,245,240,0.54) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(40,10,10,0.42) 0%, rgba(0,0,0,0.28) 100%)",
  },
  americas: {
    imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,255,245,0.54) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,30,20,0.42) 0%, rgba(0,0,0,0.28) 100%)",
  },
  africa: {
    imageUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,235,0.54) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(40,20,0,0.42) 0%, rgba(0,0,0,0.28) 100%)",
  },
  oceania: {
    imageUrl: "https://images.unsplash.com/photo-XEi1n8VLBKM?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(235,248,255,0.54) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,40,0.42) 0%, rgba(0,0,0,0.28) 100%)",
  },
 
  // PATH A Q1 — Stile
  wild: {
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,255,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,10,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  quiet: {
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(245,248,255,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,15,30,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  chaotic: {
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,245,245,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,10,10,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  intimate: {
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(255,245,248,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,10,15,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  solitary: {
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(245,248,255,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,15,30,0.42) 0%, rgba(0,0,0,0.30) 100%)",
  },
  regenerating: {
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(240,255,250,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,15,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  authentic: {
    imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,15,0,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  quietluxury: {
    imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(255,252,245,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(20,15,5,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  spiritual: {
    imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(248,245,255,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(15,10,30,0.42) 0%, rgba(0,0,0,0.30) 100%)",
  },
  festive: {
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,235,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,15,0,0.38) 0%, rgba(0,0,0,0.26) 100%)",
  },
  adventure: {
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,10,0,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  romantic: {
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(255,245,248,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,5,15,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  cultural: {
    imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(245,245,255,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,10,30,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  explorative: {
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,255,252,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,20,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
 
  // PATH A Q7 — Distanza
  continent: {
    imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(245,245,255,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,10,30,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  far: {
    imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,245,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,10,0,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  anywhere: {
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.56) 0%, rgba(240,252,255,0.50) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,15,30,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
 
  // PATH B Q2 — Tipo viaggio
  culture: {
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,15,0,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  nature: {
    imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,255,245,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,10,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  food: {
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,235,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,15,0,0.38) 0%, rgba(0,0,0,0.26) 100%)",
  },
  beach: {
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(235,248,255,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,40,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  city: {
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(245,245,255,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,10,30,0.42) 0%, rgba(0,0,0,0.30) 100%)",
  },
  offgrid: {
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,255,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,10,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  roadtrip: {
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(255,248,240,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(30,10,0,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  trekking: {
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(245,248,255,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(10,15,30,0.42) 0%, rgba(0,0,0,0.30) 100%)",
  },
  wellness: {
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(240,255,250,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,15,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
  discovery: {
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.58) 0%, rgba(240,255,252,0.52) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,20,20,0.40) 0%, rgba(0,0,0,0.28) 100%)",
  },
 
  // DEFAULT
  default: {
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80",
    overlayLight: "linear-gradient(135deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.55) 100%)",
    overlayDark: "linear-gradient(135deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.30) 100%)",
  },
};
 
export function getQuestionTheme(selectedValues: string[]): QuestionTheme {
  if (!selectedValues || selectedValues.length === 0) return questionThemes.default;
  const first = selectedValues[0].toLowerCase().trim();
  return questionThemes[first] ?? questionThemes.default;
}
