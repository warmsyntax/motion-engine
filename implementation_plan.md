# motion-engine-mcp v2.0 — Updated Implementation Plan

## Project Understanding

**motion-engine-mcp** is an MCP server that forces LLMs to write Awwwards-level, physics-based UI animations. It currently has 1 tool (`generate_motion_spec`), 1 prompt (`motion_intent`), a Puppeteer telemetry engine, a Hooke's Law spring solver, and a `motion.md` compiler.

**What we're building**: An expanded MCP server that integrates with external tools (Pretext, Hallmark), adds intelligent motion restraint, and generates non-repetitive interaction patterns — all while respecting the cardinal rule: **don't overload the UI with unnecessary animation**.

---

## Key Design Principles

> [!IMPORTANT]
> **The Motion Budget Philosophy**: Every animation must earn its place. The engine will enforce a **motion budget** — a restraint system that caps total animated elements per page, limits concurrent animations, and rejects motion that doesn't serve a clear UI/UX purpose (draw attention, show relationships, provide feedback, or orient the user).

> [!IMPORTANT]
> **Pretext & Hallmark are EXTERNAL TOOLS, not rebuilt features**. When our MCP is active alongside these tools, the LLM should be instructed to use them for their strengths — Pretext for text measurement/layout, Hallmark for design intelligence. Our MCP acts as the **orchestrator** that bridges their output into motion specs.

---

## Proposed Changes

---

### Phase 1 — External Integration: Pretext (`@chenglou/pretext`)

