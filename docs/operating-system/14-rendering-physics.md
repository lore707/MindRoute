# 14 — Rendering Physics

> Rendering Physics defines the visual laws of MindRoute.
>
> It specifies how every screen should be composed, rendered and perceived.
>
> If Experience Principles define how MindRoute should feel,
> Rendering Physics defines how that feeling is physically built.

---

# Viewport Composition

Every viewport must contain one dominant idea.

Never introduce multiple competing messages.

One viewport.

One emotion.

One focal point.

---

# Composition Ratio

Preferred composition:

• 60–80% atmosphere
• 20–40% interface

The interface should never visually dominate the scene.

---

# Visual Layers

Every scene should contain at least four independent layers.

Layer 0 — Background atmosphere

Layer 1 — Photography

Layer 2 — Identity Network

Layer 3 — Typography

Layer 4 — Interface

Each layer must have different depth, opacity and motion.

Never flatten layers.

---

# Photography

Photography builds space.

It is never decorative.

Rules:

• Occupies 50–80% of the viewport
• May overflow viewport boundaries
• Never appears inside obvious rectangles
• Never competes with typography
• Cropping follows emotion, never geometry

---

# Typography

Typography should breathe.

Rules:

• Hero titles: maximum 8 words
• Paragraph width: 520–620px
• Labels: one line only
• Never justify text
• Never place long paragraphs over busy photography

---

# Spacing Rhythm

Avoid repetitive spacing.

Preferred rhythm:

96px

↓

180px

↓

72px

↓

220px

↓

120px

Spacing should create breathing,
not mathematical consistency.

---

# Visual Weight

Every viewport has only one visual anchor.

Possible anchors:

• Photography
• Manifesto sentence
• Interactive object

Everything else supports the anchor.

Never create two competing focal points.

---

# Glass

Glass exists only to separate interface from world.

Rules:

• Blur: 24px or 48px only
• Border opacity: 6–10%
• Noise: subtle
• Never stack multiple glass layers

---

# Blur

Allowed values only:

12px

24px

48px

Never invent intermediate values.

---

# Shadows

Shadows create depth.

Never attention.

Rules:

• Large radius
• Low opacity
• Soft edges

Never use sharp UI shadows.

---

# Network

The identity network is alive.

Rules:

• Never intersect headlines
• Never cover faces
• Never create perfect symmetry
• Connections fade before leaving the viewport
• Nodes illuminate only when meaningful

---

# Atmosphere

Backgrounds should never be static.

Allowed atmospheric elements:

• Fog
• Dust
• Light gradients
• Particles

Everything else should remain still.

---

# Particles

Density:

Low.

Opacity:

Below 8%.

Movement:

Linear.

Slow.

Never react to cursor.

Never pulse.

---

# Light

Light reveals.

It never decorates.

Rules:

• One primary light source
• One secondary accent maximum
• Never illuminate every element equally
• Contrast guides attention

---

# Scroll

Scrolling reveals the world.

Rules:

Every 100vh introduces only one narrative idea.

Scenes overlap.

Never hard-cut between sections.

The visitor should feel continuous movement.

---

# Scene Continuity

Every new scene should inherit something from the previous one.

Examples:

• Photography

• Network

• Light

• Atmosphere

Nothing should feel reset.

---

# Motion

Motion follows physical weight.

Large objects move slower.

Small objects respond faster.

Nothing bounces.

Nothing overshoots.

Nothing snaps.

---

# Responsive Rendering

Desktop, tablet and mobile are different compositions.

Never simply stack components.

Recompose the scene.

Preserve the emotion.

Not the layout.

---

# Performance

Never sacrifice fluidity.

Target:

60 FPS.

Prefer GPU-friendly transforms.

Avoid layout recalculations during animations.

The experience should always feel effortless.

---

# Rendering Checklist

Before approving any screen verify:

□ One dominant focal point.

□ Clear visual hierarchy.

□ Large breathing space.

□ Photography creates architecture.

□ Typography remains readable.

□ Motion communicates meaning.

□ No decorative animation.

□ Atmosphere remains subtle.

□ Responsive composition works independently.

□ The interface disappears behind the experience.

---

# Final Principle

The visitor should never notice the rendering.

They should only remember the feeling of having travelled through a coherent world.

If the rendering becomes visible,

it has failed.
