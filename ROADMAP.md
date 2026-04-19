# SUBSTRATA UI Overhaul: Blender-Style Unified Viewport

## Status: IN PROGRESS

Last updated: 2025-04-19

---

## Problem Statement

Current layout feels like separate web pages glued with tabs. Too many headers/subheaders eat viewport space. Switching tabs kills in-progress generation. Library is isolated. Advisor is a floating popup instead of integrated.

## Target

One fullscreen viewport (like Blender) with panels that overlay/dock. Generation survives tab switches. Advisor is a permanent side panel. Design output tabs appear progressively as content generates.

---

## Checklist

### Phase 1: Non-destructive state management
- [ ] **1.1** Lift `PrototypingStudio` generation state (`isGenerating`, `currentProject`, `generationProgress`) up to `App.tsx` so switching tabs doesn't unmount the component and kill generation
- [ ] **1.2** Use `useRef` for the generation abort controller so it persists across re-renders
- [ ] **1.3** Keep all tab content mounted (use CSS `hidden` instead of conditional rendering) so 3D canvas & generation survive tab switches

### Phase 2: Unified viewport layout (Blender-style)
- [ ] **2.1** Remove `max-w-7xl` container — go full-width `h-screen` with no scrolling
- [ ] **2.2** Replace current header + tabs + sidebar grid with a single flexbox viewport:
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
- [ ] **2.3** Advisor panel = left dock (~300px), collapsible. Contains chat + design objectives input (merged)
- [ ] **2.4** Props panel = right dock (~280px), context-sensitive: shows laser params when in laser mode, printer/sourcing when in prototype mode
- [ ] **2.5** Main viewport fills remaining space, resizes with window (`flex-1` + `h-full`)
- [ ] **2.6** Bottom output strip = horizontal tabs that appear progressively during generation

### Phase 3: Advisor integration
- [ ] **3.1** Move "Design Objectives" textarea from PrototypingStudio left panel INTO the advisor chat (user types project idea in advisor, advisor drives generation)
- [ ] **3.2** Remove the separate floating advisor popup — advisor is now the left dock panel
- [ ] **3.3** The "Generate Blueprint" button lives at the bottom of the advisor panel (below chat)

### Phase 4: Progressive generation display
- [ ] **4.1** During generation, show a status log in the advisor panel: "Decomposing subsystems...", "Generating OpenSCAD...", "Building BOM...", etc.
- [ ] **4.2** Output tabs (Abstract, BOM, 3D Files, SVG, Wiring, Code, Assembly) start hidden/disabled
- [ ] **4.3** Each tab lights up / becomes clickable as its content is generated (simulate with timed progress since Gemini returns all at once)
- [ ] **4.4** Auto-switch to the first completed tab when generation finishes

### Phase 5: Library integration
- [ ] **5.1** Remove Library as a top-level tab
- [ ] **5.2** Add a "Library" button/icon in the toolbar or advisor panel that opens a modal/drawer overlay
- [ ] **5.3** Library drawer slides over the viewport (doesn't navigate away)
- [ ] **5.4** Selecting a library item loads it and closes the drawer

### Phase 6: Polish & responsiveness
- [ ] **6.1** All panels auto-resize to window height (`h-screen`, no `overflow-y: scroll` on body)
- [ ] **6.2** Viewport uses `resize: horizontal` or drag handles between panels
- [ ] **6.3** Collapse advisor panel on mobile (toggle button)
- [ ] **6.4** Test all modes: laser studio, prototype studio, generation in progress, library overlay
- [ ] **6.5** Final build check — clean compile, no errors

### Phase 7: Commit & deploy
- [ ] **7.1** Commit with detailed message
- [ ] **7.2** Push to trigger CI/CD deploy
- [ ] **7.3** Verify on gantasmo.ai

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
