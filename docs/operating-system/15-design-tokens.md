# 15 — Design Tokens

> The quantitative layer of the Design Bible.
>
> Every other document says *what* and *why*.
> This one says *how much*.
>
> Phase 8 of the Mockup Translation Protocol depends entirely on this file:
> if a value is not here, it must be added here — never invented locally.

---

# Typography

Three levels. Nothing else. (Doc 06)

```
--t-manifesto   clamp(38px, 5vw, 76px)   serif · 400 · -0.02em · line-height 1.04
--t-narrative   16px                     sans  · line-height 1.65 · max-width 560px
--t-interface   12.5px                   sans  · line-height 1.45
```

Two modifiers only:

```
--t-eyebrow     10.5px  uppercase  letter-spacing 0.16em  600
--t-manifesto-s clamp(28px, 3.4vw, 44px)   secondary headlines
```

Paragraph width stays inside 520–620px (doc 14) — `--t-narrative` max-width is 560px,
which is ~58 characters at this size, inside the 40–65 range of doc 06.

---

# Spacing

The five rhythm values of doc 14, as named tokens.

```
--sp-1   72px
--sp-2   96px
--sp-3  120px
--sp-4  180px
--sp-5  220px
```

Rhythm is created by **alternating** these in an irregular order —
never by inventing intermediate values.

Micro-spacing inside a component:

```
--gap-1   8px
--gap-2  16px
--gap-3  24px
--gap-4  40px
```

Mobile scales the rhythm tokens by 0.55 (`--sp-4` 180 → 100). Micro-gaps never scale.

---

# Radius

```
--r-s     12px    images, small surfaces
--r-m     20px    panels, previews
--r-pill  999px   buttons, chips
```

---

# Shadows

Three. Large radius, low opacity, no sharp edges (doc 08, doc 14).

```
--sh-none      none
--sh-ambient   0 40px 120px -40px rgba(0,0,0,0.75)
--sh-lift      0 24px 60px -24px rgba(0,0,0,0.6)
```

Never animate a shadow (doc 11, doc 12).

---

# Blur

Closed set (doc 14). No intermediate values.

```
--bl-1  12px
--bl-2  24px
--bl-3  48px
```

---

# Opacity

```
--op-veil-light   0.45   photography that must stay readable as an image
--op-veil-heavy   0.72   photography behind long text (doc 02: photo becomes texture)
--op-glass-border 0.08          inside the 6–10% of doc 14
--op-particle     0.08          upper bound of doc 14
```

---

# Duration

Aligned to the Motion Scale of doc 11.

```
--d-xs   0.16s     XS · interface acknowledgement
--d-s    0.30s     S  · small transitions
--d-m    0.60s     M  · most movement
--d-l    1.20s     L  · atmospheric
--d-xl   18s       XL · world motion, loops
```

Easing:

```
--e-enter   cubic-bezier(0.22, 1, 0.36, 1)     easeOut family · no overshoot
--e-calm    cubic-bezier(0.65, 0, 0.35, 1)     easeInOutCubic · default
--e-exit    cubic-bezier(0.55, 0, 1, 0.45)     easeInCubic
```

Springs stay critically damped (ratio ≈ 1.0): they arrive and stop, never rebound.

---

# Breakpoints

Three compositions, not three scales (doc 14, doc 12).

```
--bp-mobile    < 768px      one column · photography fills more of the screen
--bp-tablet    768–1199px   recomposed, not stacked
--bp-desktop   >= 1200px    full composition
```

---

# Color

Already tokenised. Corrections applied:

```
--led-bg       #0b0c11    deep blue-black · never #000
--led-bg2      #101219
--led-ink      #f5f4f2    warm white · never #fff
--led-ink-dim  rgba(245,244,242,0.62)
--led-ink-faint rgba(245,244,242,0.40)
--led-accent   #f0435a    signal only — never decoration
--led-accent-2 #ff7a6e    soft coral · glows, network, light
```

The primary CTA keeps a filled coral surface as a **declared exception** to doc 07
("never large coral surfaces"), justified by doc 00 #13 — *clarity comes first*:
an invitation must be findable. It is never justified by conversion (doc 00 #14).

---

# Touch

Non-negotiable (Constitution: accessibility before aesthetics).

```
--touch-floor  44px   minimum hit area, always
```

A control may *look* smaller than 44px. Its **hit area** may not.
Extend it with a `::before` overlay rather than padding, so composition is unaffected.
Inputs stay at 16px minimum to prevent iOS zoom.

---

# Rule

If a mockup needs a value that is not in this file:
stop, propose the token, add it here, then implement.

Never write a raw value into a component.
