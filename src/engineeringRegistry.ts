// ── Engineering Parts Registry ─────────────────────────────────
// Compact lookup of real-world parts with exact dimensions and OpenSCAD modules.
// Only relevant categories are injected into AI prompts to save tokens.

export interface RegistryPart {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  dims: Record<string, number>; // mm
  scad: string; // compact OpenSCAD module
  desc: string;
}

// ── Fasteners ──────────────────────────────────────────────────
const FASTENERS: RegistryPart[] = [
  { id: 'M3_bolt_10', name: 'M3x10 Socket Head Cap Screw', category: 'Fasteners', subcategory: 'Bolts',
    dims: { thread_d: 3, head_d: 5.5, head_h: 3, length: 10, clearance_hole: 3.4 },
    scad: `module M3x10_bolt() { color("#888") { cylinder(d=5.5, h=3, $fn=6); translate([0,0,-10]) cylinder(d=3, h=10, $fn=24); } }`,
    desc: 'Socket head cap screw, hex drive' },
  { id: 'M3_bolt_20', name: 'M3x20 Socket Head Cap Screw', category: 'Fasteners', subcategory: 'Bolts',
    dims: { thread_d: 3, head_d: 5.5, head_h: 3, length: 20, clearance_hole: 3.4 },
    scad: `module M3x20_bolt() { color("#888") { cylinder(d=5.5, h=3, $fn=6); translate([0,0,-20]) cylinder(d=3, h=20, $fn=24); } }`,
    desc: 'Socket head cap screw, hex drive' },
  { id: 'M4_bolt_16', name: 'M4x16 Socket Head Cap Screw', category: 'Fasteners', subcategory: 'Bolts',
    dims: { thread_d: 4, head_d: 7, head_h: 4, length: 16, clearance_hole: 4.5 },
    scad: `module M4x16_bolt() { color("#888") { cylinder(d=7, h=4, $fn=6); translate([0,0,-16]) cylinder(d=4, h=16, $fn=24); } }`,
    desc: 'Socket head cap screw, hex drive' },
  { id: 'M5_bolt_20', name: 'M5x20 Socket Head Cap Screw', category: 'Fasteners', subcategory: 'Bolts',
    dims: { thread_d: 5, head_d: 8.5, head_h: 5, length: 20, clearance_hole: 5.5 },
    scad: `module M5x20_bolt() { color("#888") { cylinder(d=8.5, h=5, $fn=6); translate([0,0,-20]) cylinder(d=5, h=20, $fn=24); } }`,
    desc: 'Socket head cap screw, hex drive' },
  { id: 'M3_nut', name: 'M3 Hex Nut', category: 'Fasteners', subcategory: 'Nuts',
    dims: { thread_d: 3, width: 5.5, height: 2.4 },
    scad: `module M3_nut() { color("#999") cylinder(d=5.5, h=2.4, $fn=6); }`,
    desc: 'Standard hex nut' },
  { id: 'M3_washer', name: 'M3 Flat Washer', category: 'Fasteners', subcategory: 'Washers',
    dims: { inner_d: 3.2, outer_d: 7, thickness: 0.5 },
    scad: `module M3_washer() { color("#aaa") difference() { cylinder(d=7, h=0.5, $fn=24); translate([0,0,-0.1]) cylinder(d=3.2, h=0.7, $fn=24); } }`,
    desc: 'Standard flat washer' },
  { id: 'M3_heatset', name: 'M3 Heat-Set Insert', category: 'Fasteners', subcategory: 'Inserts',
    dims: { outer_d: 4.6, inner_d: 3, length: 5.7 },
    scad: `module M3_heatset() { color("#b8860b") difference() { cylinder(d=4.6, h=5.7, $fn=32); cylinder(d=3, h=6, $fn=24); } }`,
    desc: 'Brass knurled heat-set insert for 3D prints, install hole=4.7mm' },
];

