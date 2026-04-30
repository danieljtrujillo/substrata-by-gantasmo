// Smart Blocks — open-source equivalent of AutoCAD's Smart Blocks (Search/Convert + Detect/Convert)
//
// Features:
//   detectRepeatedGeometry   — cluster primitives by normalised shape signature (Search & Convert)
//   convertBlocksInOpenSCAD  — refactor inline geometry into reusable modules (Convert)
//   scoreOpenSCADCandidates  — rank which inline shapes most deserve to become modules
//   auditOpenSCADBlocks      — full report: existing modules, repeated inline geometry, conversion candidates

export interface ParsedPrimitiveMin {
  type: 'cube' | 'cylinder' | 'sphere' | string;
  args: number[];
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
}

export interface BlockCandidate {
  /** Human-readable name suggestion */
  suggestedName: string;
  /** Shape signature string used for matching */
  signature: string;
  /** Indices into the primitives array that are instances of this block */
  instanceIndices: number[];
  /** Number of instances found */
  count: number;
  /** Representative geometry */
  geometry: { type: string; args: number[] };
}

export interface SmartBlocksReport {
  totalPrimitives: number;
  candidateBlocks: BlockCandidate[];
  existingModules: string[];
  potentialSavings: number; // lines of OpenSCAD removed by converting candidates
  suggestions: string[];
}

// ── Geometry signature ────────────────────────────────────────────────────────
// Two primitives are considered the "same block" if they have the same type and
// the same normalised arg ratios (aspect ratio), regardless of absolute size.
// For an exact-match (same absolute size) search, use exactSignature.

function normaliseArgs(args: number[]): number[] {
  const max = Math.max(...args.filter(Number.isFinite));
  if (max === 0 || !Number.isFinite(max)) return args.map(() => 0);
  return args.map(a => Math.round((a / max) * 1000) / 1000);
}

function shapeSignature(prim: ParsedPrimitiveMin, exact = false): string {
  const argStr = exact
    ? prim.args.map(a => a.toFixed(3)).join(',')
    : normaliseArgs(prim.args).join(',');
  return `${prim.type}:${argStr}`;
}

// ── detectRepeatedGeometry ────────────────────────────────────────────────────
// Find groups of primitives that share the same normalised shape.
// minInstances: minimum occurrences before it's worth making a block (default 2).

