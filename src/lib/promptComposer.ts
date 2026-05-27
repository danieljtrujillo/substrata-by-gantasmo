// ─────────────────────────────────────────────────────────────────────────────
// Prompt composer — produces high-fidelity sample prompts the user can fire
// straight into the generator. Composes mode × style × movement overlays into
// a single prompt that explicitly demands professional deliverables (BOMs,
// measurable plans, fabrication intent, blueprint completeness).
//
// This is what powers the "Generate Sample Prompt" button. It's deterministic
// — no AI calls — so it's instant and never costs tokens.
// ─────────────────────────────────────────────────────────────────────────────

export type ComposerMode = 'maker' | 'architecture' | 'hacker';
export type ComposerStyle =
  | 'minimalist'
  | 'deconstructivist'
  | 'classical'
  | 'organic';

/**
 * Movement overlays — orthogonal to the base style. Inspired by the radial
 * Zaha-style architectural seed prompt the user asked us to parameterise.
 */
export type ComposerMovement =
  | 'generative'
  | 'mid_century_modern'
  | 'art_nouveau'
  | 'art_deco'
  | 'brutalist'
  | 'bauhaus'
  | 'parametric'
  | 'biomimetic';

export interface ComposerOptions {
  mode: ComposerMode;
  style: ComposerStyle;
  movement?: ComposerMovement;
  /** Optional subject hint — when present the composer biases towards it. */
  seed?: string;
}

// ── Mode templates ───────────────────────────────────────────────────────────
const MODE_SEEDS: Record<ComposerMode, string[]> = {
  maker: [
    'a desktop CNC dust shoe with magnetic skirt and replaceable nylon bristles',
    'a modular under-shelf workbench organiser for hand tools',
    'a parametric phone stand with wireless charging coil pocket',
    'a tool-free handle for a soldering iron with heat-dissipating fins',
    'a hex-pattern shelf bracket that nests flat for shipping',
    'a battery-powered macro photography rig with built-in diffuser',
    'an enclosure for a Raspberry Pi 5 with active cooling and USB extender',
    'an articulating monitor arm clamp with cable management channel',
  ],
  architecture: [
    'a single-storey 90 m² desert dwelling with shaded courtyard and clerestory',
    'a 3-bedroom hillside cabin with cantilevered deck and green roof',
    'an urban infill ADU with rainwater harvesting and solar overhang',
    'a community library pavilion with sliding louvres and exposed CLT',
    'a small-footprint mountain refuge with stove core and stack ventilation',
    'a beach cottage on stilts with operable shutter walls',
    'an inner-city food hall with sawtooth roof and steel truss',
    'a coastal lifeguard tower with marine-grade aluminium screen',
  ],
  hacker: [
    'an ESP32 weather station with BME280, OLED, USB-C, and battery backup',
    'a CAN-bus dashboard logger with SD storage and RTC',
    'a USB-C power delivery trigger board with selectable 5/9/15/20V output',
    'a desktop touch macropad with ten keys, RGB underglow, and rotary encoder',
    'a low-side MOSFET driver shield for a 12V solenoid bank',
    'a stepper motor breakout with TMC2209 drivers and screw terminals',
    'a Li-ion battery charger with USB-PD input and INA219 monitoring',
    'an STM32-based BLDC motor controller with current-sense shunt',
  ],
};

// ── Style overlays ───────────────────────────────────────────────────────────
const STYLE_OVERLAYS: Record<ComposerStyle, string> = {
  minimalist:
    'Visual language: minimalist. Reduce ornament to function. Single dominant material. Crisp 1 mm fillets. No surface graphics beyond essential markings. Negative space is part of the composition.',
  deconstructivist:
    'Visual language: deconstructivist. Fragmented planes, off-axis assemblies, expressed joinery. Edges chamfered asymmetrically; visible fastener pattern as design language.',
  classical:
    'Visual language: classical. Tripartite composition (base, shaft, cap). Mouldings and reveals at junctions. Symmetry on at least one axis. Proportional rhythm follows whole-number ratios.',
  organic:
    'Visual language: organic. Hull/lofted surfaces, no straight runs over 30 mm without a curvature event. Surfaces evolve along a guide curve. Branching geometry where structurally appropriate.',
};

