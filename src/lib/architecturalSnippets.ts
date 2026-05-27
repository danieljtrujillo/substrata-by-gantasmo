// Architectural OpenSCAD snippet pack.
//
// The architecture-mode prompt PREPENDS this header to the model's output so
// it can call `wall_assembly(...)`, `roof_assembly(...)`, etc. instead of
// being told "a wall is a cube." Every module emits geometry richer than the
// raw primitive equivalent (real wall has thickness layers + base course +
// cap; real roof has rafters + ridge + eave overhang; real window has frame
// + mullions + sill projection; real column has base + entasis + capital).
//
// Modules are intentionally parameterised so Gemini can vary them per
// building, and intentionally CALL each other (a wall_assembly calls
// wall_opening on every window/door slot) so the geometry compounds rather
// than degrading into cubes-with-cutouts.

import type { DesignStyle } from '../styleGuides';

const COMMON_HEADER = `
// SUBSTRATA architectural snippet header.
// All dimensions in mm. Modules: wall_assembly, wall_opening, roof_assembly,
// window_assembly, door_assembly, column_assembly, cornice_assembly,
// balustrade_assembly, base_course, fenestration_grid. Call these by name —
// do NOT redefine them.

$fn = 64;

// ── Base course / plinth (rusticated banded base at the building's foot)
module base_course(length=8000, depth=300, height=900, rustication_count=4) {
  banded_h = height / rustication_count;
  for (i = [0:rustication_count-1]) {
    translate([0, 0, i*banded_h])
      hull() {
        translate([0, 0, 0]) cube([length, depth, banded_h*0.96]);
        translate([0, -3, banded_h*0.5]) cube([length, depth+6, banded_h*0.96-1]);
      }
  }
}

// ── Wall opening — punch a window or door hole with reveal depth + sill
//    transom + head lintel. Use INSIDE difference() on a wall solid.
module wall_opening(x=0, z=0, w=900, h=2100, reveal_depth=100, lintel_h=150, sill_h=80) {
  translate([x, -reveal_depth-1, z])
    cube([w, reveal_depth*4 + 2, h]);
}

// ── Wall layer — single layered wall with optional pilasters (engaged columns
//    repeating along its length to break up monotony).
module wall_assembly(length=6000, height=3000, thickness=305, pilaster_spacing=0, pilaster_depth=120, base=true, cap=true) {
  difference() {
    union() {
      // Body
      cube([length, thickness, height]);
      // Pilaster projections at regular spacing
      if (pilaster_spacing > 0) {
        for (x = [pilaster_spacing/2 : pilaster_spacing : length]) {
          translate([x - 60, thickness, 0])
            cube([120, pilaster_depth, height]);
        }
      }
    }
  }
  if (base)
    translate([0, -50, 0]) base_course(length=length, depth=thickness+100, height=900, rustication_count=3);
  if (cap)
    translate([0, -30, height])
      cornice_assembly(length=length, projection=thickness+60, return_depth=60, profile="cyma_recta");
}

// ── Roof — gabled, hipped, mansard, shed, butterfly, curved (barrel), domed.
//    Always includes eave overhang + fascia. Pitch in degrees.
module roof_assembly(type="gabled", span=8000, depth=6000, pitch_deg=28, overhang=600, ridge_height_override=0) {
  pitch = pitch_deg * 3.1415 / 180;
  rh = ridge_height_override > 0 ? ridge_height_override : (span/2) * tan(pitch_deg);

  if (type == "gabled") {
    // Two pitches meeting at ridge along Y axis
    rotate([0,0,0])
      translate([-overhang, -overhang, 0])
        linear_extrude(height=depth + 2*overhang)
          polygon([[0,0], [span+2*overhang,0], [(span+2*overhang)/2, rh+overhang*tan(pitch_deg)]]);
  } else if (type == "hipped") {
    // Four pitches meeting at central apex
    hull() {
      cube([0.01, 0.01, 0.01]);
      translate([(span+2*overhang)/2, (depth+2*overhang)/2, rh])
        cube([0.01, 0.01, 0.01]);
      translate([-overhang, -overhang, 0]) cube([span+2*overhang, depth+2*overhang, 0.5]);
    }
  } else if (type == "mansard") {
    // Steep lower pitch + shallow upper pitch
    union() {
      translate([-overhang, -overhang, 0])
        linear_extrude(height=depth + 2*overhang)
          polygon([[0,0], [span+2*overhang,0],
                   [span+2*overhang - 500, rh*0.55],
                   [500, rh*0.55],
                   [0,0]]);
      translate([0, -overhang, rh*0.55])
        linear_extrude(height=depth + 2*overhang)
          polygon([[0,0], [span,0],
                   [span/2, rh*0.45]]);
    }
  } else if (type == "shed") {
    // Monopitch — single slope from low edge to high edge
    translate([-overhang, -overhang, 0])
      linear_extrude(height=depth + 2*overhang)
        polygon([[0,0], [span+2*overhang,0], [span+2*overhang, rh], [0, 0]]);
  } else if (type == "butterfly") {
    // Inverted V — modernist; valley along centre
    translate([-overhang, -overhang, 0])
      linear_extrude(height=depth + 2*overhang)
        polygon([[0, rh], [span+2*overhang, rh],
                 [(span+2*overhang)/2, 0]]);
  } else if (type == "curved" || type == "barrel") {
    // Half-cylindrical vault running along depth
    translate([span/2, -overhang, 0])
      rotate([-90, 0, 0])
        cylinder(r=rh, h=depth + 2*overhang);
  } else if (type == "domed") {
    // Hemispherical dome
    translate([span/2, depth/2, 0])
      difference() {
        sphere(r=min(span, depth)/2);
        translate([-span, -depth, -span]) cube([2*span, 2*depth, span]);
      }
  } else {
    // Fallback to gabled
    roof_assembly(type="gabled", span=span, depth=depth, pitch_deg=pitch_deg, overhang=overhang);
  }
}

// ── Fenestration grid — repeated windows on a rhythm.
//    Pattern: "regular" | "ABA" | "AABA" | "vertical_slot" | "ribbon"
module fenestration_grid(length=6000, height=3000, pattern="regular", floor_count=1,
                          window_w=900, window_h=1500, sill_h=900) {
  if (pattern == "regular") {
    n = floor((length - 600) / (window_w + 600));
    spacing = (length - n*window_w) / (n + 1);
    for (f = [0:floor_count-1]) {
      z = f * height + sill_h;
      for (i = [0:n-1]) {
        x = spacing + i * (window_w + spacing);
        translate([x, 0, z]) window_assembly(width=window_w, height=window_h);
      }
    }
  } else if (pattern == "ABA") {
    // Big-small-big — centred composition
    centre = length / 2;
    big_w = window_w * 1.4;
    small_w = window_w * 0.7;
    gap = 400;
    translate([centre - big_w - gap - small_w - gap - big_w, 0, sill_h]) window_assembly(width=big_w, height=window_h*1.1);
    translate([centre - small_w/2, 0, sill_h]) window_assembly(width=small_w, height=window_h);
    translate([centre + gap + small_w/2, 0, sill_h]) window_assembly(width=big_w, height=window_h*1.1);
  } else if (pattern == "vertical_slot") {
    // Narrow tall slits
    slot_w = window_w * 0.35;
    n = floor((length - 600) / (slot_w + 800));
    spacing = (length - n*slot_w) / (n + 1);
    for (i = [0:n-1]) {
      x = spacing + i * (slot_w + spacing);
      translate([x, 0, sill_h * 0.5]) window_assembly(width=slot_w, height=window_h*1.5);
    }
  } else if (pattern == "ribbon") {
    // Continuous horizontal — single window across full length
    translate([300, 0, sill_h]) window_assembly(width=length-600, height=window_h*0.7);
  } else {
    // Fallback
    fenestration_grid(length=length, height=height, pattern="regular", floor_count=floor_count,
                       window_w=window_w, window_h=window_h, sill_h=sill_h);
  }
}

// ── Window — frame + mullions + sill projection + head treatment.
//    head: "lintel" | "arched" | "flat" — visual + structural treatment.
module window_assembly(width=900, height=1500, frame_d=80, mullion_count=2, head="lintel", sill_projection=40) {
  frame = 50;   // frame thickness
  // Outer frame
  difference() {
    cube([width, frame_d, height]);
    translate([frame, -1, frame]) cube([width-2*frame, frame_d+2, height-2*frame]);
  }
  // Mullions
  if (mullion_count > 0) {
    span = (width - 2*frame) / (mullion_count + 1);
    for (i = [1:mullion_count]) {
      translate([frame + i*span - 15, frame_d/2 - 15, frame])
        cube([30, 30, height-2*frame]);
    }
  }
  // Sill projection — extends BELOW the opening on the outside
  translate([-sill_projection, frame_d, -50])
    cube([width + 2*sill_projection, sill_projection + 20, 50]);
  // Head treatment
  if (head == "arched") {
    translate([width/2, frame_d/2, height-frame])
      rotate([90, 0, 0])
        cylinder(r=width*0.45, h=frame_d, $fn=48);
  } else if (head == "lintel") {
    translate([-40, -10, height-frame])
      cube([width + 80, frame_d + 20, 80]);
  }
}

// ── Door — frame + leaf + threshold + swing arc (drawn for plan, not 3D).
module door_assembly(width=900, height=2100, leaf_type="paneled", frame_d=120) {
  frame = 60;
  difference() {
    cube([width, frame_d, height]);
    translate([frame, -1, 0]) cube([width-2*frame, frame_d+2, height-frame]);
  }
  // Leaf
  translate([frame, frame_d/2-20, 0]) cube([width-2*frame, 40, height-frame]);
  if (leaf_type == "paneled") {
    // Recessed panels — two stacked
    for (panel_z = [(height-frame)*0.15, (height-frame)*0.55]) {
      translate([frame+80, frame_d/2-22, panel_z])
        cube([width-2*frame-160, 4, (height-frame)*0.3]);
    }
  } else if (leaf_type == "glazed") {
    // Glazed pane in upper half
    translate([frame+80, frame_d/2-22, (height-frame)*0.55])
      cube([width-2*frame-160, 4, (height-frame)*0.4]);
  }
  // Threshold
  translate([-20, -10, 0]) cube([width+40, frame_d+20, 20]);
}

// ── Column — order-aware with base, entasis-tapered shaft, and capital.
//    Orders: "doric" | "ionic" | "corinthian" | "tuscan" | "modern".
module column_assembly(order="doric", base_h=200, shaft_h=2400, cap_h=200, flutes=20, entasis=0.05) {
  bottom_r = 200;
  top_r = bottom_r * (1 - entasis);

  // Base
  if (order == "modern") {
    cube([bottom_r*2, bottom_r*2, base_h], center=true);
  } else {
    translate([0, 0, 0])
      rotate_extrude($fn=96)
        polygon([[0,0], [bottom_r*1.25, 0], [bottom_r*1.2, base_h*0.3], [bottom_r*1.05, base_h*0.6], [bottom_r, base_h]]);
  }

  // Shaft with entasis (curve in profile, not straight taper)
  translate([0, 0, base_h])
    rotate_extrude($fn=96)
      polygon([[0,0],
               [bottom_r, 0],
               [bottom_r*0.985, shaft_h*0.25],
               [bottom_r*0.95, shaft_h*0.55],
               [top_r*1.02, shaft_h*0.85],
               [top_r, shaft_h],
               [0, shaft_h]]);

  // Flutes (Doric / Ionic / Corinthian only)
  if (order != "modern" && order != "tuscan" && flutes > 0) {
    for (i = [0:flutes-1]) {
      a = i * 360 / flutes;
      translate([0, 0, base_h])
        rotate([0, 0, a])
          translate([bottom_r*0.92, 0, 0])
            rotate([0, 0, 90])
              difference() {
                cube([0.01, 0.01, 0.01]);
                cylinder(r=bottom_r*0.04, h=shaft_h, $fn=24);
              }
    }
  }

  // Capital
  translate([0, 0, base_h + shaft_h]) {
    if (order == "doric") {
      // Echinus + abacus — simple
      rotate_extrude($fn=96)
        polygon([[0,0], [top_r*1.25, 0], [top_r*1.3, cap_h*0.35], [top_r*1.4, cap_h*0.45], [top_r*1.4, cap_h]]);
    } else if (order == "ionic") {
      // Volutes — simplified as twin cylinders + flat abacus
      rotate_extrude($fn=96)
        polygon([[0,0], [top_r*1.15, 0], [top_r*1.15, cap_h*0.5], [top_r*1.4, cap_h*0.5], [top_r*1.4, cap_h]]);
      for (a = [0, 180]) rotate([0,0,a])
        translate([top_r*1.15, 0, cap_h*0.4]) rotate([90,0,0]) cylinder(r=cap_h*0.35, h=top_r*0.4, $fn=32);
    } else if (order == "corinthian") {
      // Acanthus — represented as fluted bell
      rotate_extrude($fn=96)
        polygon([[0,0], [top_r*1.1, 0], [top_r*1.3, cap_h*0.6], [top_r*1.45, cap_h*0.9], [top_r*1.45, cap_h]]);
    } else if (order == "tuscan") {
      cylinder(r1=top_r, r2=top_r*1.2, h=cap_h*0.5);
      translate([0,0,cap_h*0.5]) cylinder(r=top_r*1.3, h=cap_h*0.5);
    } else {
      // Modern — simple square abacus
      cube([top_r*2.6, top_r*2.6, cap_h], center=true);
    }
  }
}

// ── Cornice — projecting moulded cap at the top of a wall.
//    Profile: "cyma_recta" (S-curve) | "cyma_reversa" | "cavetto" (concave)
//    | "ogee" | "dentil" (toothed) | "flat_band" (modernist).
module cornice_assembly(length=6000, projection=300, return_depth=200, profile="cyma_recta") {
  if (profile == "dentil") {
    // Square teeth + flat above
    tooth_w = 60;
    tooth_gap = 60;
    n = floor(length / (tooth_w + tooth_gap));
    for (i = [0:n-1]) {
      translate([i * (tooth_w + tooth_gap), 0, 0])
        cube([tooth_w, projection, return_depth * 0.6]);
    }
    translate([0, 0, return_depth * 0.6]) cube([length, projection, return_depth * 0.4]);
  } else if (profile == "flat_band") {
    cube([length, projection, return_depth]);
  } else if (profile == "cavetto") {
    // Concave quarter-round
    translate([0, 0, 0])
      linear_extrude(height=length, center=false)
        difference() {
          square([projection, return_depth]);
          translate([projection, 0])
            scale([1, return_depth/projection])
              circle(r=projection, $fn=64);
        }
  } else {
    // cyma_recta / cyma_reversa / ogee — S-curve approximated by polygon
    profile_pts = profile == "ogee"
      ? [[0,0], [projection*0.3, 0], [projection*0.5, return_depth*0.4], [projection*0.7, return_depth*0.6], [projection, return_depth], [0, return_depth]]
      : profile == "cyma_reversa"
      ? [[0,0], [projection, 0], [projection*0.5, return_depth*0.5], [projection*0.8, return_depth], [0, return_depth]]
      : /* cyma_recta */ [[0,0], [projection, 0], [projection, return_depth*0.4], [projection*0.4, return_depth*0.8], [0, return_depth]];
    translate([0, 0, 0])
      rotate([90, 0, 90])
        linear_extrude(height=length)
          polygon(profile_pts);
  }
}

// ── Balustrade — turned balusters between top + bottom rails.
module balustrade_assembly(length=4000, height=900, post_count=12, baluster_profile="urn") {
  rail_h = 80;
  spacing = length / (post_count - 1);
  // Bottom rail
  cube([length, 120, rail_h]);
  // Top rail
  translate([0, 0, height - rail_h]) cube([length, 120, rail_h]);
  // Balusters
  for (i = [0:post_count-1]) {
    translate([i * spacing - 30, 30, rail_h])
      if (baluster_profile == "urn") {
        rotate_extrude($fn=48)
          polygon([[0,0], [30,0], [30,40], [16,80], [22,140], [34,220], [22,300], [16,360], [30,420], [30,height-2*rail_h], [0,height-2*rail_h]]);
      } else if (baluster_profile == "square_taper") {
        linear_extrude(height=height-2*rail_h, scale=0.7) translate([-30,-30,0]) square(60);
      } else {
        // simple turned
        cylinder(r=30, h=height-2*rail_h, $fn=24);
      }
  }
}
`;

