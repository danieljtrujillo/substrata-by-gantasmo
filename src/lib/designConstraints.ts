// Canonical design constraints for SUBSTRATA.
//
// Single source of truth for:
//   1. Negative constraint extraction from user prompts ("no flat roof", "no
//      right angles", "without plywood") — see extractNegativeConstraints.
//   2. The prompt block that injects those constraints into every generator
//      call as HARD rules — see negativeConstraintBlock.
//   3. Per-mode design vocabulary (architecture, maker, label, laser) so the
//      generators are told what richer vocabulary EXISTS to draw from — see
//      MODE_VOCABULARY.
//   4. Per-style hard rules and forbidden forms — see STYLE_HARD_RULES.
//
// Compliance validation (post-generation re-check) lives in
// `complianceValidator.ts` and consumes the same NegativeConstraintSet.

import type { DesignStyle } from '../styleGuides';

// ────────────────────────────────────────────────────────────────────────────
// Negative constraint extractor — regex pass.
//
// Captures the most common patterns. Intentionally over-captures: a few
// false positives are fine because they get re-injected as forbiddens
// which the model is told to honour anyway. Missing a real forbidden is
// far worse than catching a false one.

export interface NegativeConstraintSet {
  /** Raw banned terms / phrases as they appear in the prompt. */
  forbidden: string[];
  /** Required terms / phrases (positive constraints from "must have X"). */
  required: string[];
  /** The original prompt for transparency. */
  source: string;
}

