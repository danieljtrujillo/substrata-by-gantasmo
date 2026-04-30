// Canonical PCB schematic IR.
//
// One IR, two consumers:
//   • kicadEmit.ts  — produces .kicad_sch S-expression files
//   • Gemini schema — generatePCBSchematic constrains LLM output to this shape
//
// Coordinates: x/y in 0.1mm steps (KiCad's internal grid). Origin top-left.
// Pin numbers are component-local 1-based; nets join pins across components.

export type PinType =
  | 'input' | 'output' | 'bidirectional'
  | 'tri_state' | 'passive'
  | 'power_in' | 'power_out'
  | 'open_collector' | 'open_emitter'
  | 'unconnected' | 'no_connect';

export interface Pin {
  /** Component-local pin number (matches the symbol library footprint). */
  number: string;
  /** Pin name as printed on the symbol (e.g. "VCC", "GND", "MOSI"). */
  name: string;
  type: PinType;
}

export interface Component {
  /** Reference designator (R1, U2, J3, …). Must be unique. */
  ref: string;
  /** Value or part number printed on the symbol (e.g. "10k", "ATmega328P"). */
  value: string;
  /** KiCad library symbol id, e.g. "Device:R" or "MCU_Microchip_ATmega:ATmega328P-PU". */
  libId: string;
  /** Footprint id, e.g. "Resistor_SMD:R_0805_2012Metric". Optional at sketch time. */
  footprint?: string;
  /** Schematic placement (KiCad 0.1mm units; (0,0) = top-left). */
  pos: { x: number; y: number };
  /** Rotation in degrees, 0/90/180/270. */
  rotation: 0 | 90 | 180 | 270;
  pins: Pin[];
  /** Optional human-readable purpose, surfaces in tooltips and BOMs. */
  description?: string;
  /** Optional manufacturer part number for BOM/sourcing. */
  mpn?: string;
}

export interface NetConnection {
  componentRef: string;
  pinNumber: string;
}

export interface Net {
  /** Net name. Power nets must use canonical names (VCC, GND, +3V3, +5V). */
  name: string;
  /** All pins joined by this net. */
  connections: NetConnection[];
  /** Optional class for routing rules (e.g. 'power', 'high_speed', 'analog'). */
  netClass?: string;
}

export interface Sheet {
  title: string;
  rev?: string;
  date?: string;
  company?: string;
  /** Sheet size: A4 (210x297mm), A3 (297x420mm), USLetter (8.5x11"). */
  size: 'A4' | 'A3' | 'USLetter';
  components: Component[];
  nets: Net[];
}

export interface Schematic {
  /** Project name; KiCad uses this as the .kicad_sch base filename. */
  projectName: string;
  sheets: Sheet[];
  /** Free-form design notes — surfaced in the export README. */
  notes?: string;
}

// ── Validation ──────────────────────────────────────────────────────────────

export interface CircuitFinding {
  severity: 'error' | 'warn' | 'info';
  rule: string;
  message: string;
  contextRef?: string;
}

