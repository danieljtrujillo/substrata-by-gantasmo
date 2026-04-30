// Building-code rule library for architecture mode.
//
// Codifies the most-frequently-violated dimensional checks from:
//   • IBC 2024  (International Building Code — egress, stairs, ramps)
//   • ADA 2010  (Standards for Accessible Design — clear widths, reach, slopes)
//   • NEC 2026  (National Electrical Code — clearances, GFCI, AFCI, panel access)
//
// All inputs in millimetres unless noted (NEC ampacity in amperes, gauges in AWG).
// All checks are pure functions returning a CodeFinding[]. The arch validator
// merges them with the mesh validator output.

export type Severity = 'error' | 'warn' | 'info';
export type CodeStandard = 'IBC' | 'ADA' | 'NEC';

export interface CodeFinding {
  rule: string;             // short rule id, e.g. "IBC-1011.5"
  standard: CodeStandard;
  severity: Severity;
  message: string;
  suggested?: string;       // suggested remediation
  contextRef?: string;      // free-form pointer to the offending element
}

// ── Architectural — IBC + ADA ───────────────────────────────────────────────

export interface DoorSpec {
  id: string;
  type: 'entry' | 'interior' | 'bathroom' | 'closet' | 'egress';
  clearWidthMm: number;     // clear opening, not nominal door size
  clearHeightMm: number;
}

export function checkDoor(d: DoorSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // ADA / IBC 1010.1.1 — minimum clear width for egress: 813 mm (32 in)
  // for residential dwelling unit doors; 914 mm (36 in) for accessible routes.
  const minWidth = d.type === 'closet' ? 610 : 813;
  if (d.clearWidthMm < minWidth) {
    out.push({
      rule: 'IBC-1010.1.1', standard: 'IBC', severity: 'error',
      message: `Door "${d.id}" clear width ${d.clearWidthMm}mm is below required ${minWidth}mm.`,
      suggested: `Increase to ${minWidth}mm minimum (${minWidth === 813 ? '914mm if on an accessible route' : ''}).`,
      contextRef: d.id,
    });
  }
  // IBC 1010.1.1 — minimum clear height 2032 mm (80 in)
  if (d.clearHeightMm < 2032) {
    out.push({
      rule: 'IBC-1010.1.1', standard: 'IBC', severity: 'error',
      message: `Door "${d.id}" clear height ${d.clearHeightMm}mm is below required 2032mm.`,
      contextRef: d.id,
    });
  }
  // ADA — accessible route doors require 32" clear with door open 90°
  if ((d.type === 'entry' || d.type === 'bathroom') && d.clearWidthMm < 813) {
    out.push({
      rule: 'ADA-404.2.3', standard: 'ADA', severity: 'error',
      message: `Door "${d.id}" must provide 813mm clear width when open 90° (ADA accessible route).`,
      contextRef: d.id,
    });
  }
  return out;
}

export interface StairSpec {
  id: string;
  riserMm: number;          // single riser height
  treadMm: number;          // single tread depth
  clearWidthMm: number;
  hasHandrail: boolean;
  riserCount: number;
}

