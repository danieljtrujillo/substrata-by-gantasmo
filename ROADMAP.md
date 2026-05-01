# SUBSTRATA UI Overhaul: Blender-Style Unified Viewport

## Status: PHASES 1–7 COMPLETE — multi-mode studio shipped

Last updated: 2026-04-30

---

## Shipped beyond original roadmap

- ✅ **Three studio modes** — `maker | architecture | hacker` toggle in the top header, persisted in `localStorage` (`substrata.studioMode`).
- ✅ **Architecture mode** — IBC / ADA / NEC validation (`buildingCodeRules.ts`), panel schedule + electrical plan SVG (`electricalPlan.ts`), 40+ AIA / ISO-16739 layers (`layerSystem.ts`).
- ✅ **Hacker mode** — Canonical schematic IR (`circuitGraph.ts`), `validateSchematic()`, KiCad 8/9 `.kicad_sch` emitter (`kicadEmit.ts`), `generatePCBSchematic()` Gemini constraint.
- ✅ **Reference Library scraper** — `ScraperAdapter` framework with Smithsonian Open Access (CC0) and Library of Congress HABS / HAER / HALS (PD) adapters; SHA-256 dedup, polite throttling, license-aware filtering.
- ✅ **Smart Blocks** — Auto-refactors repeated OpenSCAD primitives into reusable modules (`smartBlocks.ts`).
- ✅ **Mesh validator** — Printability scorecard with closed-mesh / non-manifold / overhang / wall-thickness checks plus print-time / weight / cost estimates (`meshValidator.ts`).
- ✅ **AdvancedEditor** — Konva-based inpainting / outpainting / style-transfer canvas.
- ✅ **DocumentationViewer** — Searchable docs with HTML and PDF export, Mermaid diagrams, embedded base64 images.
- ✅ **4 design styles** — Minimalist · Deconstructivist · Classical · Organic injected into all generation prompts (`styleGuides.ts`).
- ✅ **Concept sketch panel** — 4 modes (rough · refined · technical · presentation) plus multi-view concept sheet.
- ✅ **Parametric variant generator** — Modify existing OpenSCAD with natural-language prompt.

---

## Next-phase candidates

- [ ] **STEP / IFC export** for architecture mode (currently DXF-style layer maps + SVG only).
- [ ] **PCB layout** (currently schematic only — pair `circuitGraph` with `kicad_pcb` emitter).
- [ ] **Adapter expansion** — GitHub, Thingiverse, Printables, GrabCAD scraper adapters (currently surfaced via AI search but not direct ingest).
- [ ] **Real-time collaboration** — Cloudflare Durable Objects for multi-user editing.
- [ ] **G-code preview** — Visualize laser / printer paths before fabrication.
- [ ] **Custom material presets** — User-trainable laser / printer profiles backed by D1.
- [ ] **Plugin system** — Allow third-party adapters / generators / validators to register at runtime.

---

## Original UI overhaul checklist (complete)

## Problem Statement

Current layout feels like separate web pages glued with tabs. Too many headers/subheaders eat viewport space. Switching tabs kills in-progress generation. Library is isolated. Advisor is a floating popup instead of integrated.

## Target

One fullscreen viewport (like Blender) with panels that overlay/dock. Generation survives tab switches. Advisor is a permanent side panel. Design output tabs appear progressively as content generates.

---

## Checklist

### Phase 1: Non-destructive state management
- [x] **1.1** Lift `PrototypingStudio` generation state (`isGenerating`, `currentProject`, `generationProgress`) up to `App.tsx` so switching tabs doesn't unmount the component and kill generation
- [x] **1.2** Use `useRef` for the generation abort controller so it persists across re-renders
- [x] **1.3** Keep all tab content mounted (use CSS `hidden` instead of conditional rendering) so 3D canvas & generation survive tab switches

