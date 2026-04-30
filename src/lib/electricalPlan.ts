// Building-electrical model — panels, branch circuits, devices, load calc.
//
// This is the architecture-mode counterpart to the PCB circuitGraph.
// It models *building wiring* (residential / light commercial), not PCBs.
//
// Coordinates: x/y in mm on the floor plan (origin = building reference);
// z in mm above finished floor.
// Power: voltages in V, currents in A, loads in VA.

import type { CircuitSpec, OutletSpec, PanelSpec } from './buildingCodeRules';
import { checkBuilding } from './buildingCodeRules';

export type DeviceKind =
  | 'outlet'         // duplex receptacle
  | 'gfci_outlet'
  | 'switch'
  | 'three_way'
  | 'dimmer'
  | 'fixture'        // ceiling/wall light
  | 'fan'
  | 'smoke_detector'
  | 'co_detector'
  | 'doorbell'
  | 'thermostat'
  | 'ev_charger'
  | 'appliance'      // dedicated appliance circuit
  | 'panel';

export interface Device {
  id: string;
  kind: DeviceKind;
  /** Position on floor plan (mm). z = mounting height above finished floor. */
  pos: { x: number; y: number; z: number };
  /** AIA layer tag (matches layerSystem.ts), e.g. 'E-LITE', 'E-POWR'. */
  layerTag: string;
  /** Continuous load this device contributes to its circuit, in VA. */
  loadVA: number;
  /** True if this device is on for >3 hours typically (lighting, EV). */
  isContinuous: boolean;
  /** Free-form label shown on the plan. */
  label?: string;
  /** Room id this device sits in (for code checks). */
  roomId?: string;
}

export interface Circuit {
  id: string;
  /** Number on the panel schedule, e.g. '12' or '14/16' for shared neutral. */
  number: string;
  panelId: string;
  /** Pole count: 1 for 120 V, 2 for 240 V single-phase. */
  poles: 1 | 2;
  voltage: 120 | 208 | 240 | 277 | 480;
  breakerAmp: number;
  wireAwg: number;
  /** Devices connected to this circuit, in wiring order from panel. */
  deviceIds: string[];
  /** True if this circuit serves a continuous load (forces 80% derating). */
  isContinuous: boolean;
  /** Branch-circuit type tags for code lookups. */
  flags: { gfci: boolean; afci: boolean; dedicated: boolean };
}

export interface Panel {
  id: string;
  label: string;
  pos: { x: number; y: number; z: number };
  /** Main breaker rating in A. */
  ampRating: number;
  voltage: 120 | 208 | 240;
  /** Number of breaker spaces (slots), not poles. */
  spaces: number;
  feederWireAwg: number;
  /** Working clearance dimensions for NEC 110.26 (mm). */
  workingClearanceFrontMm: number;
  workingClearanceWidthMm: number;
  headroomMm: number;
}

export interface ElectricalPlan {
  panels: Panel[];
  circuits: Circuit[];
  devices: Device[];
}

// ── Load calc ──────────────────────────────────────────────────────────────

export interface CircuitLoadSummary {
  circuitId: string;
  totalVA: number;
  totalAmps: number;
  breakerAmps: number;
  continuousDeratingApplied: boolean;
  utilization: number;     // 0..1
  status: 'ok' | 'over_80' | 'over_100';
}

export function computeCircuitLoad(
  circuit: Circuit,
  devices: Device[],
): CircuitLoadSummary {
  const map = new Map(devices.map(d => [d.id, d]));
  const va = circuit.deviceIds.reduce((sum, id) => sum + (map.get(id)?.loadVA ?? 0), 0);
  const amps = va / circuit.voltage;
  const allowance = circuit.breakerAmp * (circuit.isContinuous ? 0.8 : 1.0);
  let status: CircuitLoadSummary['status'] = 'ok';
  if (amps > circuit.breakerAmp) status = 'over_100';
  else if (amps > allowance)     status = 'over_80';
  return {
    circuitId: circuit.id,
    totalVA: va,
    totalAmps: amps,
    breakerAmps: circuit.breakerAmp,
    continuousDeratingApplied: circuit.isContinuous,
    utilization: amps / circuit.breakerAmp,
    status,
  };
}

export interface PanelScheduleRow {
  number: string;
  description: string;
  breakerAmp: number;
  poles: number;
  load: CircuitLoadSummary;
}

export interface PanelSchedule {
  panel: Panel;
  rows: PanelScheduleRow[];
  totalConnectedVA: number;
  totalConnectedAmps: number;
  /** NEC 220 demand load (simplified general-lighting + small-appliance). */
  demandLoadAmps: number;
  feederUtilization: number;
}