[Pretext](https://github.com/chenglou/pretext) is a pure JS library for multiline text measurement & layout **without DOM reflow**. It uses `prepare()` for one-time text segmentation + canvas measurement, then `layout()` for pure arithmetic layout — no `getBoundingClientRect`, no layout thrashing.

**How motion-engine uses Pretext**: When the LLM needs to animate text (split text, kinetic typography, text reveals), our MCP tells it to use Pretext for measuring text dimensions instead of DOM measurements. This is critical because:
- Text animation requires knowing exact character/word/line positions
- DOM measurement (`getBoundingClientRect`) triggers layout reflow — the exact anti-pattern our engine bans
- Pretext's `layoutWithLines()` gives exact line breaks, `walkLineRanges()` gives per-line widths — perfect input for stagger calculations

#### [NEW] [integration/pretext_bridge.js](file:///f:/motionplugin/integration/pretext_bridge.js)

A bridge module that generates Pretext-aware code snippets for text animation:
- Detects if Pretext is available in the user's project (`@chenglou/pretext` in `package.json`)
- When available: generates code that uses `prepareWithSegments()` + `layoutWithLines()` for text measurement → feeds measured positions into spring animations
- When unavailable: falls back to a lightweight DOM-based character splitter (current behavior) but recommends Pretext installation
- Generates `prepare()` → `layout()` pipeline code for text height prediction without reflow
- Uses `walkLineRanges()` to compute per-line stagger delays proportional to actual text width

#### [MODIFY] [compiler/motion_md.js](file:///f:/motionplugin/compiler/motion_md.js)

Add a new **Section 8: TEXT ANIMATION** block to `motion.md` output:
- If Pretext detected: `text_measurement: pretext (reflow-free)` with code reference using `@chenglou/pretext`
- Split strategy (character / word / line) with per-unit spring params
- Stagger timing computed from actual text metrics (not arbitrary 30ms × index)
- Masking / clip modes for text reveal effects

#### [MODIFY] [server.js](file:///f:/motionplugin/server.js)

Register new tool `generate_text_animation`:
```
Tool: generate_text_animation
Arguments:
  - selector (string, required): CSS selector targeting the text element
  - split_by (string, optional): "character" | "word" | "line" — default: "word"
  - animation_style (string, optional): "reveal" | "cascade" | "typewriter" | "wave" — default: "reveal"
  - intent (string, optional): kinetic weight (heavy/grounded/balanced/light/floating)
  - direction (string, optional): "up" | "down" | "left" | "right" — default: "up"
```

---

### Phase 2 — External Integration: Hallmark (`nutlope/hallmark`)

[Hallmark](https://github.com/nutlope/hallmark) is an anti-AI-slop design skill with 20 themes, 57 slop-test gates, and 4 verbs (build, audit, redesign, study). It outputs `design.md` files — a portable design DNA document.

**How motion-engine uses Hallmark**: Hallmark's `design.md` is a goldmine of design intelligence that our context scanner can consume. When the LLM has both MCPs active:
- `hallmark study <screenshot|URL>` → extracts macrostructure, type-pairing, colour anchor → our engine reads this as input for motion personality
- `hallmark audit <target>` → identifies AI-slop patterns → our engine adds motion-specific slop detection on top
- Hallmark's theme system (20 themes, each with different structure) → our engine harmonizes motion to match the chosen theme's visual weight

#### [NEW] [integration/hallmark_bridge.js](file:///f:/motionplugin/integration/hallmark_bridge.js)

A bridge module that consumes Hallmark's output:
- **design.md parser**: Scans workspace for `design.md` (Hallmark's output format) and extracts:
  - `macrostructure` → maps to scroll choreography patterns (asymmetric grid = radial stagger, editorial = column cascade)
  - `type-pairing` → feeds into typography classification (more accurate than CSS heuristics alone)
  - `colour_anchor` → determines motion energy (dark anchors = smoother, vibrant anchors = snappier)
  - `theme_fingerprint` → ensures two different Hallmark themes get two different motion personalities
- **Anti-slop motion rules**: Extends Hallmark's 57 slop gates with motion-specific gates:
  - Gate: "Is this the same `translateY(40px) → 0, opacity 0 → 1` on every element?" → Reject, vary the motion
  - Gate: "Are all hover effects identical?" → Reject, compute per-element variation via FNV-1a noise
  - Gate: "Does this page have more than 3 different animation styles?" → Warning, consolidate for visual coherence

#### [MODIFY] [context_scanner.js](file:///f:/motionplugin/context_scanner.js)

Extend `scanWorkspace()` to:
- Look for `design.md` alongside existing `client_brief.md` / `design_system.md`
- Parse Hallmark's `design.md` format for theme/structure data
- Import and use the hallmark_bridge parser when `design.md` is found

---

### Phase 3 — Composable Interaction Primitives (Solving the Repetition Problem)

> [!IMPORTANT]
> **The problem you identified**: Fixed named presets (`hover-lift`, `hover-glow`, `click-ripple`) get repetitive. After a few uses, every project feels the same. The solution: **composable motion primitives** that the engine combines algorithmically.

Instead of 9 fixed presets, we define **8 atomic motion primitives** that compose into infinite unique interactions:

#### The Primitive System

| Primitive | What it controls | Range |
|-----------|-----------------|-------|
| `translate` | Position shift (x, y, z) | -100px to +100px |
| `scale` | Size change | 0.9 to 1.15 |
| `rotate` | Rotation (x, y, z) | -15° to +15° |
| `opacity` | Fade | 0 to 1 |
| `shadow` | Elevation (pseudo-element) | spread 2px → 40px |
| `blur` | Background/element blur | 0 to 8px |
| `clip` | Clip-path reveal | inset/circle/polygon |
| `skew` | Perspective distortion | -5° to +5° |

#### The Composition Engine

The engine selects **2-3 primitives** per interaction based on:
1. **Element role** — Button? Card? Nav item? Hero? (determines which primitives make sense)
2. **Design personality** — From Hallmark's `design.md` or context scanner (determines amplitude)
3. **Existing page motion** — What's already animated? (prevents duplication)
4. **FNV-1a selector hash** — Ensures each element gets a unique combination (deterministic, reproducible)

**Example compositions**:
- `.pricing-card` → `translate(-6px Y) + scale(1.02) + shadow(expand)` — classic lift
- `.nav-link` → `clip(underline reveal) + opacity(0.7→1)` — subtle underline slide
- `.feature-icon` → `rotate(5° Z) + scale(1.08) + blur(0→clear)` — playful pop
- `.testimonial-card` → `translate(-4px Y) + skew(0.5°) + shadow(soft)` — editorial drift

No two elements default to the same exact combo unless they're siblings in a group.

#### [NEW] [animation/interaction_composer.js](file:///f:/motionplugin/animation/interaction_composer.js)

- `composePrimitives(elementRole, designProfile, selector)` → returns a unique primitive combination
- `resolvePrimitive(primitive, intent, theme)` → converts a primitive into spring parameters
- Each primitive has its own spring axis mapping (translate → TranslateY, scale → Scale, etc.)
- **Anti-repetition guarantee**: The FNV-1a hash of the selector determines which primitives are selected and their exact amplitudes, so `.card-1` and `.card-2` get related-but-different motion

#### [MODIFY] [server.js](file:///f:/motionplugin/server.js)

Register new tool `generate_interaction_spec`:
```
Tool: generate_interaction_spec
Arguments:
  - selector (string, required): CSS selector for the interactive element
  - trigger (string, required): "hover" | "click" | "focus" | "drag" | "press"
  - element_role (string, optional): "button" | "card" | "nav" | "hero" | "icon" | "form" | "media" — helps pick primitives
  - primitives (string[], optional): Manually specify primitives to compose, e.g. ["translate", "shadow", "scale"]
  - intent (string, optional): kinetic weight
```

When `primitives` is not provided, the engine auto-selects based on `element_role` + design profile.

---

### Phase 4 — Motion Budget System (Preventing Animation Overload)

The core restraint layer that prevents LLMs from over-animating a page.

#### [NEW] [budget/motion_budget.js](file:///f:/motionplugin/budget/motion_budget.js)

**Budget rules**:

| Rule | Limit | Rationale |
|------|-------|-----------|
| Max animated elements per viewport | 8 | More than 8 simultaneous animations overwhelm perception |
| Max concurrent spring animations | 4 | GPU compositor layers are finite |
| Max stagger group size | 12 | Beyond 12, the cascade feels endless |
| Max total animation time per page load | 2.5s | After 2.5s, the page should feel "settled" |
| Decorative-only animation ratio | ≤ 30% | At least 70% of animations must serve a functional purpose |
| Repeated identical motion patterns | ≤ 2 | Same animation on 3+ unrelated elements = slop |

**Purpose classification** — every animation must declare its purpose:
- `feedback` — Responding to user action (hover, click, focus)
- `orientation` — Helping user understand spatial relationships (page transitions, modal entry)
- `attention` — Drawing user to important content (CTA pulse, notification badge)
- `delight` — Enhancing emotional response (scroll reveals, stagger cascades) — budget-limited
- `status` — Communicating system state (loading, success, error)

**The `assess_motion_budget` tool** scans the workspace or a spec and returns:
- Current animation count vs. budget
- Which animations are functional vs. decorative
- Recommendations to remove or consolidate

```
Tool: assess_motion_budget
Arguments:
  - workspace_path (string, optional): Directory to scan
  - url (string, optional): Live URL to audit
```

**Output**: A budget report appended to `motion.md` or returned as tool response:
```
## MOTION BUDGET REPORT
- Animated elements: 6/8 (OK)
- Concurrent animations: 3/4 (OK)
- Functional: 4 (67%) | Decorative: 2 (33%) (OK)
- Repeated patterns: 1 (OK)
- Recommendation: Budget allows 2 more animations. Prioritize CTA and form feedback.
```

---

### Phase 5 — Scroll Choreographer & Performance Validator

#### [NEW] [animation/scroll_choreographer.js](file:///f:/motionplugin/animation/scroll_choreographer.js)

Generates scroll-driven animation timelines for page sections:
- **Input**: List of selectors or auto-detect sections
- **Modes**: `cascade` (sequential), `radial` (center-out for grids), `parallel-lanes` (left/right independent), `scrub` (directly linked to scroll %)
- **Budget-aware**: Automatically limits stagger groups and skips low-priority elements when budget is tight
- **Output**: Per-element spring params, scroll trigger offsets, stagger delays, parallax factors, ready-to-use GSAP ScrollTrigger or CSS `animation-timeline: scroll()` code

```
Tool: generate_scroll_choreography
Arguments:
  - selectors (string[], required): CSS selectors to choreograph
  - url (string, optional): Reference URL to analyze
  - mode (string, optional): "cascade" | "radial" | "parallel-lanes" | "scrub"
  - intent (string, optional): kinetic weight
```

#### [NEW] [validation/performance_auditor.js](file:///f:/motionplugin/validation/performance_auditor.js)

Performance linter that catches all 12 anti-patterns from `motion.txt` Part 12:
- **Static scan**: `transition: all`, layout-property animations, direct `box-shadow` animation, missing `prefers-reduced-motion`, excessive `will-change`, scroll event listeners for animation, `setTimeout`/`setInterval` for animation, flash rates > 3/sec
- **Live audit** (optional, via Puppeteer): Chrome Performance timeline analysis — layout thrashing, paint-heavy frames, frame budget violations
- **Output**: Structured report with 🔴 Critical / 🟡 Warning / 🟢 Info severity levels + fix suggestions

```
Tool: validate_motion_performance
Arguments:
  - workspace_path (string, optional): Directory to scan
  - url (string, optional): Live URL to audit
  - fix_suggestions (boolean, optional): Include fix code — default: true
```

---

### Phase 6 — Enhanced Prompts & Existing Tool Refinements

#### [MODIFY] [server.js](file:///f:/motionplugin/server.js) — New Prompts

**Prompt: `design_audit`** — 4-question guided workflow:
1. Project type? (Landing / SaaS / E-commerce / Portfolio / Blog)
2. Brand personality? (Playful / Professional / Luxurious / Minimal / Bold)
3. Framework? (React / Vue / Svelte / Vanilla / Astro / Next.js)
4. What animations? (Scroll reveals / Hover effects / Page transitions / Text animations / All)

Routes to appropriate tool combination.

**Prompt: `component_motion`** — Quick 3-question assistant:
1. Component? (Button / Card / Modal / Nav / Hero / Form / Toast / Dropdown)
2. Trigger? (Hover / Click / Scroll / Mount / Focus)
3. Feel? (Snappy / Smooth / Bouncy / Heavy / Floating)

Generates a `generate_interaction_spec` call with auto-selected primitives.

#### [MODIFY] [server.js](file:///f:/motionplugin/server.js) — Existing `generate_motion_spec` enhancements

- New arg `output_library`: `"framer-motion"` | `"gsap"` | `"css-native"` | `"motion-one"` | `"auto"`
- New arg `element_type`: `"button"` | `"card"` | `"modal"` | `"hero"` | `"nav"` | `"text"` | `"custom"`
- New arg `stagger_count`: Number of sibling elements for stagger computation
- **Budget integration**: Output includes budget impact assessment

#### [MODIFY] [types.js](file:///f:/motionplugin/types.js)

Add new types: `MotionPrimitive`, `PrimitiveComposition`, `MotionBudget`, `BudgetReport`, `ScrollTimeline`, `PerformanceReport`, `DesignProfile`, `AnimationPurpose` enum, `ElementRole` enum, `PrimitiveType` enum

---

## New Directory Structure

```
motionplugin/
├── index.js                              (unchanged)
├── server.js                             (modified — all new tools/prompts)
├── types.js                              (modified — new types)
├── context_scanner.js                    (modified — design.md parsing)
├── integration/                          (NEW)
│   ├── pretext_bridge.js                 (Pretext detection + code generation)
│   └── hallmark_bridge.js                (design.md parser + anti-slop gates)
├── animation/                            (NEW)
│   ├── interaction_composer.js           (composable primitives engine)
│   └── scroll_choreographer.js           (scroll timeline generator)
├── budget/                               (NEW)
│   └── motion_budget.js                  (restraint system)
├── validation/                           (NEW)
│   └── performance_auditor.js            (anti-pattern linter)
├── compiler/
│   └── motion_md.js                      (modified — new sections)
├── physics/                              (unchanged)
├── telemetry/                            (unchanged)
├── math/                                 (unchanged)
└── test.js                               (modified — new tests)
```

---

## Complete MCP API After Implementation

### Tools (6 total)
| # | Tool | Purpose |
|---|------|---------|
| 1 | `generate_motion_spec` | **(enhanced)** Core spring physics spec generator |
| 2 | `generate_text_animation` | Text choreography with Pretext integration |
| 3 | `generate_interaction_spec` | Composable primitive-based interaction design |
| 4 | `generate_scroll_choreography` | Full-page scroll timeline generator |
| 5 | `validate_motion_performance` | Performance anti-pattern linter |
| 6 | `assess_motion_budget` | Animation restraint / overload prevention |

### Prompts (3 total)
| # | Prompt | Purpose |
|---|--------|---------|
| 1 | `motion_intent` | **(existing)** 3-question kinetic weight / trigger / spatial plane |
| 2 | `design_audit` | 4-question guided design + framework discovery |
| 3 | `component_motion` | Quick 3-question component-level motion assistant |

---

## Verification Plan

### Automated Tests
```bash
node test.js
```
Extended with:
- **Pretext bridge**: Verify detection logic, code generation for text animation specs
- **Hallmark bridge**: Verify `design.md` parsing, anti-slop gate evaluation
- **Interaction composer**: Verify unique primitive selections for different selectors, FNV-1a determinism, anti-repetition guarantees
- **Motion budget**: Verify budget limit enforcement, purpose classification, budget report generation
- **Scroll choreography**: Verify timeline ordering, mode-specific behavior, budget-aware pruning
- **Performance auditor**: Verify detection of all 12 anti-patterns from `motion.txt` Part 12

### Manual Verification
- Register updated MCP in Gemini CLI, test each tool
- Verify Pretext bridge detects `@chenglou/pretext` in a test project's `package.json`
- Verify Hallmark bridge correctly parses a sample `design.md`
- Verify interaction composer generates different primitive combos for 5 different selectors
- Verify motion budget correctly rejects over-animated specs
- Verify all 6 tools appear in `tools/list` and all 3 prompts appear in `prompts/list`
