// KiCad schematic emitter — produces a .kicad_sch v9 S-expression file from
// the circuit-graph IR. Output is openable in KiCad 8/9 (the v9 schema is
// stable). Wires are emitted as point-to-point connections rooted at the
// pin coordinates derived from each component's library symbol; for clean
// routing the user re-runs KiCad's auto-route or hand-routes after import.
//
// What this emitter does NOT do:
//   • full electrical rule checks (KiCad's ERC does this, run via kicad-cli)
//   • PCB layout (.kicad_pcb) — that's a separate emitter for later
//   • symbol library generation — we reference stock KiCad libraries by id

import type { Schematic, Component, Net, Sheet, BomLine } from './circuitGraph';
import { buildBom } from './circuitGraph';

const VERSION = 20240108;             // KiCad 8/9 schematic format version
const GENERATOR = 'substrata-kicad-emit';

const SHEET_SIZES: Record<Sheet['size'], { w: number; h: number }> = {
  A4:       { w: 297,  h: 210 },     // mm
  A3:       { w: 420,  h: 297 },
  USLetter: { w: 279.4, h: 215.9 },
};

// ── S-expression writer ────────────────────────────────────────────────────
// Tiny bespoke writer — KiCad files are not standard sexp, they are
// whitespace-formatted with specific indentation conventions.

class S {
  private indent = 0;
  private buf: string[] = [];
  open(name: string, ...inline: string[]) {
    this.buf.push('  '.repeat(this.indent) + `(${name}` + (inline.length ? ' ' + inline.join(' ') : ''));
    this.indent++;
  }
  closeInline() {
    this.indent--;
    const last = this.buf.pop()!;
    this.buf.push(last + ')');
  }
  close() {
    this.indent--;
    this.buf.push('  '.repeat(this.indent) + ')');
  }
  line(s: string) {
    this.buf.push('  '.repeat(this.indent) + s);
  }
  toString(): string { return this.buf.join('\n') + '\n'; }
}