/**
 * Build the panel schedule. Demand calculation uses NEC 220.42 general-lighting
 * demand factors (first 3000 VA at 100%, remainder at 35%) — adequate for
 * residential single-family. Larger / commercial loads should be hand-calc'd.
 */
export function buildPanelSchedule(
  panel: Panel,
  plan: ElectricalPlan,
): PanelSchedule {
  const circuitsHere = plan.circuits.filter(c => c.panelId === panel.id);
  const deviceMap = new Map(plan.devices.map(d => [d.id, d]));

  const rows: PanelScheduleRow[] = circuitsHere.map(c => {
    const desc = c.deviceIds
      .map(id => deviceMap.get(id))
      .filter(Boolean)
      .map(d => d!.label ?? d!.kind)
      .slice(0, 3)
      .join(', ') || 'spare';
    return {
      number: c.number,
      description: desc,
      breakerAmp: c.breakerAmp,
      poles: c.poles,
      load: computeCircuitLoad(c, plan.devices),
    };
  });

  const totalVA = rows.reduce((s, r) => s + r.load.totalVA, 0);
  const totalAmps = totalVA / panel.voltage;

  // NEC 220.42 general-lighting demand
  const demandVA = totalVA <= 3000 ? totalVA : 3000 + (totalVA - 3000) * 0.35;
  const demandLoadAmps = demandVA / panel.voltage;

  return {
    panel,
    rows: rows.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    totalConnectedVA: totalVA,
    totalConnectedAmps: totalAmps,
    demandLoadAmps,
    feederUtilization: demandLoadAmps / panel.ampRating,
  };
}

// ── Code-check bridge ──────────────────────────────────────────────────────
// Convert an ElectricalPlan into the descriptors checkBuilding() expects.

export function deriveCodeSpecs(plan: ElectricalPlan): {
  panels: PanelSpec[];
  circuits: CircuitSpec[];
  outlets: OutletSpec[];
} {
  const deviceMap = new Map(plan.devices.map(d => [d.id, d]));

  const panels: PanelSpec[] = plan.panels.map(p => ({
    id: p.id,
    workingClearanceFrontMm: p.workingClearanceFrontMm,
    workingClearanceWidthMm: p.workingClearanceWidthMm,
    headroomMm: p.headroomMm,
    ampRating: p.ampRating,
    feederWireAwg: p.feederWireAwg,
  }));

  const circuits: CircuitSpec[] = plan.circuits.map(c => {
    const load = computeCircuitLoad(c, plan.devices);
    return {
      id: c.id,
      breakerAmp: c.breakerAmp,
      wireAwg: c.wireAwg,
      loadAmps: load.totalAmps,
      isContinuous: c.isContinuous,
    };
  });

  const outlets: OutletSpec[] = [];
  for (const c of plan.circuits) {
    for (const did of c.deviceIds) {
      const d = deviceMap.get(did);
      if (!d) continue;
      if (d.kind !== 'outlet' && d.kind !== 'gfci_outlet') continue;
      // Map device room → outlet roomType using a coarse keyword convention on roomId.
      const room = (d.roomId ?? '').toLowerCase();
      const roomType: OutletSpec['roomType'] =
        room.includes('kitchen') ? 'kitchen' :
        room.includes('bath') ? 'bathroom' :
        room.includes('bed') ? 'bedroom' :
        room.includes('living') || room.includes('great') ? 'living' :
        room.includes('garage') ? 'garage' :
        room.includes('laundry') ? 'laundry' :
        room.includes('outdoor') || room.includes('exterior') ? 'outdoor' : 'other';
      outlets.push({
        id: d.id,
        roomType,
        hasGFCI: d.kind === 'gfci_outlet' || c.flags.gfci,
        hasAFCI: c.flags.afci,
      });
    }
  }
  return { panels, circuits, outlets };
}

export function validateElectricalPlan(plan: ElectricalPlan) {
  const specs = deriveCodeSpecs(plan);
  return checkBuilding({ panels: specs.panels, circuits: specs.circuits, outlets: specs.outlets });
}

// ── SVG overlay ────────────────────────────────────────────────────────────
// Minimal IEC-60617-flavoured symbols, sized for a floor plan at 1px = 10mm.
// Symbols are drawn centered at the device origin; rotation applied by caller.

const SYMBOL_PX = 8;