export function checkStair(s: StairSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // IBC 1011.5.2 — riser max 178 mm (7"), min 102 mm (4")
  if (s.riserMm > 178) {
    out.push({
      rule: 'IBC-1011.5.2', standard: 'IBC', severity: 'error',
      message: `Stair "${s.id}" riser ${s.riserMm}mm exceeds 178mm maximum.`,
      contextRef: s.id,
    });
  }
  if (s.riserMm < 102) {
    out.push({
      rule: 'IBC-1011.5.2', standard: 'IBC', severity: 'warn',
      message: `Stair "${s.id}" riser ${s.riserMm}mm is below 102mm minimum (residential).`,
      contextRef: s.id,
    });
  }
  // IBC 1011.5.2 — tread min 279 mm (11")
  if (s.treadMm < 279) {
    out.push({
      rule: 'IBC-1011.5.2', standard: 'IBC', severity: 'error',
      message: `Stair "${s.id}" tread ${s.treadMm}mm is below 279mm minimum.`,
      contextRef: s.id,
    });
  }
  // IBC 1011.2 — minimum stair width 914 mm (36")
  if (s.clearWidthMm < 914) {
    out.push({
      rule: 'IBC-1011.2', standard: 'IBC', severity: 'error',
      message: `Stair "${s.id}" width ${s.clearWidthMm}mm is below 914mm minimum.`,
      contextRef: s.id,
    });
  }
  // IBC 1014.1 — handrail required on stairs with > 4 risers
  if (s.riserCount > 4 && !s.hasHandrail) {
    out.push({
      rule: 'IBC-1014.1', standard: 'IBC', severity: 'error',
      message: `Stair "${s.id}" with ${s.riserCount} risers requires a handrail.`,
      contextRef: s.id,
    });
  }
  return out;
}

export interface RampSpec {
  id: string;
  riseMm: number;
  runMm: number;
  clearWidthMm: number;
}

export function checkRamp(r: RampSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // ADA 405.2 — slope max 1:12 for new construction
  const slope = r.riseMm / r.runMm;
  if (slope > 1 / 12) {
    out.push({
      rule: 'ADA-405.2', standard: 'ADA', severity: 'error',
      message: `Ramp "${r.id}" slope 1:${(1 / slope).toFixed(1)} exceeds 1:12 ADA maximum.`,
      suggested: `Lengthen run to at least ${Math.ceil(r.riseMm * 12)}mm.`,
      contextRef: r.id,
    });
  }
  // ADA 405.5 — clear width 915 mm (36")
  if (r.clearWidthMm < 915) {
    out.push({
      rule: 'ADA-405.5', standard: 'ADA', severity: 'error',
      message: `Ramp "${r.id}" clear width ${r.clearWidthMm}mm is below 915mm.`,
      contextRef: r.id,
    });
  }
  return out;
}

export interface CorridorSpec {
  id: string;
  clearWidthMm: number;
  occupantLoad: number;
}

export function checkCorridor(c: CorridorSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // IBC 1020.2 — corridor min width 1118 mm (44") for occupant load > 50,
  // 914 mm (36") otherwise.
  const min = c.occupantLoad > 50 ? 1118 : 914;
  if (c.clearWidthMm < min) {
    out.push({
      rule: 'IBC-1020.2', standard: 'IBC', severity: 'error',
      message: `Corridor "${c.id}" width ${c.clearWidthMm}mm is below ${min}mm for occupant load ${c.occupantLoad}.`,
      contextRef: c.id,
    });
  }
  return out;
}

export interface RoomSpec {
  id: string;
  use: 'habitable' | 'kitchen' | 'bathroom' | 'closet' | 'corridor';
  ceilingHeightMm: number;
  windowAreaMm2: number;
  floorAreaMm2: number;
}

export function checkRoom(r: RoomSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // IBC 1208.2 — habitable rooms ≥ 2134 mm (7'-0") ceiling, kitchens/bathrooms ≥ 2032 mm (6'-8")
  const minH = r.use === 'habitable' ? 2134 : 2032;
  if (r.ceilingHeightMm < minH) {
    out.push({
      rule: 'IBC-1208.2', standard: 'IBC', severity: 'error',
      message: `Room "${r.id}" (${r.use}) ceiling ${r.ceilingHeightMm}mm is below ${minH}mm.`,
      contextRef: r.id,
    });
  }
  // IBC 1204.2 — natural light: window area ≥ 8 % of floor area for habitable rooms
  if (r.use === 'habitable') {
    const ratio = r.windowAreaMm2 / r.floorAreaMm2;
    if (ratio < 0.08) {
      out.push({
        rule: 'IBC-1204.2', standard: 'IBC', severity: 'warn',
        message: `Room "${r.id}" window-to-floor ratio ${(ratio * 100).toFixed(1)}% is below 8% required for natural light.`,
        contextRef: r.id,
      });
    }
  }
  return out;
}