// ── Bearings ───────────────────────────────────────────────────
const BEARINGS: RegistryPart[] = [
  { id: '608_bearing', name: '608ZZ Ball Bearing', category: 'Bearings', subcategory: 'Ball',
    dims: { bore: 8, od: 22, width: 7 },
    scad: `module 608_bearing() { color("#ccc") difference() { cylinder(d=22, h=7, $fn=48); translate([0,0,-0.1]) cylinder(d=8, h=7.2, $fn=32); } }`,
    desc: '8x22x7mm deep groove, skateboard bearing' },
  { id: '625_bearing', name: '625ZZ Ball Bearing', category: 'Bearings', subcategory: 'Ball',
    dims: { bore: 5, od: 16, width: 5 },
    scad: `module 625_bearing() { color("#ccc") difference() { cylinder(d=16, h=5, $fn=48); translate([0,0,-0.1]) cylinder(d=5, h=5.2, $fn=32); } }`,
    desc: '5x16x5mm deep groove' },
  { id: 'LM8UU', name: 'LM8UU Linear Bearing', category: 'Bearings', subcategory: 'Linear',
    dims: { bore: 8, od: 15, length: 24 },
    scad: `module LM8UU() { color("#bbb") difference() { cylinder(d=15, h=24, $fn=48); translate([0,0,-0.1]) cylinder(d=8, h=24.2, $fn=32); } }`,
    desc: '8mm linear ball bearing' },
  { id: 'F623', name: 'F623ZZ Flanged Bearing', category: 'Bearings', subcategory: 'Flanged',
    dims: { bore: 3, od: 10, flange_d: 12, width: 4 },
    scad: `module F623() { color("#ccc") difference() { union() { cylinder(d=10, h=4, $fn=48); cylinder(d=12, h=1, $fn=48); } translate([0,0,-0.1]) cylinder(d=3, h=4.2, $fn=24); } }`,
    desc: '3x10x4mm flanged, good for V-slot wheels' },
];

// ── Motors ──────────────────────────────────────────────────────
const MOTORS: RegistryPart[] = [
  { id: 'NEMA17', name: 'NEMA 17 Stepper Motor', category: 'Motors', subcategory: 'Stepper',
    dims: { body_w: 42.3, body_l: 42.3, body_h: 40, shaft_d: 5, shaft_l: 24, mount_spacing: 31, mount_hole: 3, boss_d: 22, boss_h: 2 },
    scad: `module NEMA17() { color("#333") { cube([42.3,42.3,40], center=true); translate([0,0,20]) cylinder(d=22, h=2, $fn=48); translate([0,0,21]) color("#ccc") cylinder(d=5, h=24, $fn=24); for(x=[-1,1], y=[-1,1]) translate([x*15.5, y*15.5, 20]) cylinder(d=3, h=4.5, $fn=16); } }`,
    desc: '1.8°/step, 200 steps/rev, 0.4-0.8 N·m typical' },
  { id: 'NEMA23', name: 'NEMA 23 Stepper Motor', category: 'Motors', subcategory: 'Stepper',
    dims: { body_w: 56.4, body_l: 56.4, body_h: 56, shaft_d: 6.35, shaft_l: 21, mount_spacing: 47.14 },
    scad: `module NEMA23() { color("#333") { cube([56.4,56.4,56], center=true); translate([0,0,28]) cylinder(d=38.1, h=1.6, $fn=48); translate([0,0,29.6]) color("#ccc") cylinder(d=6.35, h=21, $fn=24); } }`,
    desc: '1.8°/step, 1.0-3.0 N·m typical' },
  { id: 'SG90', name: 'SG90 Micro Servo', category: 'Motors', subcategory: 'Servo',
    dims: { body_w: 22.5, body_d: 12.2, body_h: 22.7, tab_w: 32.5, horn_h: 4, shaft_d: 4.8 },
    scad: `module SG90() { color("#2266cc") { cube([22.5, 12.2, 22.7], center=true); translate([-5, 0, 11.35]) cube([32.5, 12.2, 2.5], center=true); translate([5.5, 0, 14]) color("#fff") cylinder(d=4.8, h=4, $fn=24); } }`,
    desc: '180° rotation, 1.8kg·cm torque, 4.8-6V' },
  { id: 'MG996R', name: 'MG996R Servo', category: 'Motors', subcategory: 'Servo',
    dims: { body_w: 40.7, body_d: 19.7, body_h: 42.9, shaft_d: 6 },
    scad: `module MG996R() { color("#222") { cube([40.7, 19.7, 42.9], center=true); translate([10, 0, 21.45]) color("#fff") cylinder(d=6, h=5, $fn=24); } }`,
    desc: 'Metal gear, 10kg·cm torque, 4.8-7.2V' },
  { id: '775_motor', name: '775 DC Motor', category: 'Motors', subcategory: 'DC',
    dims: { body_d: 42, body_l: 66, shaft_d: 5, shaft_l: 17 },
    scad: `module 775_motor() { color("#555") { cylinder(d=42, h=66, $fn=48); translate([0,0,66]) color("#ccc") cylinder(d=5, h=17, $fn=24); } }`,
    desc: '12-36V, 3000-12000 RPM, high torque' },
];