function devicePath(kind: DeviceKind): string {
  switch (kind) {
    case 'outlet':
    case 'gfci_outlet':
      // Circle with two prong slots
      return `<circle r="${SYMBOL_PX}" fill="white" stroke="#0a0" stroke-width="1.5"/>` +
             `<line x1="-3" y1="-2" x2="-3" y2="2" stroke="#0a0" stroke-width="1.5"/>` +
             `<line x1="3"  y1="-2" x2="3"  y2="2" stroke="#0a0" stroke-width="1.5"/>` +
             (kind === 'gfci_outlet' ? `<text y="${SYMBOL_PX + 8}" text-anchor="middle" font-size="6" fill="#0a0">GFCI</text>` : '');
    case 'switch':
      return `<circle r="${SYMBOL_PX}" fill="white" stroke="#08a" stroke-width="1.5"/>` +
             `<text y="3" text-anchor="middle" font-size="9" fill="#08a">S</text>`;
    case 'three_way':
      return `<circle r="${SYMBOL_PX}" fill="white" stroke="#08a" stroke-width="1.5"/>` +
             `<text y="3" text-anchor="middle" font-size="6" fill="#08a">S₃</text>`;
    case 'dimmer':
      return `<circle r="${SYMBOL_PX}" fill="white" stroke="#08a" stroke-width="1.5"/>` +
             `<text y="3" text-anchor="middle" font-size="6" fill="#08a">SD</text>`;
    case 'fixture':
      // Cross-in-circle (ceiling light)
      return `<circle r="${SYMBOL_PX}" fill="#fff7c0" stroke="#aa8" stroke-width="1.5"/>` +
             `<line x1="-${SYMBOL_PX}" y1="0" x2="${SYMBOL_PX}" y2="0" stroke="#aa8"/>` +
             `<line x1="0" y1="-${SYMBOL_PX}" x2="0" y2="${SYMBOL_PX}" stroke="#aa8"/>`;
    case 'fan':
      return `<circle r="${SYMBOL_PX + 2}" fill="white" stroke="#08a" stroke-width="1.5"/>` +
             `<text y="3" text-anchor="middle" font-size="9" fill="#08a">F</text>`;
    case 'smoke_detector':
      return `<circle r="${SYMBOL_PX}" fill="white" stroke="#c00" stroke-width="1.5"/>` +
             `<text y="3" text-anchor="middle" font-size="7" fill="#c00">SD</text>`;
    case 'co_detector':
      return `<circle r="${SYMBOL_PX}" fill="white" stroke="#a60" stroke-width="1.5"/>` +
             `<text y="3" text-anchor="middle" font-size="7" fill="#a60">CO</text>`;
    case 'thermostat':
      return `<rect x="-${SYMBOL_PX}" y="-${SYMBOL_PX}" width="${SYMBOL_PX * 2}" height="${SYMBOL_PX * 2}" fill="white" stroke="#08a"/>` +
             `<text y="3" text-anchor="middle" font-size="7" fill="#08a">T</text>`;
    case 'ev_charger':
      return `<rect x="-${SYMBOL_PX + 2}" y="-${SYMBOL_PX}" width="${(SYMBOL_PX + 2) * 2}" height="${SYMBOL_PX * 2}" fill="#dfd" stroke="#0a0"/>` +
             `<text y="3" text-anchor="middle" font-size="6" fill="#0a0">EV</text>`;
    case 'appliance':
      return `<rect x="-${SYMBOL_PX}" y="-${SYMBOL_PX}" width="${SYMBOL_PX * 2}" height="${SYMBOL_PX * 2}" fill="white" stroke="#666"/>`;
    case 'panel':
      return `<rect x="-${SYMBOL_PX * 2}" y="-${SYMBOL_PX * 1.5}" width="${SYMBOL_PX * 4}" height="${SYMBOL_PX * 3}" fill="#222" stroke="#fff"/>` +
             `<text y="3" text-anchor="middle" font-size="7" fill="#fff">PANEL</text>`;
    default:
      return `<circle r="3" fill="#888"/>`;
  }
}

/**
 * Render the electrical plan as an SVG overlay (1px = 10mm by default).
 * Caller composites this on top of the architectural floor-plan SVG.
 */
export function renderElectricalSvg(
  plan: ElectricalPlan,
  opts: { mmPerPx?: number; widthMm?: number; heightMm?: number } = {},
): string {
  const mmPerPx = opts.mmPerPx ?? 10;
  const wPx = (opts.widthMm ?? 10000) / mmPerPx;
  const hPx = (opts.heightMm ?? 10000) / mmPerPx;

  const symbols = plan.devices.map(d => {
    const x = d.pos.x / mmPerPx;
    const y = d.pos.y / mmPerPx;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${devicePath(d.kind)}</g>`;
  }).join('');

  const panels = plan.panels.map(p => {
    const x = p.pos.x / mmPerPx;
    const y = p.pos.y / mmPerPx;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${devicePath('panel')}` +
           `<text y="-${SYMBOL_PX * 1.5 + 4}" text-anchor="middle" font-size="6" fill="#fff">${p.label}</text></g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wPx} ${hPx}" data-layer="E-POWR">
${panels}
${symbols}
</svg>`;
}