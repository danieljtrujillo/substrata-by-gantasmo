// Compliance validator — second pass that scans generated output against
// the user's negative + required constraints, emits findings, and (via the
// wrapper helper) drives a single regen attempt with the violations cited.
//
// Two severities:
//   - violation: hard miss. Literal forbidden term appears in output, or a
//     known semantic rule fails (no flat roof requested but no roof_assembly
//     call OR a flat roof produced).
//   - warning:   soft miss. Required term is absent (model may have honoured
//     intent in a different phrasing), or a heuristic indicates risk.
//
// The validator is intentionally cheap (regex + small ruleset). The regen
// step is the expensive one — it makes a second Gemini call. Cap retries
// at 1 in the caller.

import type { NegativeConstraintSet } from './designConstraints';

export type Severity = 'violation' | 'warning';

export interface ComplianceFinding {
  severity: Severity;
  /** Short machine-readable code. */
  code: string;
  /** Human-readable explanation. */
  message: string;
  /** The user term that triggered this finding (if applicable). */
  term?: string;
}

export interface ValidationTarget {
  /** OpenSCAD code emitted by the generator. */
  openscadCode?: string;
  /** SVG design drawings (maker/laser). */
  svgDesign?: string;
  /** firmware/control code */
  firmwareCode?: string;
  /** parts list/BOM */
  parts?: Array<{ name: string; fabrication?: string }>;
  /** Free-text design notes. */
  designNotes?: string;
  /** Material schedule rows (architecture). */
  materialSchedule?: Array<{ item?: string; spec?: string; qty?: string; unit?: string }>;
  /** Wiring / electronics description (maker). */
  wiringDiagram?: string;
  /** Catch-all extra text fields the validator can scan. */
  extra?: string[];
}

/** All scannable text concatenated. */
function flatText(t: ValidationTarget): string {
  const parts: string[] = [];
  if (t.openscadCode) parts.push(t.openscadCode);
  if (t.svgDesign) parts.push(t.svgDesign);
  if (t.firmwareCode) parts.push(t.firmwareCode);
  if (t.designNotes) parts.push(t.designNotes);
  if (t.wiringDiagram) parts.push(t.wiringDiagram);
  if (t.materialSchedule) {
    for (const row of t.materialSchedule) {
      parts.push([row.item, row.spec, row.qty, row.unit].filter(Boolean).join(' '));
    }
  }
  if (t.extra) parts.push(...t.extra);
  return parts.join('\n').toLowerCase();
}

/** Strip OpenSCAD comments + REF-tagged primitives before literal scan. */
function strippedCode(code: string): string {
  // remove // single-line comments and /* */ blocks
  let out = code.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
  return out.toLowerCase();
}

// ──────────────────────────────────────────────────────────────────────────
// Semantic rules. Each rule looks at the user's prompt + extracted constraint
// set and decides whether a particular hard policy applies; if it does, it
// inspects the generated artifact and emits findings.

interface SemanticRule {
  /** Does the user's prompt activate this rule? */
  applies(set: NegativeConstraintSet): boolean;
  /** Inspect the artifact and yield findings. */
  check(target: ValidationTarget): ComplianceFinding[];
}