// ── Electronics ────────────────────────────────────────────────
const ELECTRONICS: RegistryPart[] = [
  { id: 'ESP32_DevKit', name: 'ESP32 DevKit V1', category: 'Electronics', subcategory: 'MCU',
    dims: { pcb_w: 25.4, pcb_l: 48.26, pcb_h: 1.6, header_h: 8.5, usb_w: 8, usb_d: 6 },
    scad: `module ESP32_DevKit() { color("#1a1a2e") cube([25.4, 48.26, 1.6], center=true); color("#333") translate([0, 0, 1.6/2]) cube([20, 44, 8.5], center=true); color("#ccc") translate([0, 24, 0]) cube([8, 6, 3], center=true); }`,
    desc: 'WiFi+BT, 34 GPIO, 240MHz dual-core, 520KB SRAM' },
  { id: 'Arduino_Nano', name: 'Arduino Nano', category: 'Electronics', subcategory: 'MCU',
    dims: { pcb_w: 18, pcb_l: 45, pcb_h: 1.6 },
    scad: `module Arduino_Nano() { color("#0066aa") cube([18, 45, 1.6], center=true); color("#333") translate([0, 0, 1.6]) cube([14, 40, 6], center=true); color("#ccc") translate([0, 22, 0]) cube([8, 6, 3], center=true); }`,
    desc: 'ATmega328P, 14 digital + 8 analog I/O, 5V logic' },
  { id: 'RPi_Pico', name: 'Raspberry Pi Pico', category: 'Electronics', subcategory: 'MCU',
    dims: { pcb_w: 21, pcb_l: 51, pcb_h: 1, mount_holes: 4, mount_d: 2.1 },
    scad: `module RPi_Pico() { color("#00aa00") cube([21, 51, 1], center=true); color("#333") translate([0, -10, 1]) cube([7, 7, 2], center=true); color("#ccc") translate([0, 25, 0]) cube([8, 6, 3], center=true); }`,
    desc: 'RP2040, 264KB SRAM, 26 GPIO, 3.3V logic' },
  { id: 'A4988', name: 'A4988 Stepper Driver', category: 'Electronics', subcategory: 'Driver',
    dims: { pcb_w: 15.3, pcb_l: 20.3, pcb_h: 1.6, heatsink_w: 9, heatsink_h: 10 },
    scad: `module A4988() { color("#aa0000") cube([15.3, 20.3, 1.6], center=true); color("#333") translate([0, 0, 1.6]) cube([9, 9, 10], center=true); }`,
    desc: 'Up to 2A/phase, 1/16 microstepping, 8-35V' },
  { id: 'TMC2209', name: 'TMC2209 Stepper Driver', category: 'Electronics', subcategory: 'Driver',
    dims: { pcb_w: 15.3, pcb_l: 20.3, pcb_h: 1.6 },
    scad: `module TMC2209() { color("#440088") cube([15.3, 20.3, 1.6], center=true); color("#333") translate([0, 0, 1.6]) cube([9, 9, 5], center=true); }`,
    desc: 'Ultra-silent, 2.8A peak, UART, StealthChop2' },
  { id: 'OLED_128x64', name: '0.96" OLED Display', category: 'Electronics', subcategory: 'Display',
    dims: { pcb_w: 27, pcb_l: 27.3, screen_w: 22, screen_h: 11 },
    scad: `module OLED_128x64() { color("#111") cube([27, 27.3, 1.5], center=true); color("#001133") translate([0, 3, 1.5]) cube([22, 11, 1.2], center=true); }`,
    desc: 'SSD1306, I2C, 128x64px, 3.3-5V' },
  { id: 'HC_SR04', name: 'HC-SR04 Ultrasonic Sensor', category: 'Electronics', subcategory: 'Sensor',
    dims: { pcb_w: 45, pcb_h: 20, pcb_d: 1.6, eye_d: 16, eye_spacing: 26 },
    scad: `module HC_SR04() { color("#0088cc") cube([45, 20, 1.6], center=true); for(x=[-13,13]) translate([x, 0, 1.6]) color("#ccc") cylinder(d=16, h=12, $fn=32); }`,
    desc: '2-400cm range, 3mm accuracy, 5V trigger+echo' },
  { id: 'MPU6050', name: 'MPU-6050 IMU', category: 'Electronics', subcategory: 'Sensor',
    dims: { pcb_w: 15.5, pcb_l: 21, pcb_h: 1.3 },
    scad: `module MPU6050() { color("#6600cc") cube([15.5, 21, 1.3], center=true); color("#333") translate([2, 0, 1.3]) cube([4, 4, 1], center=true); }`,
    desc: '3-axis accel + 3-axis gyro, I2C, 3.3V' },
  { id: 'WS2812B_strip', name: 'WS2812B LED Strip (per LED)', category: 'Electronics', subcategory: 'LED',
    dims: { led_w: 5, led_h: 5, led_d: 1.6, pitch: 16.7 },
    scad: `module WS2812B() { color("#fff") cube([5, 5, 1.6], center=true); color("#ffe0b0") translate([0, 0, 0.8]) cube([3.5, 3.5, 0.5], center=true); }`,
    desc: 'Addressable RGB, 5V, ~60mA per LED at full white' },
];

