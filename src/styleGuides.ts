// ═══════════════════════════════════════════════════════════════
// SUBSTRATA Style Guide System
// Comprehensive visual DNA for each design style
// Injected into AI prompts to produce unmistakable, differentiated output
// ═══════════════════════════════════════════════════════════════

export type DesignStyle = 'minimalist' | 'deconstructivist' | 'classical' | 'organic';

export interface StyleGuide {
  name: DesignStyle;
  label: string;
  description: string;
  lineRules: string;
  composition: string;
  shapes: string;
  fills: string;
  detail: string;
  patterns: string;
  cad3dLanguage: string;
  referenceMovements: string;
  sketchTechnique: string;
  colorPalette: string;
  annotationStyle: string;
}

export const STYLE_GUIDES: Record<DesignStyle, StyleGuide> = {
  minimalist: {
    name: 'minimalist',
    label: 'Minimalist',
    description: 'Stripped to essence. Every line earns its place.',
    lineRules: 'Uniform stroke weight (1-2px). No decorative strokes. Straight lines and perfect arcs dominate. Corners are either sharp 90° or clean 45° chamfers — never rounded fillets. Line endings are clean and decisive.',
    composition: 'Generous negative space — at least 60% of the canvas is empty. Grid-aligned placement. Rule-of-thirds or centered compositions. Strong visual hierarchy through scale contrast, not ornament.',
    shapes: 'Geometric primitives only: circles, rectangles, equilateral triangles, regular polygons. No freeform curves or organic blobs. Shapes are whole, unbroken, complete.',
    fills: 'Solid black or solid white only. No gradients, no textures, no halftones. If grayscale shading is needed, use evenly-spaced parallel lines at a single angle (45°).',
    detail: 'Absolute minimum features that convey the subject. Remove every element that doesn\'t serve function. If you can understand the design without a line, cut it.',
    patterns: 'None. If texture is unavoidable: evenly-spaced parallel lines, uniform grid dots, or simple repetition of a single geometric element.',
    cad3dLanguage: 'Chamfered edges (never filleted). Flat surfaces. Minimal detail — no ribs, no bosses unless structural. Uniform wall thickness. Clean rectangular cutouts. Visible bolt patterns as design features.',
    referenceMovements: 'Dieter Rams / Braun, Muji, Swiss International Style, Bauhaus, Apple industrial design (Ive era). Think: if it looks designed, it has too much.',
    sketchTechnique: 'Technical pen, uniform 0.5mm lines. Hidden construction grid. No shading — form shown through line overlap and occlusion only. Sparse annotations in Helvetica/DIN. Engineering drawing aesthetic.',
    colorPalette: 'Pure black on white. One accent color max (muted blue or red) used sparingly for callouts only.',
    annotationStyle: 'Clean leader lines with arrows. Sans-serif labels (Helvetica/DIN). Centered text blocks. Minimal — only critical dimensions.'
  },
  deconstructivist: {
    name: 'deconstructivist',
    label: 'Deconstructivist',
    description: 'Tension, collision, controlled chaos. Structure made visible through its fragmentation.',
    lineRules: 'Variable stroke weight (1-6px) within the same drawing. Broken and interrupted strokes. Acute angles dominate (<30°). Lines overshoot intersections. Multiple overlapping layers of line work at conflicting angles.',
    composition: 'Deliberately off-grid. No bilateral symmetry. Overlapping and interpenetrating planes. Elements bleed off the frame edge. The composition should feel like it\'s in motion or about to collapse.',
    shapes: 'Shattered and fragmented geometry. Acute triangles, rhomboids, non-parallel trapezoids. Shapes are sliced, intersected, and offset from each other. Nothing aligns. Voids are as important as solids.',
    fills: 'Dense cross-hatching at conflicting angles (30° vs 75°). Black zones vs white zones with hard boundaries. Splatter and noise textures. Some areas intentionally overworked, others raw/empty.',
    detail: 'Maximum visual complexity. Every surface has sub-detail: hatching, fracture lines, layered depth. The viewer should discover new details on each viewing.',
    patterns: 'Voronoi fragmentation (shattered glass). Fracture/crack propagation lines. Geological strata layering. Wire-frame overlays on solid forms. Exploded axonometric overlaps.',
    cad3dLanguage: 'Tilted planes that defy gravity. Non-orthogonal intersections (walls meet at 73° not 90°). Dramatic cantilevers. Visible structural tension — support members angled against thrust lines. Faceted surfaces instead of smooth curves.',
    referenceMovements: 'Zaha Hadid, Frank Gehry, Daniel Libeskind, Coop Himmelblau, Lebbeus Woods, Morphosis. Think: a building that looks like it was designed during an earthquake.',
    sketchTechnique: 'Mixed media — charcoal base with ink overlays. Aggressive varied line weight. Visible construction lines left in as part of the composition. Cross-hatch shading with deliberate inconsistency. Smudges and erasure marks are features.',
    colorPalette: 'Black + red for structural/danger emphasis. White scratched into black fields. Occasional raw graphite gray.',
    annotationStyle: 'Handwritten, angular, URGENT. Labels at odd angles. Arrows that overshoot. Multiple annotation layers overlapping — mimicking a frantic design session.'
  },
  classical: {
    name: 'classical',
    label: 'Classical',
    description: 'Order, proportion, ornamentation. Beauty through mathematical harmony.',
    lineRules: 'Graduated stroke weight: thin outlines (0.5px) for secondary elements, medium (1.5px) for primary contours, thick (3px) for structural profiles. Smooth, confident curves — every arc is a true geometric arc or Bezier with minimal control points.',
    composition: 'Bilateral symmetry enforced — mirror all elements about a vertical center axis. Golden ratio proportions (1:1.618) for major divisions. Centered layouts with clear visual hierarchy: pediment → entablature → column → base.',
    shapes: 'Arches (semicircular and pointed), columns (tapered with entasis), scrollwork (volutes, S-curves), acanthus leaf forms, egg-and-dart sequences, dentil blocks, rosettes. Every shape references architectural orders (Doric, Ionic, Corinthian).',
    fills: 'Stipple shading (dot density = tonal value). Parallel-line hatching at 45° for shadows, cross-hatch for deep recesses. White highlights carved out of hatched areas. Gradual tonal transitions — no hard black/white boundaries.',
    detail: 'Ornamental borders on every panel edge. Repeating motifs at regular intervals. Filigree and scrollwork at joints and transitions. Corner rosettes. Framing lines around text blocks.',
    patterns: 'Greek key (meander), guilloche (interlocking circles), egg-and-dart, bead-and-reel, acanthus scroll, palmette, fleur-de-lis, heraldic shields, laurel wreaths.',
    cad3dLanguage: 'Fluted columns, ogee and cyma curves on profiles, dentil molding along edges. Turned/lathed profiles for any cylindrical element. Symmetrical about center axis. Pedestal bases with stepped profiles. Cornice caps on vertical elements.',
    referenceMovements: 'Vitruvius, Palladio, Art Deco geometric ornamentation, Beaux-Arts, Greek Revival, Renaissance proportion systems. Think: if Palladio designed a robot.',
    sketchTechnique: 'Graduated pencil shading (H to 6B range). Stipple rendering for curved surfaces. Clean parallel hatching at 45° for flat planes. Visible golden ratio construction overlays. Compass-and-straightedge construction lines.',
    colorPalette: 'Sepia/warm brown base tones. Gold/ochre accents for highlights and ornamental details. Cream/ivory paper tone.',
    annotationStyle: 'Serif typeface labels (Garamond/Baskerville). Centered text. Generous letter-spacing. Annotations framed in ornamental cartouches. Dimension lines with serif tick marks.'
  },
  organic: {
    name: 'organic',
    label: 'Organic',
    description: 'Growth, flow, emergence. Form follows the logic of living systems.',
    lineRules: 'Variable-pressure strokes (thin→thick→thin along a single curve). No perfectly straight segments — every line has subtle curvature. Lines taper at endpoints like brush strokes. Contour lines follow surface topology.',
    composition: 'Asymmetric balance — visual weight distributed along spirals or branching paths. Golden spiral or Fibonacci-based layouts. Growth patterns radiating from a focal point. No rigid grid; organic clustering.',
    shapes: 'Cell structures (Voronoi tessellation), branching networks (L-systems, river deltas), blob/metaball forms, shell spirals, bone/skeletal frameworks, seed pods, coral structures, mycelium networks.',
    fills: 'Flowing contour lines (topographic map style) where line density = surface curvature. Stippling with density gradients that follow form. No flat fills — every surface has topology expressed through mark-making.',
    detail: 'Fractal self-similarity: the large-scale pattern contains smaller versions of itself at 2-3 scales. Surface texture derived from growth processes (Turing reaction-diffusion, DLA aggregation). Edges are never clean — they grow, branch, or dissolve.',
    patterns: 'Voronoi tessellation, Delaunay triangulation, reaction-diffusion (Turing patterns), L-system branching trees, phyllotaxis spiral arrangement (sunflower seed pattern), coral growth, bone trabeculae, leaf venation.',
    cad3dLanguage: 'Smooth fillets on every edge (no sharp corners). Shell/surface-based forms rather than solid blocks. Variable wall thickness following stress lines. Topology-optimized voids. Organic lattice infill visible as design feature.',
    referenceMovements: 'Antoni Gaudi, Neri Oxman (MIT Media Lab), Nervous System generative design, Zaha Hadid organic period, Art Nouveau (Hector Guimard), biomimicry, parametric architecture. Think: if a coral reef designed a machine.',
    sketchTechnique: 'Flowing brush pen with dramatic pressure variation. Visible spiral/growth construction lines. Contour-line shading that follows surface curvature. Stipple gradients. Ink wash for atmospheric depth.',
    colorPalette: 'Earth tones: forest green, deep teal, warm brown, sand. Ink wash grays with warm undertones. Occasional bioluminescent accent (cyan/amber).',
    annotationStyle: 'Flowing callout curves (not straight leader lines). Hand-lettered or humanist sans-serif labels. Labels placed along curves, not in rigid blocks. Organic bracket shapes for grouping.'
  }
};

