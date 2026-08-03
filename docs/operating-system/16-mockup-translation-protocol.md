# 16 — Mockup Translation Protocol

> The Mockup Translation Protocol defines how every visual reference must be interpreted before writing a single line of code.
>
> A mockup is never copied.
>
> It is translated.
>
> Claude must understand **why** every visual decision exists before reproducing it.
>
> Never begin implementation directly from a screenshot.

---

# Phase 1 — Read The Experience

Ignore components.

Ignore buttons.

Ignore spacing.

Ask only:

What should the visitor feel?

Choose one dominant emotion.

Examples:

• Curiosity

• Wonder

• Calm

• Introspection

• Discovery

Everything else depends on this answer.

---

# Phase 2 — Identify The Narrative

Every viewport communicates only one idea.

Before implementation write down:

Current scene

↓

What changes

↓

Next scene

If a viewport communicates more than one idea,

the mockup has not yet been understood.

---

# Phase 3 — Identify The Hero

Every viewport has exactly one hero.

Possible heroes:

• Photography

• Typography

• Interactive object

• Identity Network

Everything else exists to reinforce it.

Never implement before identifying the hero.

---

# Phase 4 — Decompose The Scene

Split the viewport into layers.

Layer 0

Atmosphere

Layer 1

Photography

Layer 2

Network

Layer 3

Typography

Layer 4

Interface

Layer 5

Micro-details

Each layer should be implemented independently.

Never flatten the composition.

---

# Phase 5 — Detect Visual Hierarchy

Before coding identify:

Primary attention

Secondary attention

Supporting elements

Background

If hierarchy is unclear,

do not start implementation.

---

# Phase 6 — Identify Materials

Every object belongs to a material.

Possible materials:

Photography

Glass

Solid

Light

Shadow

Atmosphere

Gradient

Reflection

Never invent new materials.

Reuse existing rendering rules.

---

# Phase 7 — Detect Motion

Ignore animation first.

Identify intention.

For every moving element ask:

Why does it move?

What starts the movement?

What stops the movement?

What changes because of the movement?

If movement has no narrative purpose,

remove it.

---

# Phase 8 — Translate To Tokens

No arbitrary values.

Every implementation must use:

Spacing tokens

Typography tokens

Radius tokens

Blur tokens

Shadow tokens

Opacity tokens

Duration tokens

If a token does not exist,

propose adding one.

Never invent one locally.

---

# Phase 9 — Build Structure First

Implementation order:

Layout

↓

Photography

↓

Atmosphere

↓

Typography

↓

Network

↓

Interface

↓

Interactions

↓

Animations

Never animate unfinished layouts.

---

# Phase 10 — Validate Responsive Behaviour

Do not scale.

Recompose.

Check:

Desktop

Tablet

Mobile

The emotional experience must remain identical.

Only the composition changes.

---

# Phase 11 — Compare

After implementation compare the result with the mockup.

Evaluate:

Composition

Hierarchy

Rhythm

Photography

Depth

Typography

Rendering

Motion

Atmosphere

Not pixels.

Perception.

---

# Phase 12 — Visual Critique

Ask:

Does this create the same feeling?

Does the eye travel through the page in the same way?

Does the composition breathe the same way?

Is anything louder than in the original?

Has any unnecessary interface appeared?

Would someone unfamiliar with the mockup perceive them as the same experience?

If not,

continue iterating.

---

# Translation Rules

Never copy colors before understanding hierarchy.

Never copy spacing before understanding rhythm.

Never copy animations before understanding intention.

Never copy components before understanding composition.

Never optimise before achieving visual parity.

Never simplify because implementation is difficult.

If implementation becomes technically challenging,

preserve the experience,

not the shortcut.

---

# Priority Order

When two aspects conflict:

Experience

↓

Narrative

↓

Composition

↓

Hierarchy

↓

Rendering

↓

Interaction

↓

Animation

↓

Code simplicity

Engineering never has priority over perception.

---

# Definition Of Done

A translation is complete only when:

The visitor would describe the two experiences with the same emotions,

even if they never notice that the implementation is different.

That is visual fidelity.

Not pixel perfection.