// ── Structural ─────────────────────────────────────────────────
const STRUCTURAL: RegistryPart[] = [
  { id: '2020_extrusion', name: '2020 Aluminum Extrusion (per 100mm)', category: 'Structural', subcategory: 'Extrusion',
    dims: { profile_w: 20, profile_h: 20, slot_w: 6, slot_depth: 6, center_bore: 4.2 },
    scad: `module 2020_extrusion(length=100) { color("#ccc") difference() { cube([20, length, 20], center=true); for(r=[0,90,180,270]) rotate([0,0,r]) translate([10, 0, 0]) cube([6, length+1, 6.2], center=true); cylinder(d=4.2, h=length+1, $fn=24, center=true); } }`,
    desc: 'V-slot or T-slot, 6mm slot width, M5 T-nuts' },
  { id: '2040_extrusion', name: '2040 Aluminum Extrusion (per 100mm)', category: 'Structural', subcategory: 'Extrusion',
    dims: { profile_w: 20, profile_h: 40, slot_w: 6 },
    scad: `module 2040_extrusion(length=100) { color("#ccc") cube([20, length, 40], center=true); }`,
    desc: 'Double-width extrusion for rigidity' },
  { id: '8mm_rod', name: '8mm Smooth Rod (per 100mm)', category: 'Structural', subcategory: 'Rod',
    dims: { diameter: 8 },
    scad: `module smooth_rod_8mm(length=100) { color("#ddd") cylinder(d=8, h=length, $fn=48); }`,
    desc: 'Chrome-plated or hardened steel linear rod' },
  { id: 'GT2_pulley_20T', name: 'GT2 20T Timing Pulley', category: 'Structural', subcategory: 'Pulley',
    dims: { od: 12.22, bore: 5, width: 7, teeth: 20 },
    scad: `module GT2_20T_pulley() { color("#ccc") difference() { union() { cylinder(d=12.22, h=7, $fn=40); translate([0,0,7]) cylinder(d=16, h=1, $fn=40); } translate([0,0,-0.1]) cylinder(d=5, h=9, $fn=24); } }`,
    desc: 'GT2 belt, 2mm pitch, 5mm bore, set screw' },
  { id: 'GT2_belt', name: 'GT2 Timing Belt (per 100mm)', category: 'Structural', subcategory: 'Belt',
    dims: { width: 6, pitch: 2, thickness: 1.52 },
    scad: `module GT2_belt(length=100) { color("#222") cube([6, length, 1.52], center=true); }`,
    desc: '6mm wide, 2mm pitch, fiberglass reinforced' },
  { id: 'T8_leadscrew', name: 'T8 Lead Screw (per 100mm)', category: 'Structural', subcategory: 'Leadscrew',
    dims: { diameter: 8, lead: 8, pitch: 2, starts: 4 },
    scad: `module T8_leadscrew(length=100) { color("#bbb") cylinder(d=8, h=length, $fn=48); }`,
    desc: '8mm dia, 8mm lead (2mm pitch × 4 starts), brass nut' },
  { id: 'T8_nut', name: 'T8 Anti-Backlash Nut', category: 'Structural', subcategory: 'Leadscrew',
    dims: { flange_d: 22, flange_h: 3.5, body_d: 10.2, body_h: 15, mount_spacing: 16, mount_d: 3.5 },
    scad: `module T8_nut() { color("#b8860b") { cylinder(d=22, h=3.5, $fn=48); translate([0,0,3.5]) cylinder(d=10.2, h=15, $fn=32); for(a=[0,90,180,270]) rotate([0,0,a]) translate([8,0,0]) cylinder(d=3.5, h=3.5, $fn=16); } }`,
    desc: 'Brass, spring-loaded anti-backlash' },
];