export function validateSchematic(s: Schematic): CircuitFinding[] {
  const out: CircuitFinding[] = [];
  const refs = new Set<string>();

  for (const sheet of s.sheets) {
    for (const c of sheet.components) {
      // Unique refdes
      if (refs.has(c.ref)) {
        out.push({ severity: 'error', rule: 'IR-001',
          message: `Duplicate reference designator "${c.ref}".`, contextRef: c.ref });
      }
      refs.add(c.ref);

      // Required value
      if (!c.value) {
        out.push({ severity: 'warn', rule: 'IR-002',
          message: `Component "${c.ref}" has no value.`, contextRef: c.ref });
      }

      // Unique pins per component
      const pinNums = new Set<string>();
      for (const p of c.pins) {
        if (pinNums.has(p.number)) {
          out.push({ severity: 'error', rule: 'IR-003',
            message: `Component "${c.ref}" has duplicate pin number "${p.number}".`, contextRef: c.ref });
        }
        pinNums.add(p.number);
      }
    }

    // Net connections must reference real components & pins
    const compMap = new Map(sheet.components.map(c => [c.ref, c]));
    for (const net of sheet.nets) {
      if (!net.connections.length) {
        out.push({ severity: 'warn', rule: 'IR-010',
          message: `Net "${net.name}" has no connections.`, contextRef: net.name });
      }
      // Singleton nets are usually a sign of a missing wire
      if (net.connections.length === 1) {
        out.push({ severity: 'warn', rule: 'IR-011',
          message: `Net "${net.name}" has only one pin — likely a missing wire.`,
          contextRef: net.name });
      }
      for (const conn of net.connections) {
        const c = compMap.get(conn.componentRef);
        if (!c) {
          out.push({ severity: 'error', rule: 'IR-012',
            message: `Net "${net.name}" references unknown component "${conn.componentRef}".`,
            contextRef: net.name });
          continue;
        }
        if (!c.pins.some(p => p.number === conn.pinNumber)) {
          out.push({ severity: 'error', rule: 'IR-013',
            message: `Net "${net.name}": component "${conn.componentRef}" has no pin "${conn.pinNumber}".`,
            contextRef: net.name });
        }
      }
    }

    // Power nets — must canonicalise to VCC/GND family
    const powerNets = sheet.nets.filter(n => /^(VCC|VDD|GND|VSS|\+\d|3V3|5V|12V)/i.test(n.name));
    if (!powerNets.some(n => /^GND|VSS$/i.test(n.name))) {
      out.push({ severity: 'warn', rule: 'IR-020',
        message: `Sheet "${sheet.title}" has no GND net — every powered design needs ground.` });
    }

    // Power-in pins must be driven by exactly one power source
    for (const c of sheet.components) {
      for (const pin of c.pins.filter(p => p.type === 'power_in')) {
        const drivers = sheet.nets
          .filter(n => n.connections.some(x => x.componentRef === c.ref && x.pinNumber === pin.number))
          .flatMap(n => n.connections)
          .map(conn => compMap.get(conn.componentRef)?.pins.find(p => p.number === conn.pinNumber))
          .filter(p => p?.type === 'power_out');
        if (drivers.length === 0) {
          out.push({ severity: 'warn', rule: 'IR-021',
            message: `Power-in pin ${c.ref}.${pin.number} (${pin.name}) has no power_out driver.`,
            contextRef: c.ref });
        }
      }
    }

    // No-connect pins should be marked
    for (const c of sheet.components) {
      const ncPins = c.pins.filter(p => p.type === 'no_connect');
      for (const pin of ncPins) {
        const isWired = sheet.nets.some(n =>
          n.connections.some(x => x.componentRef === c.ref && x.pinNumber === pin.number));
        if (isWired) {
          out.push({ severity: 'error', rule: 'IR-030',
            message: `${c.ref}.${pin.number} (${pin.name}) is marked NC but is connected.`,
            contextRef: c.ref });
        }
      }
    }
  }
  return out;
}

// ── Helpers for generators ──────────────────────────────────────────────────

/** Build a Net from a list of "REF.PIN" strings, e.g. ['R1.1','U2.7']. */
export function netFromPins(name: string, pins: string[], netClass?: string): Net {
  return {
    name,
    netClass,
    connections: pins.map(s => {
      const [componentRef, pinNumber] = s.split('.');
      return { componentRef, pinNumber };
    }),
  };
}

/** Convenience: 0.1 mm grid → mm, for any consumer that wants metric. */
export const KICAD_UNIT_TO_MM = 0.1;

export function pinByName(c: Component, name: string): Pin | undefined {
  return c.pins.find(p => p.name === name);
}

/** Bill-of-materials roll-up: dedup by (libId, value, footprint, mpn). */
export interface BomLine {
  qty: number;
  refs: string[];
  value: string;
  libId: string;
  footprint?: string;
  mpn?: string;
}

export function buildBom(s: Schematic): BomLine[] {
  const map = new Map<string, BomLine>();
  for (const sheet of s.sheets) {
    for (const c of sheet.components) {
      const key = `${c.libId}|${c.value}|${c.footprint ?? ''}|${c.mpn ?? ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.qty++;
        existing.refs.push(c.ref);
      } else {
        map.set(key, { qty: 1, refs: [c.ref], value: c.value, libId: c.libId, footprint: c.footprint, mpn: c.mpn });
      }
    }
  }
  for (const line of map.values()) line.refs.sort();
  return [...map.values()].sort((a, b) => a.libId.localeCompare(b.libId));
}