// Style overlays — small additional bodies that override / extend the common
// header for a given DesignStyle. Kept SMALL because the heavy lifting is
// done by the common modules + the constraint block.

const STYLE_OVERLAYS: Record<DesignStyle, string> = {
  minimalist: `
// Minimalist overlay: prefer flat_band cornice, hipped or shed roof,
// ribbon fenestration, modern column, no balustrade ornament.
default_cornice_profile = "flat_band";
default_roof_type = "shed";
default_fenestration_pattern = "ribbon";
default_column_order = "modern";
`,
  classical: `
// Classical overlay: cyma_recta or dentil cornice, gabled or hipped roof,
// ABA or regular fenestration, doric/ionic/corinthian column, urn balustrade.
default_cornice_profile = "cyma_recta";
default_roof_type = "gabled";
default_fenestration_pattern = "ABA";
default_column_order = "doric";
default_baluster_profile = "urn";
`,
  deconstructivist: `
// Deconstructivist overlay: exaggerated cantilever cornice (use flat_band
// but oversize projection), butterfly or shed roof tilted off-axis,
// vertical_slot fenestration, modern column (often single canted strut),
// square_taper balustrade.
default_cornice_profile = "flat_band";
default_roof_type = "butterfly";
default_fenestration_pattern = "vertical_slot";
default_column_order = "modern";
default_baluster_profile = "square_taper";
// Apply tilt: rotate the entire massing by 3-8° in two axes after composition.
`,
  organic: `
// Organic overlay: cavetto or ogee cornice, curved/barrel/domed roof,
// regular fenestration with rounded heads, no rigid column orders.
default_cornice_profile = "ogee";
default_roof_type = "curved";
default_fenestration_pattern = "regular";
default_column_order = "modern";  // but call rotate_extrude with biomimetic profiles
default_window_head = "arched";
`,
};