// ── Mechanical ─────────────────────────────────────────────────  
const MECHANICAL: RegistryPart[] = [
  { id: 'shaft_coupler_5to8', name: '5mm-to-8mm Rigid Shaft Coupler', category: 'Mechanical', subcategory: 'Coupler',
    dims: { od: 20, length: 25, bore_a: 5, bore_b: 8 },
    scad: `module shaft_coupler_5_8() { color("#ccc") difference() { cylinder(d=20, h=25, $fn=48); translate([0,0,-0.1]) cylinder(d=5, h=13, $fn=24); translate([0,0,12]) cylinder(d=8, h=14, $fn=24); } }`,
    desc: 'Aluminum rigid clamp coupler (motor→leadscrew)' },
  { id: 'SC8UU', name: 'SC8UU Linear Bearing Block', category: 'Mechanical', subcategory: 'Bearing Block',
    dims: { base_w: 34, base_l: 30, base_h: 22, bore: 8, mount_spacing_x: 24, mount_spacing_y: 18, mount_d: 4 },
    scad: `module SC8UU() { color("#ccc") { difference() { cube([34, 30, 22], center=true); translate([0,0,5]) cylinder(d=15, h=24, $fn=48, center=true); } translate([0,0,5]) color("#bbb") difference() { cylinder(d=15, h=24, $fn=48, center=true); cylinder(d=8, h=25, $fn=32, center=true); } } }`,
    desc: '8mm rod pillow block, 4-bolt mount' },
  { id: 'KFL08', name: 'KFL08 Pillow Block Bearing', category: 'Mechanical', subcategory: 'Bearing Block',
    dims: { bore: 8, base_w: 52, base_h: 13, mount_spacing: 42, mount_d: 5 },
    scad: `module KFL08() { color("#66aacc") difference() { union() { cube([52, 13, 13], center=true); translate([0,0,0]) cylinder(d=28, h=13, $fn=48, center=true); } cylinder(d=8, h=14, $fn=32, center=true); for(x=[-21,21]) translate([x,0,0]) cylinder(d=5, h=14, $fn=16, center=true); } }`,
    desc: 'Flanged pillow block for 8mm shaft' },
  { id: 'spring_10x20', name: 'Compression Spring 10x20mm', category: 'Mechanical', subcategory: 'Spring',
    dims: { od: 10, length: 20, wire_d: 1 },
    scad: `module spring_10x20() { color("#ccc") difference() { cylinder(d=10, h=20, $fn=32); translate([0,0,-0.1]) cylinder(d=8, h=20.2, $fn=32); } }`,
    desc: 'Steel compression spring, ~1N/mm rate' },
];