const FLAT_ROOF_RULE: SemanticRule = {
  applies: set => set.forbidden.some(t => /\bflat\s+roof\b/.test(t) || t === 'flat roof'),
  check: target => {
    const code = target.openscadCode ?? '';
    const stripped = strippedCode(code);
    const callsRoof = /\broof_assembly\s*\(/.test(stripped);
    const flatRoofCall = /roof_assembly\s*\([^)]*type\s*=\s*"flat"/.test(stripped);
    const out: ComplianceFinding[] = [];
    if (flatRoofCall) {
      out.push({ severity: 'violation', code: 'flat_roof_emitted', term: 'flat roof',
        message: 'Output calls roof_assembly(type="flat") despite the user banning flat roofs.' });
    }
    if (!callsRoof && code.length > 0) {
      out.push({ severity: 'warning', code: 'no_roof_assembly_call',
        message: 'User banned flat roofs but the output does not call roof_assembly() — pitch and typology are unverified.' });
    }
    return out;
  },
};

const RIGHT_ANGLES_RULE: SemanticRule = {
  applies: set => set.forbidden.some(t => /\bright\s+angles?\b/.test(t) || t === 'right angles' || t === 'right angle'),
  check: target => {
    const code = target.openscadCode ?? '';
    const stripped = strippedCode(code);
    // Count raw cube() calls outside difference blocks. Crude — counts any cube call.
    const cubeMatches = stripped.match(/\bcube\s*\(/g) ?? [];
    // Filter out cubes inside REF-tagged lines (already comment-stripped above)
    const out: ComplianceFinding[] = [];
    if (cubeMatches.length >= 3) {
      out.push({ severity: 'violation', code: 'right_angles_via_cubes', term: 'right angles',
        message: `Output contains ${cubeMatches.length} raw cube() calls but the user banned right angles. Replace with rotate_extrude / linear_extrude(polygon) / hull() of curved profiles, or minkowski with a sphere to round corners.` });
    } else if (cubeMatches.length > 0) {
      out.push({ severity: 'warning', code: 'right_angles_residual',
        message: `Output has ${cubeMatches.length} raw cube() call(s) — verify each is a hidden internal feature or cutout, not a visible right-angled face.` });
    }
    return out;
  },
};

const FLAT_FACADE_RULE: SemanticRule = {
  applies: set => set.required.some(t => /\bcurved\s+facade\b/.test(t)),
  check: target => {
    const code = target.openscadCode ?? '';
    const stripped = strippedCode(code);
    const hasCurve = /rotate_extrude|\bcircle\s*\(|bezier|hull\s*\(|polygon\s*\(\s*\[/.test(stripped);
    if (!hasCurve) {
      return [{ severity: 'violation', code: 'no_curved_geometry', term: 'curved facade',
        message: 'User required a curved facade but the output contains no rotate_extrude, hull, polygon, or circle calls.' }];
    }
    return [];
  },
};

/** Rule to validate that SVG designs are well-formed and complete. */
const SVG_VALIDATION_RULE: SemanticRule = {
  applies: () => true, // Always run QA checks on SVGs if they are generated
  check: target => {
    const svgDesign = target.svgDesign ?? '';
    if (!svgDesign || svgDesign.trim().length === 0) return [];
    
    const out: ComplianceFinding[] = [];
    const parts = svgDesign.split(/<!--\s*PART_BREAK\s*-->/gi).map(p => p.trim()).filter(Boolean);
    
    // 1. Check if we have parts split but none is non-empty
    if (parts.length === 0) {
      out.push({
        severity: 'violation',
        code: 'empty_svg_design',
        message: 'SVG design field was generated but contains no SVG drawings or content.'
      });
      return out;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partIndexLabel = parts.length > 1 ? ` (Part ${i + 1})` : '';
      
      // 2. Validate Tag closure / encapsulation
      const hasSvgStart = /<svg\b/i.test(part);
      const hasSvgEnd = /<\/svg>/i.test(part);
      
      if (!hasSvgStart && !hasSvgEnd) {
        out.push({
          severity: 'violation',
          code: `svg_tag_missing_${i}`,
          message: `Generated SVG drawing${partIndexLabel} is missing both opening <svg> and closing </svg> tags.`
        });
        continue;
      }
      if (!hasSvgStart) {
        out.push({
          severity: 'violation',
          code: `svg_start_tag_missing_${i}`,
          message: `Generated SVG drawing${partIndexLabel} is missing opening <svg> tag.`
        });
      }
      if (!hasSvgEnd) {
        out.push({
          severity: 'violation',
          code: `svg_end_tag_missing_${i}`,
          message: `Generated SVG drawing${partIndexLabel} is missing closing </svg> tag.`
        });
      }

      // 3. Check for viewBox attribute
      const hasViewBox = /\bviewBox\s*=/i.test(part);
      if (hasSvgStart && !hasViewBox) {
        out.push({
          severity: 'warning',
          code: `svg_viewbox_missing_${i}`,
          message: `SVG drawing${partIndexLabel} is missing a "viewBox" attribute, which is required for responsive scaling and correct previewing.`
        });
      }
      
      // 4. Check for nested/invalid characters or standard structures
      const hasTitle = /<title>/i.test(part);
      if (hasSvgStart && !hasTitle) {
        out.push({
          severity: 'warning',
          code: `svg_title_missing_${i}`,
          message: `SVG drawing${partIndexLabel} is missing a <title> tag, making it harder to associate with BOM parts.`
        });
      }
    }

    return out;
  }
};

/** Rule to ensure harmony between the parts schedule (BOM) and the 2D/3D source files. */
const BOM_FABRICATION_MATCH_RULE: SemanticRule = {
  applies: () => true, // Checked if there is parts list and code
  check: target => {
    const parts = target.parts ?? [];
    if (parts.length === 0) return [];
    
    const out: ComplianceFinding[] = [];
    const openscadCode = target.openscadCode ?? '';
    const svgDesign = target.svgDesign ?? '';
    
    // Extract module names from OpenSCAD
    const moduleNames: string[] = [];
    const moduleRegex = /\bmodule\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = moduleRegex.exec(openscadCode)) !== null) {
      moduleNames.push(match[1].toLowerCase());
    }
    
    // Extract titles from SVGs
    const svgTitles: string[] = [];
    const svgParts = svgDesign.split(/<!--\s*PART_BREAK\s*-->/gi).map(p => p.trim()).filter(Boolean);
    for (const part of svgParts) {
      const titleMatch = part.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        svgTitles.push(titleMatch[1].trim().toLowerCase());
      }
    }
    
    for (const part of parts) {
      const name = part.name.trim();
      const nameLower = name.toLowerCase();
      
      if (part.fabrication === '3d_print' && openscadCode.length > 100) {
        // Look for a module in OpenSCAD that resembles this part name
        const cleanName = nameLower.replace(/[^a-z0-9]/g, '');
        const hasMatchingModule = moduleNames.some(modName => {
          const cleanMod = modName.replace(/[^a-z0-9]/g, '');
          return modName.includes(nameLower) || nameLower.includes(modName) || cleanName.includes(cleanMod) || cleanMod.includes(cleanName);
        });
        
        if (!hasMatchingModule) {
          out.push({
            severity: 'warning',
            code: 'mismatched_3d_print_module',
            term: name,
            message: `BOM lists "${name}" as 3D Printed, but no corresponding "module" definition was found in the generated OpenSCAD code. Ensure OpenSCAD has a module representing this part.`
          });
        }
      } else if (part.fabrication === 'laser_cut' && svgDesign.length > 50) {
        // Look for a title in SVG parts that resembles this part name
        const cleanName = nameLower.replace(/[^a-z0-9]/g, '');
        const hasMatchingSvg = svgTitles.some(title => {
          const cleanTitle = title.replace(/[^a-z0-9]/g, '');
          return title.includes(nameLower) || nameLower.includes(title) || cleanName.includes(cleanTitle) || cleanTitle.includes(cleanName);
        });
        
        if (!hasMatchingSvg) {
          out.push({
            severity: 'warning',
            code: 'mismatched_laser_cut_svg',
            term: name,
            message: `BOM lists "${name}" as Laser Cut, but no SVG sheet with matching <title> was found in the generated SVG designs.`
          });
        }
      }
    }
    
    return out;
  }
};

const SEMANTIC_RULES: SemanticRule[] = [
  FLAT_ROOF_RULE,
  RIGHT_ANGLES_RULE,
  FLAT_FACADE_RULE,
  SVG_VALIDATION_RULE,
  BOM_FABRICATION_MATCH_RULE
];

// ──────────────────────────────────────────────────────────────────────────
// Literal scan: each forbidden term is searched as a phrase. Each required
// term must appear at least once somewhere in the scanned text.

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function literalScan(set: NegativeConstraintSet, target: ValidationTarget): ComplianceFinding[] {
  const haystack = flatText(target);
  const findings: ComplianceFinding[] = [];

  for (const term of set.forbidden) {
    if (term.length < 3) continue;          // too short, false-positive risk too high
    if (/^a\s|^the\s|^any\s/.test(term)) continue;   // skip article-stub captures
    const re = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    if (re.test(haystack)) {
      findings.push({ severity: 'violation', code: 'forbidden_term_present', term,
        message: `Forbidden term "${term}" appears in the generated output. The user banned it explicitly.` });
    }
  }

  for (const term of set.required) {
    if (term.length < 3) continue;
    if (/^a\s|^the\s|^any\s/.test(term)) continue;
    const re = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    if (!re.test(haystack)) {
      findings.push({ severity: 'warning', code: 'required_term_absent', term,
        message: `Required term "${term}" is not present in the generated output. The user explicitly asked for it.` });
    }
  }

  return findings;
}

export function validateCompliance(
  set: NegativeConstraintSet,
  target: ValidationTarget,
): ComplianceFinding[] {
  const findings = literalScan(set, target);
  for (const rule of SEMANTIC_RULES) {
    if (rule.applies(set)) findings.push(...rule.check(target));
  }
  // Dedupe by (code, term)
  const seen = new Set<string>();
  const out: ComplianceFinding[] = [];
  for (const f of findings) {
    const key = `${f.code}:${f.term ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function violationsOf(findings: ComplianceFinding[]): ComplianceFinding[] {
  return findings.filter(f => f.severity === 'violation');
}

/** Build a corrective prompt fragment to inject on a regen attempt. */
export function buildRegenCorrectionBlock(findings: ComplianceFinding[]): string {
  if (findings.length === 0) return '';
  const lines: string[] = [
    'COMPLIANCE FAILURE — YOUR PREVIOUS OUTPUT VIOLATED USER CONSTRAINTS OR QUALITY STANDARDS.',
    'You must regenerate, this time honouring every finding below. The same violations in a second pass mean failed output.',
    '',
  ];
  for (const f of findings) {
    const prefix = f.severity === 'violation' ? 'VIOLATION' : 'WARNING';
    lines.push(`- ${prefix} [${f.code}]: ${f.message}`);
  }
  lines.push('', 'Specifically:');
  for (const f of findings) {
    if (f.code === 'flat_roof_emitted') {
      lines.push('- Replace roof_assembly(type="flat") with type="gabled"|"hipped"|"mansard"|"shed"|"butterfly"|"curved"|"domed".');
    } else if (f.code === 'no_roof_assembly_call') {
      lines.push('- Add a roof_assembly(type=..., span=..., depth=..., pitch_deg=...) call so the roof typology is explicit and verifiable.');
    } else if (f.code === 'right_angles_via_cubes') {
      lines.push('- Remove every visible cube() and replace with rotate_extrude / linear_extrude(polygon) / hull() / minkowski(sphere) so no right-angled corner reads from any viewing angle.');
    } else if (f.code === 'no_curved_geometry') {
      lines.push('- Add a curved facade element using rotate_extrude or linear_extrude with a polygon profile containing Bezier-sampled points.');
    } else if (f.code === 'forbidden_term_present') {
      lines.push(`- Remove every mention of "${f.term}" from OpenSCAD code, design notes, material schedule, wiring diagram, and assembly steps.`);
    } else if (f.code === 'required_term_absent') {
      lines.push(`- Explicitly include "${f.term}" in the design (geometry, material schedule, or design notes as appropriate).`);
    } else if (f.code.startsWith('svg_tag_missing')) {
      lines.push('- Ensure all separate SVG strings are strictly well-formed with both opening <svg> and closing </svg> tags.');
    } else if (f.code.startsWith('svg_start_tag_missing')) {
      lines.push('- Ensure the SVG code starts with a valid opening <svg> block.');
    } else if (f.code.startsWith('svg_end_tag_missing')) {
      lines.push('- Ensure the SVG code ends with a valid closing </svg> tag.');
    } else if (f.code.startsWith('svg_viewbox_missing')) {
      lines.push('- Ensure the root <svg> elements have a valid viewBox="..." attribute.');
    } else if (f.code.startsWith('svg_title_missing')) {
      lines.push('- Add a <title>[part_name]</title> element directly inside the root <svg> block.');
    } else if (f.code === 'mismatched_3d_print_module') {
      const term = f.term ?? 'unspecified_part';
      lines.push(`- The BOM specified custom 3d-printed part "${term}". Make sure your openscadCode features a 'module ${term.toLowerCase().replace(/[^a-z0-9_]/g, '_')}()' that defines this component.`);
    } else if (f.code === 'mismatched_laser_cut_svg') {
      const term = f.term ?? 'unspecified_part';
      lines.push(`- The BOM specified laser-cut part "${term}". Make sure one of your <svg> drawings has '<title>${term}</title>' in the svgDesign block.`);
    }
  }
  return lines.join('\n');
}

/** Summarise findings for the user-facing designNotes block. */
export function summariseFindings(findings: ComplianceFinding[]): string {
  if (findings.length === 0) return 'COMPLIANCE CHECK: all detected user constraints honoured.';
  const viols = findings.filter(f => f.severity === 'violation');
  const warns = findings.filter(f => f.severity === 'warning');
  const lines: string[] = ['COMPLIANCE CHECK:'];
  if (viols.length) {
    lines.push(`  ${viols.length} VIOLATION(S) remain after compliance pass:`);
    for (const v of viols) lines.push(`    - ${v.message}`);
  }
  if (warns.length) {
    lines.push(`  ${warns.length} WARNING(S) detected:`);
    for (const w of warns) lines.push(`    - ${w.message}`);
  }
  return lines.join('\n');
}
