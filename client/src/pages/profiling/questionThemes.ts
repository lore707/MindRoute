// Tema visivo per ogni chip — gradiente + SVG decorativo
// Usato al posto dello sfondo immagine sfocato
 
export interface QuestionTheme {
  gradient: string;        // gradiente CSS per lo sfondo del pannello
  svgPath: string;         // SVG path da renderizzare nell'angolo
  svgViewBox: string;
  accentColor: string;     // colore dell'SVG e degli accenti
}
 
export const questionThemes: Record<string, QuestionTheme> = {
 
  // ─── PATH B Q1 — Dove vuoi andare ───────────────────────────────────────────
 
  close: {
    gradient: "radial-gradient(ellipse at 80% 20%, rgba(100,160,120,0.13), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(80,140,100,0.08), transparent 50%)",
    accentColor: "rgba(80,140,100,0.18)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="42" r="18" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M60 60 L60 85" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M48 85 L72 85" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M42 42 Q42 24 60 24 Q78 24 78 42 Q78 58 60 68 Q42 58 42 42Z" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <circle cx="60" cy="42" r="6" fill="currentColor" opacity="0.6"/>
    `,
  },
 
  europe: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(73,90,200,0.13), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(60,80,180,0.08), transparent 50%)",
    accentColor: "rgba(73,90,200,0.20)",
    svgViewBox: "0 0 120 140",
    svgPath: `
      <path d="M60 20 L60 100" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      <path d="M35 55 Q35 28 60 20 Q85 28 85 55 L85 75 Q85 95 60 105 Q35 95 35 75 Z" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M42 55 L78 55" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
      <path d="M38 70 L82 70" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
      <path d="M35 55 L85 55" stroke="currentColor" stroke-width="1.2" opacity="0.25"/>
      <circle cx="60" cy="20" r="4" fill="currentColor" opacity="0.7"/>
      <path d="M50 105 L50 118 M70 105 L70 118" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity="0.5"/>
      <path d="M44 118 L76 118" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    `,
  },
 
  asia: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(200,60,60,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(220,100,60,0.08), transparent 50%)",
    accentColor: "rgba(200,60,60,0.20)",
    svgViewBox: "0 0 120 130",
    svgPath: `
      <path d="M18 90 L102 90" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M28 90 L28 50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M92 90 L92 50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 54 Q60 30 106 54" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 54 L22 90 M98 54 L98 90" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M38 90 L38 60 M60 90 L60 55 M82 90 L82 60" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>
      <path d="M46 54 Q60 40 74 54" fill="currentColor" opacity="0.25"/>
      <circle cx="60" cy="38" r="5" fill="currentColor" opacity="0.5"/>
      <path d="M50 115 L70 115 M42 108 L78 108" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    `,
  },
 
  americas: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(100,160,80,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(180,120,60,0.09), transparent 50%)",
    accentColor: "rgba(120,160,80,0.20)",
    svgViewBox: "0 0 120 130",
    svgPath: `
      <path d="M60 110 L60 55" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M40 80 Q40 55 60 55 Q80 55 80 80 Q80 100 60 110 Q40 100 40 80Z" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <path d="M30 95 Q20 85 25 70 Q30 60 40 62" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.5" stroke-linecap="round"/>
      <path d="M90 95 Q100 85 95 70 Q90 60 80 62" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.5" stroke-linecap="round"/>
      <path d="M44 30 Q60 15 76 30 Q80 40 60 48 Q40 40 44 30Z" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M50 48 L50 55 M70 48 L70 55" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <circle cx="60" cy="80" r="5" fill="currentColor" opacity="0.55"/>
    `,
  },
 
  africa: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(210,140,50,0.13), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(200,100,40,0.08), transparent 50%)",
    accentColor: "rgba(210,140,50,0.22)",
    svgViewBox: "0 0 140 110",
    svgPath: `
      <path d="M70 95 L70 30" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M70 30 Q40 45 25 30 Q35 55 30 70 Q45 60 70 55" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M70 30 Q100 45 115 30 Q105 55 110 70 Q95 60 70 55" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 70 Q50 80 70 75 Q90 80 110 70" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.5"/>
      <path d="M20 96 L120 96" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
      <circle cx="45" cy="96" r="3" fill="currentColor" opacity="0.35"/>
      <circle cx="70" cy="96" r="3" fill="currentColor" opacity="0.35"/>
      <circle cx="95" cy="96" r="3" fill="currentColor" opacity="0.35"/>
    `,
  },
 
  oceania: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(50,180,200,0.13), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(40,140,180,0.08), transparent 50%)",
    accentColor: "rgba(50,180,200,0.20)",
    svgViewBox: "0 0 130 100",
    svgPath: `
      <path d="M15 65 Q30 45 45 65 Q60 85 75 65 Q90 45 105 65 Q115 78 125 65" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M15 50 Q30 30 45 50 Q60 70 75 50 Q90 30 105 50 Q115 63 125 50" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <path d="M15 80 Q30 65 45 80 Q60 95 75 80 Q90 65 105 80 Q115 90 125 80" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
      <circle cx="65" cy="28" r="12" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/>
      <path d="M65 16 L65 8 M65 40 L65 48 M53 28 L45 28 M77 28 L85 28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
    `,
  },
 
  // ─── PATH A Q1 — Stile di viaggio ───────────────────────────────────────────
 
  wild: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(60,140,80,0.13), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(40,100,60,0.08), transparent 50%)",
    accentColor: "rgba(60,140,80,0.20)",
    svgViewBox: "0 0 120 110",
    svgPath: `
      <path d="M60 15 L90 75 L30 75 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M40 75 L60 35 L80 75" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5" stroke-linejoin="round"/>
      <path d="M15 75 L105 75" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      <path d="M60 75 L60 95" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <circle cx="60" cy="15" r="4" fill="currentColor" opacity="0.5"/>
    `,
  },
 
  quiet: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(180,200,220,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(140,170,200,0.08), transparent 50%)",
    accentColor: "rgba(140,170,200,0.20)",
    svgViewBox: "0 0 120 100",
    svgPath: `
      <path d="M20 55 Q35 35 50 55 Q65 75 80 55 Q95 35 110 55" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M20 40 Q35 25 50 40 Q65 55 80 40 Q95 25 110 40" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
      <circle cx="60" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>
      <path d="M60 10 L60 4 M60 30 L60 36 M50 20 L44 20 M70 20 L76 20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>
    `,
  },
 
  chaotic: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(233,69,96,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(200,60,80,0.08), transparent 50%)",
    accentColor: "rgba(233,69,96,0.20)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <path d="M20 30 L50 60 L30 90" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
      <path d="M100 25 L65 55 L95 85" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
      <path d="M40 20 L80 60 L50 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="35" cy="55" r="4" fill="currentColor" opacity="0.4"/>
      <circle cx="85" cy="45" r="3" fill="currentColor" opacity="0.35"/>
      <circle cx="60" cy="75" r="5" fill="currentColor" opacity="0.5"/>
    `,
  },
 
  intimate: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(220,100,120,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(180,80,100,0.08), transparent 50%)",
    accentColor: "rgba(220,100,120,0.20)",
    svgViewBox: "0 0 120 110",
    svgPath: `
      <path d="M60 85 Q30 65 30 45 Q30 25 60 30 Q90 25 90 45 Q90 65 60 85Z" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M60 75 Q38 60 38 45 Q38 32 60 36 Q82 32 82 45 Q82 60 60 75Z" fill="currentColor" opacity="0.12"/>
      <circle cx="60" cy="55" r="8" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.5"/>
    `,
  },
 
  solitary: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(100,120,160,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(80,100,140,0.08), transparent 50%)",
    accentColor: "rgba(100,120,160,0.20)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="60" cy="60" r="22" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
      <circle cx="60" cy="60" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
      <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.6"/>
      <path d="M60 25 L60 18 M60 95 L60 102 M25 60 L18 60 M95 60 L102 60" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    `,
  },
 
  regenerating: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(80,180,140,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(60,160,120,0.08), transparent 50%)",
    accentColor: "rgba(80,180,140,0.20)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <path d="M60 95 C60 95 25 75 25 45 C25 28 40 15 60 20 C80 15 95 28 95 45 C95 75 60 95 60 95Z" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M60 80 C60 80 38 65 38 45 C38 33 47 25 60 28 C73 25 82 33 82 45 C82 65 60 80 60 80Z" fill="currentColor" opacity="0.10"/>
      <path d="M60 20 L60 95" stroke="currentColor" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
      <path d="M40 38 Q60 32 80 38" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M35 55 Q60 48 85 55" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
    `,
  },
 
  authentic: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(180,130,80,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(160,110,60,0.08), transparent 50%)",
    accentColor: "rgba(180,130,80,0.20)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <rect x="30" y="50" width="60" height="50" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M20 55 L60 22 L100 55" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="48" y="72" width="24" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/>
      <rect x="36" y="60" width="14" height="14" rx="2" fill="currentColor" opacity="0.2"/>
      <rect x="70" y="60" width="14" height="14" rx="2" fill="currentColor" opacity="0.2"/>
      <circle cx="60" cy="22" r="4" fill="currentColor" opacity="0.5"/>
    `,
  },
 
  quietluxury: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(200,180,140,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(180,160,120,0.08), transparent 50%)",
    accentColor: "rgba(200,180,140,0.22)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M60 22 L67 44 L90 44 L72 57 L79 80 L60 67 L41 80 L48 57 L30 44 L53 44 Z" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <path d="M60 30 L65 46 L82 46 L68 56 L74 73 L60 63 L46 73 L52 56 L38 46 L55 46 Z" fill="currentColor" opacity="0.10"/>
    `,
  },
 
  spiritual: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(140,100,180,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(120,80,160,0.08), transparent 50%)",
    accentColor: "rgba(140,100,180,0.20)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="30" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M60 30 L60 90 M30 60 L90 60" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M39 39 L81 81 M81 39 L39 81" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
      <circle cx="60" cy="60" r="8" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/>
      <circle cx="60" cy="60" r="3" fill="currentColor" opacity="0.7"/>
    `,
  },
 
  festive: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(233,160,60,0.13), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(220,120,40,0.08), transparent 50%)",
    accentColor: "rgba(233,160,60,0.22)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <path d="M60 20 L60 100" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <path d="M25 40 Q45 55 60 40 Q75 25 95 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <path d="M20 65 Q40 80 60 65 Q80 50 100 65" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <circle cx="40" cy="35" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="80" cy="50" r="3" fill="currentColor" opacity="0.4"/>
      <circle cx="35" cy="70" r="3" fill="currentColor" opacity="0.4"/>
      <circle cx="85" cy="75" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="60" cy="90" r="3" fill="currentColor" opacity="0.4"/>
    `,
  },
 
  adventure: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(233,120,60,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(200,90,40,0.08), transparent 50%)",
    accentColor: "rgba(233,120,60,0.20)",
    svgViewBox: "0 0 120 110",
    svgPath: `
      <path d="M15 85 L45 35 L60 55 L75 25 L105 85 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M15 85 L105 85" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      <path d="M45 85 L45 60 L60 72 L75 50 L75 85" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linejoin="round"/>
      <circle cx="75" cy="25" r="4" fill="currentColor" opacity="0.5"/>
    `,
  },
 
  romantic: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(220,80,120,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(200,60,100,0.08), transparent 50%)",
    accentColor: "rgba(220,80,120,0.20)",
    svgViewBox: "0 0 120 110",
    svgPath: `
      <path d="M60 88 C60 88 20 65 20 38 C20 22 35 15 60 28 C85 15 100 22 100 38 C100 65 60 88 60 88Z" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M60 78 C60 78 30 58 30 38 C30 26 42 20 60 30 C78 20 90 26 90 38 C90 58 60 78 60 78Z" fill="currentColor" opacity="0.10"/>
    `,
  },
 
  cultural: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(73,90,200,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(60,80,180,0.08), transparent 50%)",
    accentColor: "rgba(73,90,200,0.20)",
    svgViewBox: "0 0 130 110",
    svgPath: `
      <rect x="20" y="55" width="90" height="45" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M15 58 L65 20 L115 58" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M35 100 L35 68 L50 68 L50 100" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.6"/>
      <path d="M55 100 L55 68 L75 68 L75 100" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.6"/>
      <path d="M80 100 L80 68 L95 68 L95 100" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.6"/>
      <path d="M10 100 L120 100" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    `,
  },
 
  explorative: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(60,180,160,0.12), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(40,160,140,0.08), transparent 50%)",
    accentColor: "rgba(60,180,160,0.20)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M60 22 L60 98 M22 60 L98 60" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
      <path d="M35 35 L85 85 M85 35 L35 85" stroke="currentColor" stroke-width="1" opacity="0.2"/>
      <path d="M60 22 Q75 40 85 60 Q75 80 60 98 Q45 80 35 60 Q45 40 60 22Z" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <circle cx="60" cy="60" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"/>
      <path d="M56 56 L64 64 M64 56 L56 64" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
    `,
  },
 
  // ─── PATH A Q7 — Distanza ──────────────────────────────────────────────────
 
  continent: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(73,90,200,0.11), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(60,80,180,0.07), transparent 50%)",
    accentColor: "rgba(73,90,200,0.18)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M60 22 L60 98 M22 60 L98 60" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
      <path d="M60 22 Q82 40 82 60 Q82 80 60 98 Q38 80 38 60 Q38 40 60 22Z" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M30 38 Q60 28 90 38 M26 60 Q60 50 94 60 M30 82 Q60 72 90 82" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
    `,
  },
 
  far: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(200,60,60,0.11), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(180,50,50,0.07), transparent 50%)",
    accentColor: "rgba(200,60,60,0.18)",
    svgViewBox: "0 0 130 80",
    svgPath: `
      <path d="M15 55 Q35 20 65 18 Q95 16 115 45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M108 38 L115 45 L106 50" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 65 Q65 50 115 65" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3" stroke-linecap="round"/>
      <circle cx="15" cy="60" r="4" fill="currentColor" opacity="0.5"/>
      <circle cx="115" cy="47" r="4" fill="currentColor" opacity="0.5"/>
    `,
  },
 
  anywhere: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(60,180,160,0.11), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(40,160,140,0.07), transparent 50%)",
    accentColor: "rgba(60,180,160,0.18)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M60 22 L60 98 M22 60 L98 60" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
      <path d="M60 22 Q82 40 82 60 Q82 80 60 98 Q38 80 38 60 Q38 40 60 22Z" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M30 38 Q60 28 90 38 M26 60 Q60 50 94 60 M30 82 Q60 72 90 82" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
      <path d="M60 10 L63 20 L60 16 L57 20 Z" fill="currentColor" opacity="0.5"/>
      <path d="M110 60 L100 63 L104 60 L100 57 Z" fill="currentColor" opacity="0.4"/>
    `,
  },
 
  // ─── DEFAULT ───────────────────────────────────────────────────────────────
 
  default: {
    gradient: "radial-gradient(ellipse at 75% 15%, rgba(233,69,96,0.08), transparent 55%), radial-gradient(ellipse at 25% 85%, rgba(200,60,80,0.05), transparent 50%)",
    accentColor: "rgba(233,69,96,0.15)",
    svgViewBox: "0 0 120 120",
    svgPath: `
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>
      <path d="M60 25 L60 95 M25 60 L95 60" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    `,
  },
};
 
export function getQuestionTheme(selectedValues: string[]): QuestionTheme {
  if (!selectedValues || selectedValues.length === 0) return questionThemes.default;
  const first = selectedValues[0].toLowerCase().trim();
  return questionThemes[first] ?? questionThemes.default;
}
 