// ── Prompt Builders ───────────────────────────────────────────

/** Full style directive block for image generation prompts */
export function getStyleDirective(style: DesignStyle): string {
  const g = STYLE_GUIDES[style];
  return `MANDATORY VISUAL STYLE: ${g.label.toUpperCase()}
${g.description}

LINE RULES: ${g.lineRules}
COMPOSITION: ${g.composition}
SHAPES: ${g.shapes}
FILLS & SHADING: ${g.fills}
DETAIL LEVEL: ${g.detail}
PATTERNS & MOTIFS: ${g.patterns}
REFERENCE MOVEMENTS: ${g.referenceMovements}

Your output MUST visually conform to every rule above. A viewer should immediately identify the style without being told. The style should be unmistakable and extreme — push the style to its logical conclusion.`;
}

/** 3D/CAD-specific style directive for blueprint generation */
export function get3DStyleDirective(style: DesignStyle): string {
  const g = STYLE_GUIDES[style];
  return `MANDATORY 3D DESIGN STYLE: ${g.label.toUpperCase()}
${g.description}

3D FORM LANGUAGE: ${g.cad3dLanguage}
SURFACE PATTERNS: ${g.patterns}
DETAIL PHILOSOPHY: ${g.detail}
REFERENCE MOVEMENTS: ${g.referenceMovements}

Apply this style to every generated part, enclosure, and structural element. The visual identity should be unmistakable.`;
}

/** Sketch-specific style directive for concept drawing generation */
export function getSketchStyleDirective(style: DesignStyle): string {
  const g = STYLE_GUIDES[style];
  return `SKETCH RENDERING STYLE: ${g.label.toUpperCase()}
${g.description}

SKETCH TECHNIQUE: ${g.sketchTechnique}
LINE RULES: ${g.lineRules}
FILLS & SHADING: ${g.fills}
COLOR PALETTE: ${g.colorPalette}
ANNOTATION STYLE: ${g.annotationStyle}
COMPOSITION: ${g.composition}
REFERENCE MOVEMENTS: ${g.referenceMovements}

Render the sketch strictly adhering to these rules. The drawing style itself should be unmistakable.`;
}