function quote(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function uuid(seed: string): string {
  // Deterministic UUID-v5-ish from a seed string. Good enough for KiCad's
  // internal uuids — KiCad never validates them as RFC-4122, only uniqueness.
  let h1 = 0x811c9dc5, h2 = 0x12345678;
  for (let i = 0; i < seed.length; i++) {
    h1 = Math.imul(h1 ^ seed.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + seed.charCodeAt(i) * 31, 0x85ebca6b) >>> 0;
  }
  const hx = (n: number, d = 8) => n.toString(16).padStart(d, '0');
  return `${hx(h1)}-${hx(h2 & 0xffff, 4)}-4${hx((h2 >>> 16) & 0xfff, 3)}-8${hx(h1 & 0xfff, 3)}-${hx(h1 ^ h2)}${hx(h2 & 0xffff, 4)}`;
}

// ── Component placement ────────────────────────────────────────────────────
// Pin coordinates are *symbol-relative*. We don't know the exact symbol
// geometry without the library file, so we approximate: pins are placed on
// a unit circle of radius depending on pin count, around the component pos.

function pinAbsolutePosition(c: Component, pinNumber: string): { x: number; y: number } {
  const idx = Math.max(0, c.pins.findIndex(p => p.number === pinNumber));
  const n = Math.max(c.pins.length, 1);
  const r = 5.08; // 200 mil — typical pin grid
  // Lay pins along left/right sides for ICs, around for passives
  if (n <= 2) {
    const dx = idx === 0 ? -r : r;
    return { x: c.pos.x / 10 + dx, y: c.pos.y / 10 };
  }
  const half = Math.ceil(n / 2);
  const onRight = idx >= half;
  const i = onRight ? idx - half : idx;
  return {
    x: c.pos.x / 10 + (onRight ? r : -r),
    y: c.pos.y / 10 + (i - (half - 1) / 2) * 2.54,
  };
}

// ── Emitters ───────────────────────────────────────────────────────────────

function emitComponent(s: S, c: Component) {
  s.open('symbol');
  s.line(`(lib_id ${quote(c.libId)})`);
  s.line(`(at ${(c.pos.x / 10).toFixed(2)} ${(c.pos.y / 10).toFixed(2)} ${c.rotation})`);
  s.line(`(unit 1)`);
  s.line(`(exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no)`);
  s.line(`(uuid ${quote(uuid(`comp:${c.ref}`))})`);
  // Properties
  s.open('property', quote('Reference'), quote(c.ref));
  s.line(`(at ${(c.pos.x / 10).toFixed(2)} ${((c.pos.y - 30) / 10).toFixed(2)} 0)`);
  s.line(`(effects (font (size 1.27 1.27)))`);
  s.close();
  s.open('property', quote('Value'), quote(c.value));
  s.line(`(at ${(c.pos.x / 10).toFixed(2)} ${((c.pos.y + 30) / 10).toFixed(2)} 0)`);
  s.line(`(effects (font (size 1.27 1.27)))`);
  s.close();
  s.open('property', quote('Footprint'), quote(c.footprint ?? ''));
  s.line(`(at ${(c.pos.x / 10).toFixed(2)} ${(c.pos.y / 10).toFixed(2)} 0)`);
  s.line(`(effects (font (size 1.27 1.27)) (hide yes))`);
  s.close();
  if (c.mpn) {
    s.open('property', quote('MPN'), quote(c.mpn));
    s.line(`(at ${(c.pos.x / 10).toFixed(2)} ${(c.pos.y / 10).toFixed(2)} 0)`);
    s.line(`(effects (font (size 1.27 1.27)) (hide yes))`);
    s.close();
  }
  // Pin uuids — needed for the netlist to attach to the right pins
  for (const p of c.pins) {
    s.line(`(pin ${quote(p.number)} (uuid ${quote(uuid(`pin:${c.ref}.${p.number}`))}))`);
  }
  s.close();
}

function emitWiresForNet(s: S, net: Net, components: Map<string, Component>) {
  if (net.connections.length < 2) return;
  // Star-route from the first pin to every other pin. KiCad will collapse
  // colinear segments on next save; this is fine as an import baseline.
  const first = net.connections[0];
  const firstC = components.get(first.componentRef);
  if (!firstC) return;
  const a = pinAbsolutePosition(firstC, first.pinNumber);
  for (let i = 1; i < net.connections.length; i++) {
    const conn = net.connections[i];
    const c = components.get(conn.componentRef);
    if (!c) continue;
    const b = pinAbsolutePosition(c, conn.pinNumber);
    s.open('wire');
    s.line(`(pts (xy ${a.x.toFixed(2)} ${a.y.toFixed(2)}) (xy ${b.x.toFixed(2)} ${b.y.toFixed(2)}))`);
    s.line(`(stroke (width 0) (type default))`);
    s.line(`(uuid ${quote(uuid(`wire:${net.name}:${i}`))})`);
    s.close();
  }
  // Net label on the first pin so KiCad surfaces the net name.
  s.open('label', quote(net.name));
  s.line(`(at ${a.x.toFixed(2)} ${(a.y - 1.27).toFixed(2)} 0)`);
  s.line(`(effects (font (size 1.27 1.27)) (justify left bottom))`);
  s.line(`(uuid ${quote(uuid(`label:${net.name}`))})`);
  s.close();
}

export function emitSchematic(schematic: Schematic): { sch: string; bom: BomLine[]; netlist: string } {
  const s = new S();
  const sheet = schematic.sheets[0]; // single-sheet for now
  const size = SHEET_SIZES[sheet.size];
  const compMap = new Map(sheet.components.map(c => [c.ref, c]));

  s.open('kicad_sch');
  s.line(`(version ${VERSION})`);
  s.line(`(generator ${quote(GENERATOR)})`);
  s.line(`(uuid ${quote(uuid('root:' + schematic.projectName))})`);
  s.line(`(paper ${quote(sheet.size)})`);
  // Title block
  s.open('title_block');
  s.line(`(title ${quote(sheet.title)})`);
  if (sheet.date)    s.line(`(date ${quote(sheet.date)})`);
  if (sheet.rev)     s.line(`(rev ${quote(sheet.rev)})`);
  if (sheet.company) s.line(`(company ${quote(sheet.company)})`);
  s.close();
  // lib_symbols stub — KiCad will resolve from the project's symbol-lib-table
  s.line(`(lib_symbols)`);
  // Components
  for (const c of sheet.components) emitComponent(s, c);
  // Wires + labels per net
  for (const n of sheet.nets) emitWiresForNet(s, n, compMap);
  // Sheet instances boilerplate
  s.open('sheet_instances');
  s.open('path', quote('/'));
  s.line(`(page ${quote('1')})`);
  s.close();
  s.close();
  s.close();

  // Acknowledge size in a comment header (KiCad ignores comments outside the form)
  const sch = `(kicad_sch_paper "${sheet.size}" ${size.w}x${size.h}mm)\n` + s.toString();

  return {
    sch: s.toString(), // pure form
    bom: buildBom(schematic),
    netlist: emitNetlist(schematic),
  };
  void sch; // keep computed sheet size accessible if we need a banner later
}

/** Plain-text netlist (KiCad-compatible "OrcadPCB2"-ish flavour). */
export function emitNetlist(schematic: Schematic): string {
  const lines: string[] = [`# Netlist for ${schematic.projectName}`, ''];
  for (const sheet of schematic.sheets) {
    lines.push(`## ${sheet.title}`);
    for (const net of sheet.nets) {
      lines.push(`NET ${net.name}${net.netClass ? ` [${net.netClass}]` : ''}`);
      for (const conn of net.connections) {
        const c = sheet.components.find(c => c.ref === conn.componentRef);
        const pin = c?.pins.find(p => p.number === conn.pinNumber);
        lines.push(`  ${conn.componentRef}.${conn.pinNumber}  ${pin?.name ?? '?'}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

/** Build the suite of files to write to disk for a project. */
export interface KicadProjectFiles {
  /** Filename → contents */
  files: Record<string, string>;
}

export function emitProjectFiles(schematic: Schematic): KicadProjectFiles {
  const { sch, bom, netlist } = emitSchematic(schematic);
  const slug = schematic.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'project';
  const files: Record<string, string> = {
    [`${slug}.kicad_sch`]: sch,
    [`${slug}.net`]: netlist,
    [`${slug}_bom.csv`]: bomToCsv(bom),
    // Minimal .kicad_pro so KiCad opens the project
    [`${slug}.kicad_pro`]: kicadProJson(schematic.projectName),
    'README.md': `# ${schematic.projectName}\n\nGenerated by SUBSTRATA.\n\nOpen \`${slug}.kicad_sch\` in KiCad 8 or later.\n` +
                 (schematic.notes ? `\n## Design notes\n\n${schematic.notes}\n` : ''),
  };
  return { files };
}

function bomToCsv(bom: BomLine[]): string {
  const head = 'qty,refs,value,lib_id,footprint,mpn';
  const rows = bom.map(b =>
    [b.qty, `"${b.refs.join(' ')}"`, `"${b.value}"`, `"${b.libId}"`, `"${b.footprint ?? ''}"`, `"${b.mpn ?? ''}"`].join(',')
  );
  return [head, ...rows].join('\n') + '\n';
}

function kicadProJson(name: string): string {
  // Minimal valid KiCad project descriptor. KiCad fills in the rest on first save.
  return JSON.stringify({
    board: { design_settings: {} },
    boards: [],
    cvpcb: { equivalence_files: [] },
    libraries: { pinned_footprint_libs: [], pinned_symbol_libs: [] },
    meta: { filename: `${name}.kicad_pro`, version: 1 },
    net_settings: { classes: [{ name: 'Default', clearance: 0.2, track_width: 0.25 }] },
    pcbnew: { last_paths: {}, page_layout_descr_file: '' },
    schematic: { legacy_lib_dir: '', legacy_lib_list: [] },
    sheets: [['00000000-0000-0000-0000-000000000000', 'Root']],
    text_variables: {},
  }, null, 2);
}