export function detectRepeatedGeometry(
  primitives: ParsedPrimitiveMin[],
  options: { minInstances?: number; exactMatch?: boolean } = {}
): BlockCandidate[] {
  const { minInstances = 2, exactMatch = false } = options;

  const sigMap = new Map<string, { indices: number[]; prim: ParsedPrimitiveMin }>();

  for (let i = 0; i < primitives.length; i++) {
    const p = primitives[i];
    const sig = shapeSignature(p, exactMatch);
    if (!sigMap.has(sig)) sigMap.set(sig, { indices: [], prim: p });
    sigMap.get(sig)!.indices.push(i);
  }

  const candidates: BlockCandidate[] = [];
  for (const [sig, { indices, prim }] of sigMap.entries()) {
    if (indices.length < minInstances) continue;

    // Suggest a block name: strip trailing digits from label, Title Case
    const base = prim.label
      .replace(/[_\-\s]+\d+$/, '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim() || `${prim.type.charAt(0).toUpperCase()}${prim.type.slice(1)}Block`;

    candidates.push({
      suggestedName: base,
      signature: sig,
      instanceIndices: indices,
      count: indices.length,
      geometry: { type: prim.type, args: [...prim.args] },
    });
  }

  return candidates.sort((a, b) => b.count - a.count);
}

// ── convertBlocksInOpenSCAD ───────────────────────────────────────────────────
// Refactor OpenSCAD source: extract inline repeated shapes into named modules
// and replace inline calls with translate() + module_name() calls.
// This is a textual heuristic transform — it handles the common case where
// repeated inline cube/cylinder/sphere calls can be pulled into a module.

export function convertBlocksInOpenSCAD(
  code: string,
  candidates: BlockCandidate[],
  primitives: ParsedPrimitiveMin[]
): { code: string; modulesAdded: string[]; replacements: number } {
  let output = code;
  const modulesAdded: string[] = [];
  let replacements = 0;

  for (const candidate of candidates) {
    if (candidate.count < 2) continue;

    const canonical = primitives[candidate.instanceIndices[0]];
    const modName = candidate.suggestedName.replace(/\s+/g, '_');

    // Build the module definition
    let moduleBody = '';
    const args = canonical.args;
    if (canonical.type === 'cube') {
      moduleBody = `  cube([${args[0].toFixed(2)}, ${args[1].toFixed(2)}, ${args[2].toFixed(2)}], center=true);`;
    } else if (canonical.type === 'cylinder') {
      const [r1, r2, h, fn] = args;
      moduleBody = `  cylinder(r1=${(r1 ?? r2).toFixed(2)}, r2=${(r2 ?? r1).toFixed(2)}, h=${h.toFixed(2)}, $fn=${Math.round(fn ?? 24)});`;
    } else if (canonical.type === 'sphere') {
      moduleBody = `  sphere(r=${args[0].toFixed(2)}, $fn=${Math.round(args[1] ?? 32)});`;
    } else {
      continue; // unsupported type — skip
    }

    const moduleDef = `module ${modName}() {\n${moduleBody}\n}\n`;

    // Build translate() calls for every instance
    const usagelines = candidate.instanceIndices
      .map(idx => {
        const p = primitives[idx];
        const [x, y, z] = p.position;
        const [rx, ry, rz] = p.rotation;
        const rotStr = (rx || ry || rz)
          ? `rotate([${(rx * 180 / Math.PI).toFixed(1)}, ${(ry * 180 / Math.PI).toFixed(1)}, ${(rz * 180 / Math.PI).toFixed(1)}]) `
          : '';
        return `  translate([${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}]) ${rotStr}${modName}();  // ${p.label}`;
      })
      .join('\n');

    const blockUsageComment = `\n// ── ${modName} ×${candidate.count} instances ─────────────\n${usagelines}\n`;

    // Prepend module definition and append usage block
    output = moduleDef + output + blockUsageComment;
    modulesAdded.push(modName);
    replacements += candidate.count;
  }

  return { code: output, modulesAdded, replacements };
}

// ── scoreOpenSCADCandidates ───────────────────────────────────────────────────
// Rank candidates by the value gained from extracting them into blocks:
//   score = instanceCount * estimatedLinesPerInstance

export function scoreOpenSCADCandidates(candidates: BlockCandidate[]): BlockCandidate[] {
  return [...candidates].sort((a, b) => {
    const linesA = a.geometry.type === 'cube' ? 1 : a.geometry.type === 'cylinder' ? 1 : 1;
    const linesB = b.geometry.type === 'cube' ? 1 : b.geometry.type === 'cylinder' ? 1 : 1;
    return (b.count * linesB) - (a.count * linesA);
  });
}

// ── auditOpenSCADBlocks ───────────────────────────────────────────────────────
// Parse module names already in the source (existing reuse) and combine with
// repeated-geometry detection to produce an overall refactoring report.

export function auditOpenSCADBlocks(
  code: string,
  primitives: ParsedPrimitiveMin[]
): SmartBlocksReport {
  // Existing modules already defined in the code
  const existingModules = [...code.matchAll(/module\s+(\w+)\s*\(/g)].map(m => m[1]);

  // Repeated geometry candidates
  const candidates = detectRepeatedGeometry(primitives, { minInstances: 2 });

  // Estimate potential line savings
  const potentialSavings = candidates.reduce((sum, c) => sum + (c.count - 1) * 2, 0);

  const suggestions: string[] = [];

  if (candidates.length === 0) {
    suggestions.push('No repeated geometry detected — the model is already well-structured.');
  } else {
    suggestions.push(`${candidates.length} repeated geometry pattern(s) found. Converting to modules could remove ~${potentialSavings} redundant lines.`);
    for (const c of candidates.slice(0, 5)) {
      suggestions.push(`  • "${c.suggestedName}" appears ${c.count}× — candidate for a reusable module`);
    }
  }

  if (existingModules.length === 0) {
    suggestions.push('No modules defined. All geometry is inline — consider decomposing into named modules for clarity and reuse.');
  } else {
    suggestions.push(`${existingModules.length} existing module(s): ${existingModules.join(', ')}`);
  }

  // Flag overly complex assembly modules (too many translate calls)
  const translateCount = (code.match(/translate\s*\(/g) ?? []).length;
  if (translateCount > 30) {
    suggestions.push(`High translate() count (${translateCount}) in assembly — consider grouping related transforms with named sub-assemblies.`);
  }

  return {
    totalPrimitives: primitives.length,
    candidateBlocks: candidates,
    existingModules,
    potentialSavings,
    suggestions,
  };
}

// ── Activity Insights — lightweight file diff & change summary ────────────────
// Open-source equivalent of AutoCAD Activity Insights.
// Computes a structured diff between two versions of OpenSCAD source.

export interface ActivityEntry {
  type: 'added' | 'removed' | 'modified';
  entityType: 'module' | 'dimension' | 'primitive' | 'comment' | 'line';
  description: string;
  lineNumber?: number;
}

export interface ActivityReport {
  timestamp: string;
  modulesAdded: string[];
  modulesRemoved: string[];
  dimensionsChanged: Array<{ context: string; before: string; after: string }>;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  entries: ActivityEntry[];
  summary: string;
}

export function diffOpenSCAD(before: string, after: string): ActivityReport {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  const beforeModules = new Set([...before.matchAll(/module\s+(\w+)\s*\(/g)].map(m => m[1]));
  const afterModules = new Set([...after.matchAll(/module\s+(\w+)\s*\(/g)].map(m => m[1]));

  const modulesAdded = [...afterModules].filter(m => !beforeModules.has(m));
  const modulesRemoved = [...beforeModules].filter(m => !afterModules.has(m));

  // Dimension change detection — find numeric literals that changed
  const dimRegex = /(?:cube\(\[|cylinder\(|sphere\(|translate\(\[)([\d., ]+)/g;
  const extractDims = (src: string) => [...src.matchAll(dimRegex)].map(m => m[0]);
  const beforeDims = extractDims(before);
  const afterDims = extractDims(after);

  const dimensionsChanged: ActivityReport['dimensionsChanged'] = [];
  const maxLen = Math.max(beforeDims.length, afterDims.length);
  for (let i = 0; i < Math.min(maxLen, 50); i++) {
    if (beforeDims[i] !== afterDims[i] && beforeDims[i] && afterDims[i]) {
      dimensionsChanged.push({ context: `dimension block ${i + 1}`, before: beforeDims[i], after: afterDims[i] });
    }
  }

  // Line-level diff (simple)
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const added = afterLines.filter(l => !beforeSet.has(l) && l.trim());
  const removed = beforeLines.filter(l => !afterSet.has(l) && l.trim());

  const entries: ActivityEntry[] = [
    ...modulesAdded.map(m => ({ type: 'added' as const, entityType: 'module' as const, description: `Added module "${m}"` })),
    ...modulesRemoved.map(m => ({ type: 'removed' as const, entityType: 'module' as const, description: `Removed module "${m}"` })),
    ...dimensionsChanged.map(d => ({ type: 'modified' as const, entityType: 'dimension' as const, description: `${d.context}: ${d.before} → ${d.after}` })),
  ];

  const parts: string[] = [];
  if (modulesAdded.length) parts.push(`+${modulesAdded.length} module(s)`);
  if (modulesRemoved.length) parts.push(`-${modulesRemoved.length} module(s)`);
  if (dimensionsChanged.length) parts.push(`${dimensionsChanged.length} dimension change(s)`);
  if (added.length) parts.push(`+${added.length} lines`);
  if (removed.length) parts.push(`-${removed.length} lines`);

  return {
    timestamp: new Date().toISOString(),
    modulesAdded,
    modulesRemoved,
    dimensionsChanged,
    totalLinesAdded: added.length,
    totalLinesRemoved: removed.length,
    entries,
    summary: parts.length ? parts.join(', ') : 'No changes detected',
  };
}