// ── Electrical — NEC 2026 ───────────────────────────────────────────────────

export interface OutletSpec {
  id: string;
  roomType: 'kitchen' | 'bathroom' | 'bedroom' | 'living' | 'garage' | 'outdoor' | 'laundry' | 'other';
  hasGFCI: boolean;
  hasAFCI: boolean;
  withinCountertopMm?: number; // distance from sink for kitchen outlets
}

export function checkOutlet(o: OutletSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // NEC 210.8 — GFCI required: bathrooms, kitchens, garages, outdoor, laundry, within 6 ft of sink
  const gfciRooms: OutletSpec['roomType'][] = ['kitchen', 'bathroom', 'garage', 'outdoor', 'laundry'];
  if (gfciRooms.includes(o.roomType) && !o.hasGFCI) {
    out.push({
      rule: 'NEC-210.8', standard: 'NEC', severity: 'error',
      message: `Outlet "${o.id}" in ${o.roomType} requires GFCI protection.`,
      contextRef: o.id,
    });
  }
  // NEC 210.12 — AFCI required in dwelling-unit bedrooms, living, kitchens, etc.
  const afciRooms: OutletSpec['roomType'][] = ['bedroom', 'living', 'kitchen', 'laundry'];
  if (afciRooms.includes(o.roomType) && !o.hasAFCI) {
    out.push({
      rule: 'NEC-210.12', standard: 'NEC', severity: 'error',
      message: `Outlet "${o.id}" in ${o.roomType} requires AFCI protection.`,
      contextRef: o.id,
    });
  }
  return out;
}

export interface PanelSpec {
  id: string;
  workingClearanceFrontMm: number;
  workingClearanceWidthMm: number;
  headroomMm: number;
  ampRating: number;
  feederWireAwg: number;
}

export function checkPanel(p: PanelSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // NEC 110.26(A) — working space: 914 mm (36") deep, 762 mm (30") wide, 2032 mm (6'-6") high
  if (p.workingClearanceFrontMm < 914) {
    out.push({
      rule: 'NEC-110.26(A)(1)', standard: 'NEC', severity: 'error',
      message: `Panel "${p.id}" front working clearance ${p.workingClearanceFrontMm}mm is below 914mm minimum.`,
      contextRef: p.id,
    });
  }
  if (p.workingClearanceWidthMm < 762) {
    out.push({
      rule: 'NEC-110.26(A)(2)', standard: 'NEC', severity: 'error',
      message: `Panel "${p.id}" working width ${p.workingClearanceWidthMm}mm is below 762mm minimum.`,
      contextRef: p.id,
    });
  }
  if (p.headroomMm < 2032) {
    out.push({
      rule: 'NEC-110.26(E)', standard: 'NEC', severity: 'error',
      message: `Panel "${p.id}" headroom ${p.headroomMm}mm is below 2032mm minimum.`,
      contextRef: p.id,
    });
  }
  // NEC 310.16 — feeder wire ampacity (60 °C copper, simplified):
  //   14 AWG → 15 A, 12 AWG → 20 A, 10 AWG → 30 A, 8 AWG → 40 A, 6 AWG → 55 A,
  //   4 AWG → 70 A, 3 AWG → 85 A, 2 AWG → 95 A, 1/0 → 125 A, 2/0 → 145 A,
  //   3/0 → 165 A, 4/0 → 195 A, 250 kcmil ≈ 215 A.
  const ampacity: Record<number, number> = {
    14: 15, 12: 20, 10: 30, 8: 40, 6: 55, 4: 70, 3: 85, 2: 95, 1: 110, 0: 125,
  };
  const max = ampacity[p.feederWireAwg] ?? 0;
  if (max && p.ampRating > max) {
    out.push({
      rule: 'NEC-310.16', standard: 'NEC', severity: 'error',
      message: `Panel "${p.id}" rated ${p.ampRating}A exceeds ampacity of ${p.feederWireAwg} AWG feeder (${max}A).`,
      suggested: `Upsize feeder or de-rate the panel.`,
      contextRef: p.id,
    });
  }
  return out;
}