### Phase 2: Unified viewport layout (Blender-style)
- [x] **2.1** Remove `max-w-7xl` container — go full-width `h-screen` with no scrolling
- [x] **2.2** Replace current header + tabs + sidebar grid with a single flexbox viewport:
  ```
  ┌──────────────────────────────────────────────────┐
  │ TOOLBAR (thin, 36px)  [logo] [mode] [save] [user] │
  ├────────┬─────────────────────────────┬───────────┤
  │        │                             │           │
  │ ADVISOR│      MAIN VIEWPORT          │  PROPS    │
  │ CHAT   │  (3D / Laser / Code view)   │  PANEL    │
  │ PANEL  │                             │ (context- │
  │        │                             │  aware)   │
  │        │                             │           │
  ├────────┴──────────┬──────────────────┴───────────┤
  │  OUTPUT TABS (appear as generated)                │
  │  [Abstract] [BOM] [3D Files] [2D Files]          │
  │  [Wiring] [Code] [Assembly]                      │
  └───────────────────────────────────────────────────┘
  ```
- [x] **2.3** Advisor panel = left dock (~300px), collapsible. Contains chat + design objectives input (merged)
- [x] **2.4** Props panel = right dock (~280px), context-sensitive: shows laser params when in laser mode, printer/sourcing when in prototype mode
- [x] **2.5** Main viewport fills remaining space, resizes with window (`flex-1` + `h-full`)
- [x] **2.6** Bottom output strip = horizontal tabs that appear progressively during generation

### Phase 3: Advisor integration
- [x] **3.1** Move "Design Objectives" textarea from PrototypingStudio left panel INTO the advisor chat (user types project idea in advisor, advisor drives generation)
- [x] **3.2** Remove the separate floating advisor popup — advisor is now the left dock panel
- [x] **3.3** The "Generate Blueprint" button lives at the bottom of the advisor panel (below chat)

### Phase 4: Progressive generation display
- [x] **4.1** During generation, show a status log in the advisor panel: "Decomposing subsystems...", "Generating OpenSCAD...", "Building BOM...", etc.
- [x] **4.2** Output tabs (Abstract, BOM, 3D Files, SVG, Wiring, Code, Assembly) start hidden/disabled
- [x] **4.3** Each tab lights up / becomes clickable as its content is generated (simulate with timed progress since Gemini returns all at once)
- [x] **4.4** Auto-switch to the first completed tab when generation finishes

### Phase 5: Library integration
- [x] **5.1** Remove Library as a top-level tab
- [x] **5.2** Add a "Library" button/icon in the toolbar or advisor panel that opens a modal/drawer overlay
- [x] **5.3** Library drawer slides over the viewport (doesn't navigate away)
- [x] **5.4** Selecting a library item loads it and closes the drawer

### Phase 6: Polish & responsiveness
- [x] **6.1** All panels auto-resize to window height (`h-screen`, no `overflow-y: scroll` on body)
- [x] **6.2** Viewport uses `resize: horizontal` or drag handles between panels
- [x] **6.3** Collapse advisor panel on mobile (toggle button)
- [x] **6.4** Test all modes: laser studio, prototype studio, generation in progress, library overlay
- [x] **6.5** Final build check — clean compile, no errors

### Phase 7: Commit & deploy
- [x] **7.1** Commit with detailed message
- [x] **7.2** Push to trigger CI/CD deploy
- [x] **7.3** Verify on gantasmo.ai

---

## Files to modify
- `src/App.tsx` — Major rewrite (layout, state lifting, advisor dock)
- `src/components/PrototypingStudio.tsx` — Accept lifted state, remove left panel
- `src/index.css` — Add viewport-lock styles, panel resize styles

## Architecture decisions
- Keep all tab content mounted via CSS display:none instead of conditional rendering. This preserves 3D canvas WebGL context and generation state.
- Advisor merges design objectives into a single input point for the user.
- Generation state lives in App so it survives any panel/tab switch.
- Bottom output strip uses horizontal scrollable tabs, no vertical page scroll.