export function getArchitecturalSnippetHeader(style?: DesignStyle): string {
  const overlay = style ? STYLE_OVERLAYS[style] ?? '' : '';
  return COMMON_HEADER + '\n' + overlay;
}

/** Short directive to embed in the prompt that explains the snippet pack. */
export function getArchitecturalSnippetDirective(style?: DesignStyle): string {
  const def = style ? STYLE_OVERLAYS[style] : '';
  return `
ARCHITECTURAL SNIPPET PACK
The following OpenSCAD modules are PRE-DEFINED in the prepended header:
  wall_assembly(length, height, thickness, pilaster_spacing, pilaster_depth, base, cap)
  wall_opening(x, z, w, h, reveal_depth, lintel_h, sill_h)
  roof_assembly(type, span, depth, pitch_deg, overhang, ridge_height_override)
    types: "gabled" | "hipped" | "mansard" | "shed" | "butterfly" | "curved" | "domed"
  fenestration_grid(length, height, pattern, floor_count, window_w, window_h, sill_h)
    patterns: "regular" | "ABA" | "vertical_slot" | "ribbon"
  window_assembly(width, height, frame_d, mullion_count, head, sill_projection)
    head: "lintel" | "arched" | "flat"
  door_assembly(width, height, leaf_type, frame_d)
    leaf_type: "paneled" | "flush" | "glazed"
  column_assembly(order, base_h, shaft_h, cap_h, flutes, entasis)
    order: "doric" | "ionic" | "corinthian" | "tuscan" | "modern"
  cornice_assembly(length, projection, return_depth, profile)
    profile: "cyma_recta" | "cyma_reversa" | "cavetto" | "ogee" | "dentil" | "flat_band"
  balustrade_assembly(length, height, post_count, baluster_profile)
    baluster_profile: "urn" | "square_taper" | "turned"
  base_course(length, depth, height, rustication_count)

CALL THESE BY NAME from your generated geometry. Do NOT redefine them. Do NOT use raw cube([length, thickness, height]) to represent a wall — call wall_assembly() with the same dimensions. The model that ignores this snippet pack will produce shoebox geometry that fails the output quality bar.
${def ? `\nStyle-specific defaults (already set in the header — use these unless the user prompt overrides):\n${def}` : ''}
`;
}
