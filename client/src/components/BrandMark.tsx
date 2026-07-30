/**
 * BrandMark — il logo MindRoute (la farfalla) come SVG inline riusabile.
 * Estratto dall'header per poterlo usare anche nel footer senza duplicare le
 * definizioni. `idPrefix` rende unici gli id di gradient/filtro: due istanze
 * sulla stessa pagina (header "nav", footer "foot") non collidono.
 */
export function BrandMark({ size = 28, idPrefix = "bm", className }: { size?: number; idPrefix?: string; className?: string }) {
  const p = idPrefix;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} style={{ verticalAlign: "middle", flex: "none" }} aria-hidden="true">
      <defs>
        <linearGradient id={`${p}-lg1`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFADC0" />
          <stop offset="35%" stopColor="#F06080" />
          <stop offset="70%" stopColor="#D63055" />
          <stop offset="100%" stopColor="#7A1020" />
        </linearGradient>
        <linearGradient id={`${p}-lg2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D03050" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3A0510" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`${p}-ls`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id={`${p}-lc`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="60%" stopColor="#FFE0E8" />
          <stop offset="100%" stopColor="#FFB0C0" />
        </radialGradient>
        <filter id={`${p}-lf`}>
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>
      <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill={`url(#${p}-lg1)`} filter={`url(#${p}-lf)`} />
      <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill={`url(#${p}-ls)`} opacity="0.6" />
      <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill={`url(#${p}-lg1)`} filter={`url(#${p}-lf)`} />
      <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill={`url(#${p}-ls)`} opacity="0.55" />
      <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill={`url(#${p}-lg2)`} opacity="0.82" />
      <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill={`url(#${p}-lg2)`} opacity="0.82" />
      <ellipse cx="60" cy="59.5" rx="5.5" ry="6.5" fill={`url(#${p}-lc)`} filter={`url(#${p}-lf)`} />
      <ellipse cx="58.2" cy="57.2" rx="2" ry="2.5" fill="rgba(255,255,255,0.65)" />
      <ellipse cx="58.5" cy="57.5" rx="0.7" ry="0.9" fill="rgba(255,255,255,0.95)" />
      <path d="M58.5 66L60 108L61.5 66" fill={`url(#${p}-lg1)`} opacity="0.82" />
      <circle cx="60" cy="47" r="3.8" fill={`url(#${p}-lc)`} filter={`url(#${p}-lf)`} />
      <ellipse cx="58.6" cy="45.8" rx="1.4" ry="1.6" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}
