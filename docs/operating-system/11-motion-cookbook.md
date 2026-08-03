# 11 — Motion Cookbook

## Purpose

Motion is a language.

This document defines every approved animation used inside MindRoute.

If an animation is not documented here,

it should not exist.

Consistency is more important than creativity.

---

# Motion Principles

Every animation must answer one question:

Why is this moving?

If no meaningful answer exists,

remove the animation.

Motion communicates:

attention

space

continuity

understanding

never decoration.

---

# Motion Scale

### XS — Immediate

Purpose:

Interface acknowledgement.

Duration:

120–180ms

Examples:

Button press.

Checkbox.

Hover state.

Cursor feedback.

---

### S — Responsive

Purpose:

Small interface transitions.

Duration:

200–350ms

Examples:

Cards appearing.

Small panels.

Labels.

Focus changes.

---

### M — Natural

Purpose:

Most interface movement.

Duration:

450–700ms

Examples:

Section transitions.

Typography reveal.

Image movement.

Navigation.

---

### L — Atmospheric

Purpose:

Environmental movement.

Duration:

1–2 seconds

Examples:

Light shifts.

Photography breathing.

Network evolution.

Fog.

---

### XL — World Motion

Purpose:

Continuous ambient animation.

Duration:

5–20 seconds

Loops forever.

Never attracts attention.

Examples:

Particle drift.

Constellation movement.

Slow background light.

Atmospheric gradients.

---

# Approved Easings

Default:

easeInOutCubic

For calm transitions.

---

Entrance:

easeOutQuart

Feels effortless.

Never explosive.

---

Exit:

easeInCubic

Objects gently disappear.

Never snap away.

---

Ambient:

Linear

Continuous.

Invisible.

---

Forbidden:

Bounce.

Elastic.

Back.

Overshoot.

Spring with exaggerated rebound.

Anything playful.

---

# Animation Library

## A01 — Fade Into Presence

Purpose

Reveal something that already exists.

Not make something appear.

Animation

Opacity:

0 → 100%

Small upward movement:

12px

Duration:

500ms

Use:

Typography.

Labels.

Images.

Never:

Buttons.

---

## A02 — Environmental Reveal

Purpose

Reveal space.

Background slowly becomes visible.

Animation

Opacity.

Very slow brightness increase.

Subtle atmospheric movement.

Duration:

1.2 seconds

Use:

Scene transitions.

Hero.

Large photography.

---

## A03 — Typography Emergence

Purpose

Words are discovered.

Not animated.

Animation

Very small vertical offset.

Opacity.

Tiny letter spacing correction.

Duration:

700ms

Never split letters dramatically.

Never kinetic typography.

---

## A04 — Photography Breathing

Purpose

Keep photography alive.

Animation

Scale:

100%

↓

101%

↓

100%

Duration:

18 seconds.

Loop.

Barely visible.

---

## A05 — Network Drift

Purpose

The identity network evolves.

Animation

Nodes move slowly.

Connections stretch.

Signals travel occasionally.

Nothing synchronized.

Nothing periodic.

Every movement feels organic.

---

## A06 — Light Sweep

Purpose

Suggest changing atmosphere.

Animation

Soft light slowly crosses the scene.

Large radius.

Very low opacity.

Duration:

10–15 seconds.

---

## A07 — Focus Illumination

Purpose

Recognize visitor attention.

Animation

Small brightness increase.

Tiny glow.

Duration:

180ms.

Hover only.

---

## A08 — Compression

Purpose

Physical confirmation.

Animation

Scale:

100%

↓

98%

↓

100%

Duration:

160ms.

Click only.

Never exaggerated.

---

## A09 — Layer Shift

Purpose

Reveal depth.

Animation

Foreground:

moves normally.

Midground:

moves slightly slower.

Background:

moves even slower.

Creates subtle parallax.

Never obvious.

---

## A10 — Scene Morph

Purpose

Transition between chapters.

Animation

Photography overlaps.

Typography fades.

Network survives.

Light continues.

Nothing cuts.

Duration:

1 second.

---

## A11 — Sequential Reveal

Purpose

A group is discovered one element at a time.

Not all at once.

Animation

Each child runs A01.

Delay between children:

90ms

Maximum children in one sequence:

6

Beyond six the sequence becomes a list.

Split it instead.

Use:

Timelines.

Day sequences.

Grouped statements.

Never:

Navigation.

Interface controls.

---

## A12 — Thread Progression

Purpose

Show where the visitor is inside the narrative.

The identity thread is continuous.

Only the active node changes.

Animation

The line is always fully drawn.

The active node illuminates.

The previous node dims.

Duration:

300ms

Never animate the line itself while scrolling.

Never let the thread become a progress bar.

---

# Motion Hierarchy

Priority order:

1.

User interaction.

↓

2.

Narrative animation.

↓

3.

Environmental animation.

↓

4.

Decorative movement.

Decorative movement should rarely exist.

---

# Simultaneous Motion

Maximum:

Three independent animations at once.

Example:

Typography.

↓

Network.

↓

Particles.

Everything else remains still.

Silence creates impact.

---

# Motion Density

Most of the interface should remain still.

Animation gains meaning through rarity.

Avoid constantly moving interfaces.

---

# Reduced Motion

Respect system preferences.

If the visitor requests reduced motion:

Remove:

Parallax.

Breathing.

Environmental loops.

Preserve:

Hierarchy.

Continuity.

Meaning.

Motion should simplify.

Never disappear completely.

---

# Performance

Never animate:

Width.

Height.

Top.

Left.

Heavy shadows.

Large blur values.

Prefer:

Opacity.

Transform.

Scale.

Rotation (rarely).

GPU-friendly properties.

Smoothness is mandatory.

---

# Forbidden Animations

Never use:

Bounce.

Confetti.

Flying cards.

Exploding elements.

Fast parallax.

Rotating icons.

Constant floating buttons.

Loading spinners.

Infinite pulse.

Looping CTA animations.

Motion that asks for attention.

---

# Emotional Mapping

Curiosity

↓

Reveal.

Recognition

↓

Fade.

Reflection

↓

Stillness.

Discovery

↓

Depth.

Understanding

↓

Transformation.

Trust

↓

Stability.

Confidence

↓

Calm completion.

Every animation should reinforce one emotion.

---

# Motion References

Study:

Apple product pages.

Arc Browser.

Linear.

Nothing.

Stripe Sessions.

The New York Times interactive stories.

Observe how motion disappears behind narrative.

---

# Final Principle

The visitor should rarely think:

"That animation was beautiful."

They should instead think:

"This experience felt alive."

When motion becomes atmosphere,

it has succeeded.
