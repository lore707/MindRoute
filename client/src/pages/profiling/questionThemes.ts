export interface QuestionTheme {
  imageUrl: string;
  overlayLight: string;
  overlayDark: string;
}

export const questionThemes: Record<string, QuestionTheme> = {

  close: {
    imageUrl: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 100%)",
  },
  europe: {
    imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,245,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,15,40,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  asia: {
    imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,245,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(40,10,10,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  americas: {
    imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,245,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,30,20,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  africa: {
    imageUrl: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,248,235,0.28) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(40,20,0,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  oceania: {
    imageUrl: "https://images.unsplash.com/photo-1523428096881-5bd79d043006?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(235,248,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,40,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  wild: {
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,10,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  quiet: {
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(245,248,255,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,15,30,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  chaotic: {
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,245,245,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,10,10,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  intimate: {
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,245,248,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,10,15,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  solitary: {
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(245,248,255,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,15,30,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  regenerating: {
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(240,255,250,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,15,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  authentic: {
    imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,15,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  quietluxury: {
    imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,252,245,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(20,15,5,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  spiritual: {
    imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(248,245,255,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(15,10,30,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  festive: {
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,235,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,15,0,0.46) 0%, rgba(0,0,0,0.34) 100%)",
  },
  adventure: {
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,10,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  romantic: {
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,245,248,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,5,15,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  cultural: {
    imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(245,245,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,10,30,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  explorative: {
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,252,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,20,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  continent: {
    imageUrl: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(245,245,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,10,30,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  far: {
    imageUrl: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,245,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,10,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  anywhere: {
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(240,252,255,0.30) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,15,30,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  culture: {
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,15,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  nature: {
    imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,245,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,10,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  food: {
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,235,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,15,0,0.46) 0%, rgba(0,0,0,0.34) 100%)",
  },
  beach: {
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(235,248,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,40,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  city: {
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(245,245,255,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,10,30,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  offgrid: {
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,10,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  roadtrip: {
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,10,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  trekking: {
  imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(245,248,255,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,15,30,0.50) 0%, rgba(0,0,0,0.38) 100%)",
  },
  wellness: {
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(240,255,250,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,15,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  discovery: {
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,252,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,20,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
 "mangiare nei posti locali": {
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,235,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,15,0,0.46) 0%, rgba(0,0,0,0.34) 100%)",
  },
  "perdermi nei quartieri autentici": {
 imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,15,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  "vedere luoghi iconici": {
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,245,248,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,5,15,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  "stare immerso nella natura": {
    imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,10,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  "vivere qualcosa di completamente nuovo": {
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,248,240,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(30,10,0,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
"fotografare qualcosa di straordinario": {
    imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(245,245,255,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(10,10,30,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  "trovare un posto che non sapevo esistesse": {
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(240,255,252,0.32) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,20,20,0.48) 0%, rgba(0,0,0,0.36) 100%)",
  },
  default: {
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80",
    overlayLight: "linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.34) 100%)",
    overlayDark: "linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.38) 100%)",
  },
};

export function getQuestionTheme(selectedValues: string[]): QuestionTheme {
  if (!selectedValues || selectedValues.length === 0) return questionThemes.default;
  const first = selectedValues[0].toLowerCase().trim();
  const keyMap: Record<string, string> = {
    // geo
    'africa & middle east': 'africa',
    'africa e medio oriente': 'africa',
    'close to home': 'close',
    'vicino a casa': 'close',
    'americas': 'americas',
    'americhe': 'americas',
    'oceania': 'oceania',
    'europe': 'europe',
    'europa': 'europe',
    'asia': 'asia',
    // path b q2 tipo viaggio IT
    'natura e avventura': 'nature',
    'cultura e storia': 'culture',
    'food e vino': 'food',
    'mare e relax': 'beach',
    'città e vita notturna': 'city',
    'fuori dal mondo': 'offgrid',
    'road trip': 'roadtrip',
    'trekking e sport': 'trekking',
    'wellness e spa': 'wellness',
    'scoperta, sorprendimi': 'discovery',
   // path b q2 tipo viaggio EN
    'nature & adventure': 'nature',
    'nature and adventure': 'nature',
    'culture & history': 'culture',
    'culture and history': 'culture',
    'food & wine': 'food',
    'food and wine': 'food',
    'beach & relax': 'beach',
    'sea and relax': 'beach',
    'city & nightlife': 'city',
    'city and nightlife': 'city',
    'off the grid': 'offgrid',
    'road trip': 'roadtrip',
    'trekking & sports': 'trekking',
    'trekking and sport': 'trekking',
    'wellness & spa': 'wellness',
    'wellness and spa': 'wellness',
    'discovery, surprise me': 'discovery',
    // path b q3 EN
    'eating at local spots': 'food',
    'getting lost in authentic neighborhoods': 'authentic',
    'seeing iconic landmarks': 'cultural',
    'being immersed in nature': 'nature',
    'living something completely new': 'adventure',
    'photographing something extraordinary': 'fotografare qualcosa di straordinario',
    'finding a place i didn\'t know existed': 'discovery',
    // path b q6 EN
    'disconnect from routine': 'quiet',
    'regain energy and lightness': 'festive',
    'feel free and spontaneous': 'wild',
    'be amazed again': 'explorative',
    'feel the place deeply': 'spiritual',
    'step outside my comfort zone': 'adventure',
    // path a q1 stile
    'selvaggio': 'wild',
    'silenzioso': 'quiet',
    'caotico': 'chaotic',
    'intimo': 'intimate',
    'solitario': 'solitary',
    'rigenerante': 'regenerating',
    'autentico': 'authentic',
    'lusso quieto': 'quietluxury',
    'spirituale': 'spiritual',
    'festoso': 'festive',
    'avventuroso': 'adventure',
    'romantico': 'romantic',
    'culturale': 'cultural',
    'esplorativo': 'explorative',
    // path a q2 distanza
    'stesso continente': 'continent',
    'lontano': 'far',
    'ovunque': 'anywhere',
  };
  const mapped = keyMap[first] ?? first;
  return questionThemes[mapped] ?? questionThemes.default;
}
export function getMultipleThemes(selectedValues: string[]): QuestionTheme[] {
  if (!selectedValues || selectedValues.length === 0) return [questionThemes.default];
  
  const keyMap: Record<string, string> = {
    'africa & middle east': 'africa',
    'africa e medio oriente': 'africa',
    'close to home': 'close',
    'vicino a casa': 'close',
    'americas': 'americas',
    'americhe': 'americas',
    'oceania': 'oceania',
    'europe': 'europe',
    'europa': 'europe',
    'asia': 'asia',
    // Path B Q2 tipo viaggio
    'natura e avventura': 'nature',
    'nature and adventure': 'nature',
    'cibo e vino': 'food',
    'food and wine': 'food',
    'cultura e storia': 'culture',
    'culture and history': 'culture',
    'mare e relax': 'beach',
    'sea and relax': 'beach',
    'città e vita notturna': 'city',
    'city and nightlife': 'city',
    'fuori dal mondo': 'offgrid',
    'off the grid': 'offgrid',
    'road trip': 'roadtrip',
    'trekking e sport': 'trekking',
    'trekking and sport': 'trekking',
    'wellness e spa': 'wellness',
    'wellness and spa': 'wellness',
    'scoperta e sorpresa': 'discovery',
    'discovery and surprise': 'discovery',
    // Path A Q1 stile
    'selvaggio': 'wild',
    'wild': 'wild',
    'silenzioso': 'quiet',
    'quiet': 'quiet',
    'caotico': 'chaotic',
    'chaotic': 'chaotic',
    'intimo': 'intimate',
    'intimate': 'intimate',
    'solitario': 'solitary',
    'solitary': 'solitary',
    'rigenerante': 'regenerating',
    'regenerating': 'regenerating',
    'autentico': 'authentic',
    'authentic': 'authentic',
    'lusso quieto': 'quietluxury',
    'quiet luxury': 'quietluxury',
    'spirituale': 'spiritual',
    'spiritual': 'spiritual',
    'festoso': 'festive',
    'festive': 'festive',
    'avventuroso': 'adventure',
    'adventurous': 'adventure',
    'romantico': 'romantic',
    'romantic': 'romantic',
    'culturale': 'cultural',
    'cultural': 'cultural',
    'esplorativo': 'explorative',
    'explorative': 'explorative',
    // Path A Q2 distanza
    'vicino a casa': 'close',
    'close to home': 'close',
    'stesso continente': 'continent',
    'same continent': 'continent',
    'lontano': 'far',
    'far away': 'far',
    'ovunque': 'anywhere',
    'anywhere': 'anywhere',
  };

  return selectedValues.map(val => {
    const key = val.toLowerCase().trim();
    const mapped = keyMap[key] ?? key;
    return questionThemes[mapped] ?? questionThemes.default;
  });
}
