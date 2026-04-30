// Per-style OpenSCAD snippet library.
// Each style ships a set of named, parametric helper modules. The header is
// prepended to every generated .scad file so the model has *real* style-bearing
// primitives to compose with — instead of having to reinvent them inline and
// drift toward generic boxes.

import type { DesignStyle } from '../styleGuides';

export interface StyleSnippetPack {
  style: DesignStyle;
  header: string;
  modules: string[];
  preferredFn: number;
}

const MINIMALIST: StyleSnippetPack = {
  style: 'minimalist',
  preferredFn: 64,
  modules: ['minimalist_chamfer_cube', 'minimalist_slot', 'minimalist_panel', 'minimalist_bolt_pattern'],
  header: `// ── style: minimalist ─────────────────────────────────────────
// Vocabulary: chamfered prisms, sharp slots, flush panels, exposed M3/M4 bolt grids.
// Forbidden: fillets, ribs, decorative bosses, ornament.
$fn = 64;

module minimalist_chamfer_cube(size = [40, 40, 20], chamfer = 1.5) {
  hull() {
    translate([chamfer, chamfer, 0])           cube([size[0]-2*chamfer, size[1]-2*chamfer, size[2]]);
    translate([0, 0, chamfer])                 cube([size[0], size[1], size[2]-2*chamfer]);
  }
}

module minimalist_slot(length = 30, width = 6, depth = 4) {
  hull() {
    translate([width/2, 0, 0]) cylinder(d=width, h=depth);
    translate([length-width/2, 0, 0]) cylinder(d=width, h=depth);
  }
}

module minimalist_panel(w = 100, h = 60, t = 3, edge_chamfer = 0.6) {
  minimalist_chamfer_cube([w, h, t], edge_chamfer);
}

// Visible bolt pattern: design feature, not just fastening.
module minimalist_bolt_pattern(w, h, inset = 6, d = 3.4) {
  for (x = [inset, w-inset], y = [inset, h-inset])
    translate([x, y, -0.1]) cylinder(d=d, h=100);
}
`,
};

const ORGANIC: StyleSnippetPack = {
  style: 'organic',
  preferredFn: 96,
  modules: ['organic_fillet_cube', 'organic_metaball_pair', 'voronoi_cell_proxy', 'phyllotaxis_layout', 'gaudi_curve_extrude'],
  header: `// ── style: organic ────────────────────────────────────────────
// Vocabulary: filleted shells, metaball blends, phyllotaxis arrays, Voronoi-like
// cell proxies, variable-thickness shells. Forbidden: sharp corners, flat faces.
$fn = 96;

module organic_fillet_cube(size = [40, 40, 20], r = 6) {
  hull() {
    for (x = [r, size[0]-r], y = [r, size[1]-r], z = [r, size[2]-r])
      translate([x, y, z]) sphere(r=r);
  }
}

// Metaball-style blend between two spheres (no true marching cubes — hull approx).
module organic_metaball_pair(r1 = 12, r2 = 10, sep = 18) {
  hull() {
    sphere(r=r1);
    translate([sep, 0, 0]) sphere(r=r2);
  }
}

// Voronoi cell proxy — irregular faceted shell. Real Voronoi requires a
// generator script; this gives the same visual cue parametrically.
module voronoi_cell_proxy(r = 15, seed = 1) {
  intersection() {
    sphere(r=r);
    for (i = [0:7]) {
      a = (i * 137.5 + seed * 41) ;
      rotate([a, a*0.7, a*1.3]) translate([r*0.6, 0, 0]) cube(r*1.4, center=true);
    }
  }
}

// Phyllotaxis layout — sunflower-seed packing.
module phyllotaxis_layout(n = 24, scale = 4) {
  golden = 137.5077640500378;
  for (i = [0:n-1]) {
    a = i * golden;
    r = scale * sqrt(i);
    translate([r*cos(a), r*sin(a), 0]) children();
  }
}

// Gaudi-style ruled-surface column: linear extrude of a rotated polygon.
module gaudi_curve_extrude(h = 80, r = 12, twist = 90, sides = 6) {
  linear_extrude(height=h, twist=twist, slices=40, convexity=6)
    rotate([0, 0, 30]) circle(r=r, $fn=sides);
}
`,
};