// ── Power ──────────────────────────────────────────────────────
const POWER: RegistryPart[] = [
  { id: '18650_cell', name: '18650 Li-Ion Cell', category: 'Power', subcategory: 'Battery',
    dims: { diameter: 18.5, length: 65 },
    scad: `module 18650_cell() { color("#2255cc") cylinder(d=18.5, h=65, $fn=48); translate([0,0,65]) color("#ccc") cylinder(d=8, h=1, $fn=24); }`,
    desc: '3.7V nominal, 2000-3500mAh typical' },
  { id: 'buck_converter', name: 'LM2596 Buck Converter', category: 'Power', subcategory: 'Regulator',
    dims: { pcb_w: 22, pcb_l: 43, pcb_h: 1.6 },
    scad: `module LM2596() { color("#0044aa") cube([22, 43, 1.6], center=true); color("#333") translate([5, 5, 1.6]) cube([12, 12, 10], center=true); color("#222") translate([-5, -10, 1.6]) cylinder(d=8, h=11, $fn=24); }`,
    desc: 'Adjustable 1.25-35V output, 3A max, 4.5-40V input' },
  { id: 'barrel_jack', name: 'DC Barrel Jack 5.5x2.1mm', category: 'Power', subcategory: 'Connector',
    dims: { body_d: 8, body_l: 11, pin_d: 2.1, mount_w: 9, mount_h: 11 },
    scad: `module barrel_jack() { color("#333") { cube([9, 11, 11], center=true); translate([0, 5.5, 0]) cylinder(d=8, h=3, $fn=24); } }`,
    desc: 'Panel mount, 5.5mm OD / 2.1mm ID, center positive' },
];

// ── Full Registry ──────────────────────────────────────────────
export const ENGINEERING_REGISTRY: RegistryPart[] = [
  ...FASTENERS, ...BEARINGS, ...MOTORS, ...ELECTRONICS, ...STRUCTURAL, ...MECHANICAL, ...POWER,
];

// Category index for fast lookup
const _categoryIndex = new Map<string, RegistryPart[]>();
ENGINEERING_REGISTRY.forEach(p => {
  const list = _categoryIndex.get(p.category) || [];
  list.push(p);
  _categoryIndex.set(p.category, list);
});

export function getPartsByCategory(category: string): RegistryPart[] {
  return _categoryIndex.get(category) || [];
}

export function getPartById(id: string): RegistryPart | undefined {
  return ENGINEERING_REGISTRY.find(p => p.id === id);
}

export function searchParts(query: string): RegistryPart[] {
  const q = query.toLowerCase();
  return ENGINEERING_REGISTRY.filter(p =>
    p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q)
  );
}