export interface CircuitSpec {
  id: string;
  breakerAmp: number;
  wireAwg: number;
  loadAmps: number;          // calculated continuous load
  isContinuous: boolean;     // > 3 hr operation (lighting, etc.)
}

export function checkCircuit(c: CircuitSpec): CodeFinding[] {
  const out: CodeFinding[] = [];
  // NEC 240.4(D) — small-conductor protection caps:
  //   14 AWG max 15 A, 12 AWG max 20 A, 10 AWG max 30 A
  const cap: Record<number, number> = { 14: 15, 12: 20, 10: 30 };
  const maxBreaker = cap[c.wireAwg];
  if (maxBreaker && c.breakerAmp > maxBreaker) {
    out.push({
      rule: 'NEC-240.4(D)', standard: 'NEC', severity: 'error',
      message: `Circuit "${c.id}": ${c.breakerAmp}A breaker on ${c.wireAwg} AWG exceeds cap of ${maxBreaker}A.`,
      contextRef: c.id,
    });
  }
  // NEC 210.20(A) — continuous load ≤ 80% of breaker rating
  if (c.isContinuous && c.loadAmps > c.breakerAmp * 0.8) {
    out.push({
      rule: 'NEC-210.20(A)', standard: 'NEC', severity: 'error',
      message: `Circuit "${c.id}" continuous load ${c.loadAmps}A exceeds 80% of breaker (${(c.breakerAmp * 0.8).toFixed(1)}A).`,
      suggested: `Increase breaker to ${Math.ceil(c.loadAmps / 0.8)}A or reduce load.`,
      contextRef: c.id,
    });
  }
  return out;
}

// ── Bulk runner ─────────────────────────────────────────────────────────────

export interface BuildingDescriptor {
  doors?: DoorSpec[];
  stairs?: StairSpec[];
  ramps?: RampSpec[];
  corridors?: CorridorSpec[];
  rooms?: RoomSpec[];
  panels?: PanelSpec[];
  circuits?: CircuitSpec[];
  outlets?: OutletSpec[];
}

export interface BuildingCodeReport {
  findings: CodeFinding[];
  summary: { errors: number; warnings: number; info: number };
  overallScore: 'pass' | 'warn' | 'fail';
}

export function checkBuilding(b: BuildingDescriptor): BuildingCodeReport {
  const findings: CodeFinding[] = [];
  for (const d of b.doors ?? [])    findings.push(...checkDoor(d));
  for (const s of b.stairs ?? [])   findings.push(...checkStair(s));
  for (const r of b.ramps ?? [])    findings.push(...checkRamp(r));
  for (const c of b.corridors ?? []) findings.push(...checkCorridor(c));
  for (const r of b.rooms ?? [])    findings.push(...checkRoom(r));
  for (const p of b.panels ?? [])   findings.push(...checkPanel(p));
  for (const c of b.circuits ?? []) findings.push(...checkCircuit(c));
  for (const o of b.outlets ?? [])  findings.push(...checkOutlet(o));

  const summary = { errors: 0, warnings: 0, info: 0 };
  for (const f of findings) {
    if (f.severity === 'error') summary.errors++;
    else if (f.severity === 'warn') summary.warnings++;
    else summary.info++;
  }
  const overallScore: BuildingCodeReport['overallScore'] =
    summary.errors > 0 ? 'fail' : summary.warnings > 0 ? 'warn' : 'pass';

  return { findings, summary, overallScore };
}