// ── Movement overlays ────────────────────────────────────────────────────────
const MOVEMENT_OVERLAYS: Record<ComposerMovement, string> = {
  generative:
    'Movement overlay: generative. Form is the outcome of a documented rule set (e.g. radial Voronoi seeded from program zones, recursive subdivision, attractor-driven fillet radii). Include the rule parameters in the deliverable.',
  mid_century_modern:
    'Movement overlay: mid-century modern. Hairpin/tapered legs, walnut/oak finish vocabulary, organic-modern silhouettes, integrated handles, no superfluous trim.',
  art_nouveau:
    'Movement overlay: art nouveau. Whiplash curves, botanical motifs, asymmetrical balance, wrought-iron joinery suggestions, ornamental flourishes that follow structural lines.',
  art_deco:
    'Movement overlay: art deco. Stepped geometry, sunburst/chevron motifs, polished metal accents, vertical emphasis, symmetrical luxury.',
  brutalist:
    'Movement overlay: brutalist. Monolithic mass, board-form concrete texture, exposed structure, deep window reveals, raw materiality.',
  bauhaus:
    'Movement overlay: bauhaus. Primary geometry (circle/square/triangle), primary palette, function-as-form, rigorous grid logic.',
  parametric:
    'Movement overlay: parametric. All key dimensions are named variables; export the parameter table alongside the model. Two driver parameters must control 80%+ of the variation.',
  biomimetic:
    'Movement overlay: biomimetic. Form follows a named biological analogue (e.g. trabecular bone, honeycomb cells, lotus self-cleaning surface). State the analogue and the property it borrows.',
};

// ── Professional-deliverables block ──────────────────────────────────────────
// Appended to every composed prompt so the generator always knows the bar.
const DELIVERABLES_BLOCK = (mode: ComposerMode): string => {
  const base = [
    'DELIVERABLES (required, not optional):',
    '- Fully realised parametric model with named variables for every primary dimension.',
    '- Complete bill of materials with real part numbers, quantities, and source links where applicable.',
    '- Dimensioned 2D drawings: every part labelled, every critical dimension annotated in mm.',
    '- Title block on every sheet with project name, sheet label, scale, units (mm), and revision.',
    '- Assembly instructions in numbered steps referencing part IDs from the BOM.',
    '- Tolerance/fit notes for any mating feature (clearance vs press vs interference).',
    '- Material schedule when more than one material is used.',
  ];
  if (mode === 'architecture') {
    base.push(
      '- Floor plan SVG with dimensions, room labels, door swings, north arrow, and scale bar.',
      '- Building code-checkable descriptor (doors / stairs / ramps / habitable rooms) covering every element.',
      '- Electrical plan when applicable (panels, circuits, devices) with NEC working-clearance compliance.',
    );
  }
  if (mode === 'hacker') {
    base.push(
      '- KiCad-emittable schematic (every ref designator unique, every net fully connected, ERC clean).',
      '- Pin-by-pin wiring map referencing real KiCad library symbols.',
      '- Power budget: load list with continuous/peak current and source utilisation.',
    );
  }
  base.push(
    '',
    'Forbidden: placeholder cylinders standing in for real parts; unmeasured drawings; unlabeled sheets;',
    'BOM rows that read just "wood" or "screws" without spec; assembly steps that say "assemble" without sequence.',
  );
  return base.join('\n');
};

/** Pick deterministically based on hash of options — keeps "regenerate" useful
 * by rotating through the seed list rather than repeating. */
function pickSeed(mode: ComposerMode, salt: number): string {
  const list = MODE_SEEDS[mode];
  return list[Math.abs(salt) % list.length];
}

let composerCounter = 0;

/**
 * Compose a fully-formed prompt from (mode, style, movement) and optionally a
 * seed hint. The output is intentionally verbose — it tells the AI what
 * "professional" means for this output and removes the most common excuses
 * for low-quality blueprints.
 */
export function composeSamplePrompt(opts: ComposerOptions): string {
  composerCounter += 1;
  const subject = opts.seed?.trim()
    ? opts.seed.trim()
    : pickSeed(opts.mode, composerCounter);

  const lines = [
    `Design: ${subject}.`,
    '',
    STYLE_OVERLAYS[opts.style],
  ];
  if (opts.movement) {
    lines.push('', MOVEMENT_OVERLAYS[opts.movement]);
  }
  lines.push('', DELIVERABLES_BLOCK(opts.mode));
  return lines.join('\n');
}

/** UI label helpers — keep human-readable strings in one place. */
export const MOVEMENT_LABELS: Record<ComposerMovement, string> = {
  generative:         'Generative',
  mid_century_modern: 'Mid-Century Modern',
  art_nouveau:        'Art Nouveau',
  art_deco:           'Art Deco',
  brutalist:          'Brutalist',
  bauhaus:            'Bauhaus',
  parametric:         'Parametric',
  biomimetic:         'Biomimetic',
};

export const ALL_MOVEMENTS: ComposerMovement[] = [
  'generative',
  'parametric',
  'biomimetic',
  'mid_century_modern',
  'art_nouveau',
  'art_deco',
  'bauhaus',
  'brutalist',
];