const NEGATION_PATTERNS: RegExp[] = [
  // "no X", "no flat roof", "no right angles"
  /\bno\s+([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "not X", "not flat"
  /\bnot\s+([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "without X"
  /\bwithout\s+([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "don't / do not use X" (extended verb list incl. want/like)
  /\b(?:don'?t|do\s+not|never)\s+(?:use|include|add|have|put|make|want|like)\s+(?:any\s+|any\s+sort\s+of\s+|anything\s+)?([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "avoid X"
  /\bavoid\s+([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "exclude X"
  /\bexclud(?:e|ing)\s+([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "forbidden: X", "FORBIDDEN: X"
  /\bforbidden\s*:\s*([a-z][\w\s\-,]{2,80}?)(?=[.\n]|$)/gi,
];

const REQUIREMENT_PATTERNS: RegExp[] = [
  // "must have X"
  /\bmust\s+(?:have|include|use|contain|feature)\s+([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "needs X"
  /\bneeds?\s+(?:to\s+have\s+)?([a-z][\w\s\-]{2,40}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "required: X"
  /\brequired\s*:\s*([a-z][\w\s\-,]{2,80}?)(?=[.\n]|$)/gi,
  // "only X" (prefix form — "only use plywood")
  /\bonly\s+(?:use\s+)?([a-z][\w\s\-]{2,30}?)(?=[.,;!?\n]|$|\s+(?:and|or|but|with|except))/gi,
  // "use X only" / "X only" (postfix form — "stepper motors only", "plywood only")
  /\b(?:use\s+)?([a-z][\w\s\-]{2,40}?)\s+only(?=[.,;!?\n]|$)/gi,
];

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNegativeConstraints(prompt: string): NegativeConstraintSet {
  const forbidden = new Set<string>();
  const required = new Set<string>();
  for (const re of NEGATION_PATTERNS) {
    for (const m of prompt.matchAll(re)) {
      const term = normalise(m[1] ?? '');
      if (term && term.length >= 2 && term.length <= 80) {
        // Allow comma-separated lists in a single capture.
        for (const piece of term.split(/\s*,\s*|\s+and\s+|\s+or\s+/)) {
          const t = piece.trim();
          if (t.length >= 2) forbidden.add(t);
        }
      }
    }
  }
  for (const re of REQUIREMENT_PATTERNS) {
    for (const m of prompt.matchAll(re)) {
      const term = normalise(m[1] ?? '');
      if (term && term.length >= 2 && term.length <= 80) {
        for (const piece of term.split(/\s*,\s*|\s+and\s+|\s+or\s+/)) {
          const t = piece.trim();
          if (t.length >= 2) required.add(t);
        }
      }
    }
  }
  return { forbidden: [...forbidden], required: [...required], source: prompt };
}

// ────────────────────────────────────────────────────────────────────────────
// Prompt block — injected at the TOP of every system prompt so the model
// reads it before any positive instructions. The aggressive language is
// intentional: prior versions treated negatives as suggestions.

export function negativeConstraintBlock(set: NegativeConstraintSet): string {
  const has = set.forbidden.length > 0 || set.required.length > 0;
  const banner =
    'HARD CONSTRAINTS — HIGHEST PRIORITY. These override every style rule, example, and convention below.';
  if (!has) {
    return [
      banner,
      'No explicit forbiddens or requirements were detected in the user\'s prompt. Read the prompt carefully and treat any phrase like "no X", "without Y", "must have Z", or "only W" as a HARD constraint. If a constraint conflicts with a style rule, the user constraint wins.',
    ].join('\n');
  }
  const lines = [banner];
  if (set.forbidden.length) {
    lines.push('FORBIDDEN — these MUST NOT appear anywhere in the output (code, SVG, BOM, descriptions, material schedule, comments, names). A single violation fails the output:');
    for (const f of set.forbidden) lines.push(`  - ${f}`);
  }
  if (set.required.length) {
    lines.push('REQUIRED — these MUST be present in the output:');
    for (const r of set.required) lines.push(`  - ${r}`);
  }
  lines.push(
    '',
    'Also re-read the user\'s prompt for additional negatives or requirements you may have missed. The first line of `designNotes` in your response MUST list every constraint you detected and confirm how each was honoured. If a constraint makes the project impossible, state so explicitly in `designNotes` instead of silently ignoring it.',
  );
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Per-mode design vocabulary. Injected into the system prompt for the
// matching generator so the model knows the richer terms it should reach
// for. Each block is dense by design — every line is a vocabulary cue.

export const ARCHITECTURE_VOCABULARY = `
ARCHITECTURE VOCABULARY (use the specific terms; "wall" alone is too generic):

ROOF TYPOLOGY — never default to flat. Choose to match building + style:
- gabled (2-pitch with ridge), hipped (4-pitch, no gable), mansard (double-pitch with dormers),
  gambrel (barn), shed/monopitch, butterfly (inverted V, modernist only), sawtooth (industrial),
  curved/barrel-vaulted, conical (turret), domed, hyperbolic-paraboloid, green roof.
  Pitch ranges: residential 18°-45°, commercial 5°-25°. Eave overhang: 300-900mm for drainage + sun shading.

WALL ARTICULATION — a wall longer than 6m must NOT be a single unbroken plane:
- bay window (3-sided projection), oriel (cantilevered bay), buttress (mass + setback step),
  pilaster (engaged column), rustication (banded base course), string course (horizontal banding),
  corbel (stepped projection), recessed entry niche, blind arcade.
  Recesses ≥ 100mm deep; projections offset 150-600mm.

FENESTRATION RHYTHM — windows are NEVER randomly placed:
- pattern: ABA, AABA, regular grid, vertical slot, Palladian (arch + 2 rect), clerestory,
  ribbon (continuous horizontal), punched-hole (deep reveals).
- vertical alignment across floors mandatory unless style = deconstructivist.
- window-to-wall ratio: residential 15-30%, commercial 30-60%.
- mullion spacing 600-1200mm. Sill heights consistent per floor.

CORNICE / PARAPET / BASE — every facade has three zones unless minimalist:
- base course: 600-900mm rusticated or board-formed concrete.
- body: main wall surface with fenestration.
- cornice/parapet: 300-600mm projecting cap. Profile choices: dentil, cyma recta, cyma reversa,
  cavetto, ogee (classical); flat band (modernist); exaggerated cantilever (deconstructivist);
  planted (organic/green).

MATERIAL VOCABULARY — specify by NAME, never just "wall material":
- cladding: brick (Roman/Norman/modular bond, Flemish/English/running pattern), CMU,
  board-formed concrete, fibre-cement panel, standing-seam zinc, charred shou-sugi-ban,
  terracotta rainscreen, glass curtain wall, corten steel, lime render, knapped flint, EIFS.
- roofing: clay tile, slate, standing-seam metal, EPDM membrane, green roof, copper.
- glazing: clear/low-e, fritted, etched, leaded, stained, smart-tint.
- masonry mortar: Type N (general), Type S (load-bearing), Type M (foundations), lime (historic).

PROPORTION & SCALE — defaults unless prompt overrides:
- golden ratio (1:1.618) for primary divisions; root-2 (1:1.414) for secondary.
- footprint sanity: SFH 80-300m², ADU 25-80m², commercial floorplate 200-2000m², pavilion < 100m².
  Refuse implausible scale combinations (200m × 200m cabin, 5m × 5m skyscraper) — ask first.
- floor-to-floor heights: residential 2700-3000mm, commercial 3600-4200mm, retail GF 4500-6000mm.

ORNAMENT (style-permitting):
- classical: dentil band, egg-and-dart, modillion, acanthus capital, keystone with voussoirs.
- art-nouveau: whiplash curve, biomorphic mullion, stylised flora.
- art-deco: zigzag/sunburst/chevron motifs, stepped massing, low-relief frieze.
- gothic-revival: pointed arch, trefoil, quatrefoil, traceried window.
- deconstructivist: tilted plane, folded plate, ruled surface between skew curves.
- organic/parametric: voronoi facade, phyllotaxis cladding, catenary vault.
`;

export const MAKER_GEOMETRY_VOCABULARY = `
GEOMETRY VOCABULARY FOR MECHANICAL PARTS — go beyond cube/cylinder/sphere.

PROFILE-FIRST GEOMETRY (use these before reaching for raw primitives):
- rotate_extrude($fn=120) polygon([...]) — revolved profile. Use for any axially symmetric part:
  knobs, wheels, bottles, lamps, vases, pulley grooves, spindles, finials.
- linear_extrude(height=H) polygon([...]) — extruded 2D profile. Use for L-brackets, gussets,
  flanges, plates with non-rectangular outlines, custom heatsinks, cooling fins.
- hull() between two or more meaningfully-different cross-sections — produces smooth lofts.
  Use for ergonomic grips, organic transitions, aerodynamic shapes, ear loops, bezels.
- minkowski() { object; sphere(r=fillet, $fn=48); } — rounds every edge in one pass. Use for
  any product-design fillet larger than ~1mm. Cheaper than enumerating fillets.
- offset(r=N) on 2D shapes — grows or shrinks polygons by N. Use to derive wall outlines
  from cavity outlines, kerf-compensate laser geometry, derive fillets in 2D.

GEOMETRY ANTI-PATTERN — DO NOT:
- Glue more than ~5 raw cube()/cylinder()/sphere() calls together in one module. If you find
  yourself doing this, STOP and replace with a profile + rotate_extrude OR linear_extrude OR hull.
- Treat fillets as optional. A mechanical part with no fillets/chamfers reads as a CAD-tutorial
  example, not a designed object. Default to 1-2mm fillets on external edges, 0.5mm chamfers
  on hole entries, 0.4mm on inside corners.
- Use anonymous cylinders to represent motors/bearings/etc — call the named engineering
  module from the registry (NEMA17, 608ZZ, m3_bolt, etc.) which has correct mounting features.

FASTENER VOCABULARY — specify type AND grade AND drive:
- machine screws: M2/M2.5/M3/M4/M5/M6, button-head / socket-cap / countersunk / pan / flat,
  Phillips / hex / torx / square. Default: M3 socket-cap (DIN 912) in 8.8 grade.
- wood screws: #4 / #6 / #8 / #10 with length in inches; trim head / round head / oval.
- inserts: heat-set (Voss-style), press-fit, threaded.
- captive nuts: M3-M8 hex pocket cuts; thickness = nut height + 0.2mm clearance.

SURFACE FINISH VOCABULARY:
- FDM: vapor-smoothed (ABS only), filled + sanded, raw layer-lined, painted with primer.
- Resin: support-marked + sanded, polished, dyed.
- Wood: oiled / waxed / lacquered / shou-sugi-ban / stained / left raw.
- Metal: brushed / polished / anodised (color spec) / powder-coated (RAL spec) / patinated.
- Plastics: vapor-glossed / sanded / textured / silk-matte.

TOLERANCE VOCABULARY:
- FDM clearance fit (shaft in hole): hole = shaft_d + 0.3mm.
- FDM press fit: hole = shaft_d - 0.2mm.
- Resin clearance fit: shaft_d + 0.15mm.
- Resin press fit: shaft_d - 0.1mm.
- Bearing seat: shaft_d ± 0.02mm (avoid printing — use insert if possible).
`;

export const LABEL_VOCABULARY = `
LABEL DESIGN VOCABULARY — thermal printers have hard constraints distinct from laser stencils:

PRINTABILITY CONSTRAINTS:
- thermal head minimum stroke ≥ 0.2mm regardless of DPI. Anything thinner ghosts or drops out.
- contrast: pure black on white only. No greyscale (thermal cannot tone).
- safe area: 3mm inner margin all sides on adhesive labels.
- bleed: zero — thermal printers don't bleed.
- die-cut corner radius: respect printer's minimum (commonly 1.5mm or 3mm).

LAYOUT VOCABULARY:
- 5-zone grid: header / body / data / barcode-area / footer. Pick which zones populate.
- typography: ONE display face + ONE text face. Minimum cap height 1.6mm. Tracking: text ≥ -0.5%,
  display caps +5% to +10% for legibility at small sizes.
- hierarchy: largest element is brand/identifier; second-largest is primary data;
  body type is supporting. NEVER use equal sizes.
- barcode/QR: module size ≥ 0.5mm; quiet zone ≥ 2mm all sides; ECC level ≥ M for QR.

TYPOGRAPHIC VOCABULARY (call out the actual face family):
- display: Helvetica Now Display / Inter Display / DM Serif Display / Playfair Display / Recoleta.
- text: Inter / IBM Plex / Source Sans / Roboto / Georgia.
- mono: JetBrains Mono / IBM Plex Mono / Geist Mono (for SKUs, batch codes, lot numbers).
- avoid: any font under 1.6mm cap height; light/thin weights below 12pt; condensed at small size.
`;

export const LASER_VOCABULARY = `
LASER DESIGN VOCABULARY — fabrication-aware, not just visual.

KERF + COMPENSATION:
- offset cut paths by kerf/2 for tight-fitting parts (typical kerf: 0.1mm @ 5W diode, 0.15mm @ 40W CO2).
- inside-cuts shrink by kerf, outside-cuts grow by kerf for press-fit slots.

STROKE / PASS POLICY:
- engrave: raster fill OR vector trace, never both for the same element.
- cut: single closed path per outline; outermost first if multi-pass.
- score: half-power vector pass to mark fold lines or alignment guides.

MATERIAL-SPECIFIC RULES:
- plywood: grain direction matters — engrave perpendicular to grain for crisper edges.
- acrylic: minimum bridge width 2mm; minimum hole 1.5mm to prevent melt-bridging.
- leather: pre-mask with paper tape for first pass to prevent smoke staining.
- cardboard: focus 1mm above material; reduces charring.
- mat board: never cut faster than 15mm/s on a 5W diode — incomplete cuts otherwise.

ASSEMBLY VOCABULARY for laser-cut joinery:
- finger joints (box joints): finger width = 2-3× material thickness.
- mortise & tenon: tenon = material thickness; mortise = thickness + kerf.
- captive nut slots: hex pocket sized for nut + 0.15mm clearance.
- living hinges: parallel slits spaced 1-2× material thickness for thin (3mm) plywood.
- press-fit clips: outside-cut tab 0.05mm wider than slot for friction hold.
`;

export const MODE_VOCABULARY: Record<string, string> = {
  architecture: ARCHITECTURE_VOCABULARY,
  maker: MAKER_GEOMETRY_VOCABULARY,
  label: LABEL_VOCABULARY,
  laser: LASER_VOCABULARY,
};

// ────────────────────────────────────────────────────────────────────────────
// Per-style hard rules. The style is what the user picked in the UI; this
// dictates DEFAULT (overridable) constraints that get added to the prompt.

export interface StyleHardRules {
  /** Forbidden vocabulary unless explicitly requested by the user. */
  defaultForbidden: string[];
  /** Required vocabulary unless explicitly relaxed by the user. */
  defaultRequired: string[];
  /** One-line directive prepended to style block. */
  signature: string;
}

export const STYLE_HARD_RULES: Record<DesignStyle, StyleHardRules> = {
  minimalist: {
    signature: 'Reductive geometry, restraint over ornament. A SINGLE flowing curve through an object is the signature move (Eames LCW, Saarinen Tulip) — not a ban on curvature.',
    defaultForbidden: ['decorative ornament', 'unnecessary detail', 'busy patterns', 'gradient surfaces', 'aged finishes'],
    defaultRequired: ['precise proportion', 'uniform wall thickness', 'consistent fillet radii'],
  },
  deconstructivist: {
    signature: 'Tilted planes, folded plates, ruled surfaces between skew curves, voronoi fracture. Avoid orthogonal stacks.',
    defaultForbidden: ['orthogonal grid layout', 'symmetrical facade', 'flat untilted slab'],
    defaultRequired: ['at least one tilted plane or folded surface', 'at least one ruled or doubly-curved element'],
  },
  classical: {
    signature: 'Tripartite division (base / body / cornice), symmetric composition, ordered fenestration, named order (Doric / Ionic / Corinthian / Tuscan), entablature where appropriate.',
    defaultForbidden: ['asymmetric facade', 'undivided wall surfaces over 6m', 'missing cornice on primary elevations', 'flat parapet without moulding profile'],
    defaultRequired: ['cornice or entablature on main elevations', 'symmetric primary axis', 'ordered fenestration pattern'],
  },
  organic: {
    signature: 'Biomimetic curves, parametric repetition (phyllotaxis / voronoi / catenary), C2-continuous surfaces. No straight runs longer than ~2m without curvature.',
    defaultForbidden: ['orthogonal corners over 5° from chamfered', 'untreated straight edges over 2m', 'flat planar wall surfaces over 4m²'],
    defaultRequired: ['at least one C2-continuous primary surface', 'parametric repetition where appropriate', 'minimum 1mm fillet on all external edges'],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Convenience: assemble the full constraint block for a given generation.

export interface PromptConstraintContext {
  prompt: string;
  mode?: 'architecture' | 'maker' | 'label' | 'laser';
  style?: DesignStyle;
}

export function buildConstraintBlock(ctx: PromptConstraintContext): string {
  const extracted = extractNegativeConstraints(ctx.prompt);

  // Merge style defaults into the constraint set unless the user explicitly
  // relaxed them (handled implicitly — if the user lists a style-forbidden
  // term as REQUIRED, the required overrides the forbidden).
  const styleRules = ctx.style ? STYLE_HARD_RULES[ctx.style] : undefined;
  const requiredSet = new Set([...extracted.required]);
  const forbiddenSet = new Set([...extracted.forbidden]);
  if (styleRules) {
    for (const r of styleRules.defaultRequired) if (!forbiddenSet.has(r)) requiredSet.add(r);
    for (const f of styleRules.defaultForbidden) if (!requiredSet.has(f)) forbiddenSet.add(f);
  }

  const merged: NegativeConstraintSet = {
    forbidden: [...forbiddenSet],
    required: [...requiredSet],
    source: ctx.prompt,
  };

  const sections: string[] = [];
  sections.push(negativeConstraintBlock(merged));
  if (styleRules) sections.push(`STYLE SIGNATURE (${ctx.style}): ${styleRules.signature}`);
  if (ctx.mode && MODE_VOCABULARY[ctx.mode]) sections.push(MODE_VOCABULARY[ctx.mode]);
  return sections.join('\n\n');
}