const CLASSICAL: StyleSnippetPack = {
  style: 'classical',
  preferredFn: 80,
  modules: ['classical_column_doric', 'classical_dentil_band', 'classical_pedestal', 'classical_cornice', 'classical_rosette'],
  header: `// ── style: classical ──────────────────────────────────────────
// Vocabulary: fluted columns with entasis, dentil bands, ogee/cyma profiles,
// stepped pedestals, cornice caps, rosettes. Mirror about a vertical axis.
$fn = 80;

// Doric column with subtle entasis (1/6 swell at mid-height) and shallow flutes.
module classical_column_doric(h = 200, r_base = 14, r_top = 12, flutes = 20, flute_depth = 0.8) {
  difference() {
    union() {
      // Tapered shaft with entasis bulge
      hull() {
        translate([0, 0, 0])     cylinder(r=r_base, h=0.1);
        translate([0, 0, h*0.4]) cylinder(r=r_base*1.04, h=0.1);
        translate([0, 0, h-0.1]) cylinder(r=r_top, h=0.1);
      }
    }
    // Flutes
    for (i = [0:flutes-1]) {
      rotate([0, 0, i*360/flutes])
        translate([r_base*0.95, 0, -1]) cylinder(r=flute_depth, h=h+2);
    }
  }
  // Capital
  translate([0, 0, h]) cylinder(r1=r_top, r2=r_top*1.35, h=4);
  translate([0, 0, h+4]) cylinder(r=r_top*1.35, h=2);
}

// Dentil band — repeated rectangular blocks under a cornice.
module classical_dentil_band(length = 200, dentil_w = 6, dentil_h = 6, gap = 3, depth = 4) {
  pitch = dentil_w + gap;
  count = floor(length / pitch);
  for (i = [0:count-1])
    translate([i*pitch, 0, 0]) cube([dentil_w, depth, dentil_h]);
}

// Stepped pedestal base.
module classical_pedestal(w = 60, h = 30, steps = 3, step_offset = 4) {
  for (i = [0:steps-1]) {
    s = w - i*step_offset*2;
    translate([i*step_offset, i*step_offset, i*h/steps])
      cube([s, s, h/steps]);
  }
}

// Ogee cornice profile (S-curve), revolved or extruded.
module classical_cornice(length = 200, depth = 12, h = 16) {
  linear_extrude(height=length) polygon(points=[
    [0, 0], [depth, 0], [depth, h*0.3],
    [depth*0.7, h*0.5], [depth*0.4, h*0.7],
    [depth*0.6, h*0.85], [depth*0.2, h], [0, h]
  ]);
}

// Rosette — radial floral motif.
module classical_rosette(r = 12, petals = 8) {
  cylinder(r=r*0.3, h=2);
  for (i = [0:petals-1])
    rotate([0, 0, i*360/petals])
      translate([r*0.55, 0, 0]) scale([1, 0.4, 0.3]) sphere(r=r*0.45);
}
`,
};

const DECONSTRUCTIVIST: StyleSnippetPack = {
  style: 'deconstructivist',
  preferredFn: 32,
  modules: ['decon_tilted_slab', 'decon_fracture_cut', 'decon_cantilever_strut', 'decon_shard_cluster'],
  header: `// ── style: deconstructivist ───────────────────────────────────
// Vocabulary: tilted slabs, fracture lines, dramatic cantilevers, shard
// clusters, non-orthogonal joinery (73° not 90°). Asymmetry mandatory.
$fn = 32;

// Tilted slab — never flat to the global axes.
module decon_tilted_slab(size = [80, 40, 4], tilt_x = 17, tilt_y = -11) {
  rotate([tilt_x, tilt_y, 0]) cube(size, center=true);
}

// Fracture-line cut: subtract a thin angled prism to simulate a crack.
module decon_fracture_cut(width = 60, depth = 3, angle = 23, z_offset = 0) {
  translate([0, 0, z_offset])
    rotate([0, 0, angle])
      cube([width, depth, 200], center=true);
}

// Cantilever strut: angled support that defies gravity.
module decon_cantilever_strut(length = 80, thickness = 6, angle = 73) {
  rotate([0, angle, 0])
    translate([0, -thickness/2, 0])
      cube([length, thickness, thickness]);
}

// Cluster of intersecting shards.
module decon_shard_cluster(n = 5, scale = 30, seed = 7) {
  for (i = [0:n-1]) {
    a1 = (i * 47 + seed * 13) ;
    a2 = (i * 73 + seed * 29) ;
    rotate([a1, a2, a1*0.5])
      translate([scale*0.3, 0, 0])
        scale([1, 0.2, 0.6]) cube(scale, center=true);
  }
}
`,
};

const PACKS: Record<DesignStyle, StyleSnippetPack> = {
  minimalist: MINIMALIST,
  organic: ORGANIC,
  classical: CLASSICAL,
  deconstructivist: DECONSTRUCTIVIST,
};

export function getStyleSnippetPack(style: DesignStyle): StyleSnippetPack {
  return PACKS[style];
}

/** Header to prepend to every generated .scad file for the given style. */
export function getStyleSnippetHeader(style: DesignStyle): string {
  return PACKS[style].header;
}

/** Short text directive listing the snippet vocabulary, for prompt injection. */
export function getStyleSnippetDirective(style: DesignStyle): string {
  const pack = PACKS[style];
  return `STYLE PRIMITIVES (use these helper modules — they are pre-defined in the file header):
${pack.modules.map(m => `  - ${m}()`).join('\n')}

Compose your design from these primitives wherever possible. They encode the
"${style}" visual language. You may still use cube()/cylinder()/sphere() for
generic geometry, but every signature element should call one of the helpers
above so the style is unmistakable.`;
}

/**
 * Wrap a generated body so the snippet header is at the top of the file.
 * If the body already contains the header marker, it's returned unchanged.
 */
export function withStyleHeader(style: DesignStyle, body: string): string {
  const header = getStyleSnippetHeader(style);
  const marker = `// ── style: ${style}`;
  if (body.includes(marker)) return body;
  return `${header}\n${body}`;
}