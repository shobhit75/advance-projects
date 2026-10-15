# Pixel Dataset Builder — Design Brainstorm

## Approach 1

**Theme Name:** Signal Archive

**Very Brief Intro:** An editorial-grade computer vision workbench with warm paper, ink-black structure, and infrared coral accents. It makes pixel inspection feel precise, tactile, and quietly obsessive—like a lab notebook designed for modern data work.

**Probability:** 0.07

## Approach 2

**Theme Name:** Midnight Raster

**Very Brief Intro:** A dark, instrument-panel aesthetic with near-black surfaces, laser green status cues, and crisp monospaced telemetry. It emphasizes focus and technical depth for long annotation sessions.

**Probability:** 0.04

## Approach 3

**Theme Name:** Chromatic Field

**Very Brief Intro:** A bright, airy studio interface using soft mineral tones and bold primaries to turn image annotation into a visual composition exercise. It feels open, curious, and approachable for first-time dataset builders.

**Probability:** 0.09

## Chosen Direction: Signal Archive

### Design Movement
Swiss editorial systems design meets contemporary creative-coding tooling: structured like a field manual, but softened with paper texture, measured typographic rhythm, and moments of high-saturation signal colour.

### Core Principles
1. **Evidence before decoration.** Every visual element should help the user locate, inspect, label, or export pixel data.
2. **Asymmetric workbench.** Keep the canvas dominant, with a narrow source rail and a technical inspector rail rather than a generic centered dashboard.
3. **Tactile precision.** Use graph-paper cues, numbered coordinates, thin rules, and little status chips to make data feel tangible.
4. **Signal as reward.** Reserve vivid coral and cobalt for selection, active tools, and moments that indicate the dataset is becoming more complete.

### Color Philosophy
The interface lives on a warm ivory ground (#F5F1E8) so the canvas reads like a physical specimen sheet. Ink-black (#1D1D1B) provides editorial authority, while a single ownable infrared coral (#F05D4E) marks selection and action. Muted blue (#3867C8) is reserved for informational metadata and export readiness. The emotional intent is calm concentration with occasional bursts of signal.

### Layout Paradigm
A three-zone workbench: a compact left rail for project/source navigation, a large center inspection bay for the image and pixel grid, and a right rail for the selected pixel and dataset status. The header is a thin instrument bar rather than a hero. On small screens, the rails become collapsible trays and the inspection bay remains the first priority.

### Signature Elements
- A **coordinate crosshair** that follows the inspected pixel and echoes through the coordinate readout.
- **Graph-paper surfaces** and tick-mark rulers around the image viewport.
- A small **signal strip** that turns selected pixels into a horizontal colour history, like a lab sample tape.

### Interaction Philosophy
Interactions should feel direct and inspectable. Clicking or dragging on the image changes the crosshair and inspector immediately; hover gives a lightweight preview, while selection is always explicit. Keyboard shortcuts are shown beside tools, and any destructive action requires an intentional confirmation rather than a hidden side effect.

### Animation
Use restrained 160–220ms transitions with a custom ease-out. The inspector value updates can briefly slide 4px and fade in, the crosshair should track without springiness, and drawers should enter from their rail edge at 96% scale. Avoid animating high-frequency pixel interactions; preserve responsiveness. Respect reduced-motion preferences.

### Typography System
Use **DM Sans** for interface copy and **IBM Plex Mono** for coordinates, hex values, dimensions, and export metadata. Headings use DM Sans 700 with tight tracking; eyebrow labels use IBM Plex Mono at 10–11px uppercase with generous letter spacing. Numeric values should be visually heavier than their labels to reinforce measurement.

### Brand Essence
A focused browser workbench for turning images into exact, inspectable pixel datasets—built for people who want their training data to be explainable, not mysterious. Personality: **precise, tactile, observant**.

### Brand Voice
Headlines are concise and slightly editorial. CTAs are verbs that imply handling evidence, not generic onboarding language. Microcopy should explain what the tool is measuring and why.

Example lines:
- “Every pixel is a record.”
- “Inspect the specimen. Keep the signal.”

### Wordmark & Logo
Use a bold geometric mark made from four offset square cells that form a small crosshair/asterisk, with one coral cell indicating the active sample. The wordmark should be set in a custom-feeling all-caps lockup with tight spacing, never a default brand font treatment. For the UI favicon, use the four-cell crosshair mark without text.

### Signature Brand Color
**Infrared Coral — #F05D4E.** It is warm enough to feel human and sharp enough to read as a live signal against the paper-and-ink system.

### File-Level Style Reminder
All component and page files should keep this direction in mind: warm paper foundation, ink-black editorial structure, infrared coral for active signal, IBM Plex Mono for measurements, asymmetric workbench over a centered dashboard, and tactile pixel-grid motifs.