/** Compact summary for AI prompts — one line per part, grouped by category */
export function getRegistrySummary(): string {
  const lines: string[] = ['ENGINEERING PARTS REGISTRY — use these IDs to reference real parts with exact dimensions:'];
  const cats = [..._categoryIndex.entries()];
  for (const [cat, parts] of cats) {
    lines.push(`\n[${cat}]`);
    for (const p of parts) {
      const dimStr = Object.entries(p.dims).map(([k, v]) => `${k}=${v}`).join(', ');
      lines.push(`  ${p.id}: ${p.name} (${dimStr}) — ${p.desc}`);
    }
  }
  lines.push('\nTo use a part: include its OpenSCAD module() definition and call it with translate() in the assembly. Use EXACT dimensions from the registry.');
  return lines.join('\n');
}

/** Returns only the OpenSCAD module code for parts matching given IDs */
export function getScadModules(partIds: string[]): string {
  return partIds.map(id => {
    const p = getPartById(id);
    return p ? `// ${p.name}\n${p.scad}` : '';
  }).filter(Boolean).join('\n\n');
}

// ── DFM Rules Compendium ───────────────────────────────────────
export const DFM_RULES = {
  fdm: {
    min_wall: 1.2,
    min_hole_d: 2.0,
    bridge_max: 10,
    overhang_max: 45,
    layer_heights: [0.1, 0.16, 0.2, 0.28],
    shrinkage: 0.002,  // 0.2% linear
    clearance_fit: 0.3,
    press_fit: -0.2,
    snap_fit_undercut: 0.3,
    support_threshold_deg: 45,
    thread_min: 'M4 (below M4 use heat-set inserts)',
  },
  sla: {
    min_wall: 0.5,
    min_hole_d: 0.5,
    layer_heights: [0.025, 0.05, 0.1],
    shrinkage: 0.001,
    clearance_fit: 0.15,
  },
  laser: {
    min_slot: 1.0,
    kerf_typical: 0.2,
    tab_min_w: 3,
    finger_joint_min: 3,
    living_hinge_slit: 0.3,
    max_detail: 0.1,
  },
  pcb: {
    trace_min_mm: 0.15,
    via_min_mm: 0.3,
    clearance_min_mm: 0.15,
    drill_min_mm: 0.3,
    board_thickness: [0.8, 1.0, 1.6, 2.0],
  },
  tolerances: {
    M2: { clearance: 2.4, close: 2.2, press: 1.9 },
    M3: { clearance: 3.4, close: 3.15, press: 2.9 },
    M4: { clearance: 4.5, close: 4.2, press: 3.9 },
    M5: { clearance: 5.5, close: 5.2, press: 4.9 },
    M6: { clearance: 6.6, close: 6.2, press: 5.9 },
    M8: { clearance: 8.4, close: 8.2, press: 7.9 },
  }
};

/** Compact DFM rules string for AI prompts */
export function getDfmSummary(): string {
  const t = DFM_RULES.tolerances;
  return `DFM QUICK REFERENCE:
FDM: min_wall=${DFM_RULES.fdm.min_wall}mm, min_hole=${DFM_RULES.fdm.min_hole_d}mm, max_bridge=${DFM_RULES.fdm.bridge_max}mm, overhang<${DFM_RULES.fdm.overhang_max}°, clearance_fit=+${DFM_RULES.fdm.clearance_fit}mm, press_fit=${DFM_RULES.fdm.press_fit}mm
Laser: kerf=${DFM_RULES.laser.kerf_typical}mm, min_slot=${DFM_RULES.laser.min_slot}mm, finger_joint>=${DFM_RULES.laser.finger_joint_min}mm
Hole tolerances: M3_clear=${t.M3.clearance}mm, M4_clear=${t.M4.clearance}mm, M5_clear=${t.M5.clearance}mm
Heat-set inserts: M3 install hole=4.7mm, M4=6.3mm, M5=7.1mm`;
}
