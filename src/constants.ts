export interface LaserSettings {
  engraved: boolean;
  power: number; // percentage
  speed: number; // mm/min
  passes: number;
  mode: 'M3' | 'M4';
  quality: number; // lines/mm
}

export const ACMER_S1_PARAMETERS: Record<string, LaserSettings> = {
  'Kraft paper': { engraved: true, power: 80, speed: 3000, passes: 1, mode: 'M4', quality: 10 },
  'Plywood': { engraved: true, power: 90, speed: 1500, passes: 1, mode: 'M4', quality: 10 },
  'Solid wood': { engraved: true, power: 90, speed: 1000, passes: 1, mode: 'M4', quality: 10 },
  'Bamboo': { engraved: true, power: 90, speed: 1000, passes: 1, mode: 'M4', quality: 10 },
  'Cork': { engraved: true, power: 90, speed: 1000, passes: 1, mode: 'M4', quality: 10 },
  'Leather': { engraved: true, power: 60, speed: 1500, passes: 1, mode: 'M4', quality: 10 },
  'Silica gel': { engraved: true, power: 80, speed: 1000, passes: 1, mode: 'M4', quality: 10 },
  'Dark Felt': { engraved: true, power: 60, speed: 1500, passes: 1, mode: 'M4', quality: 10 },
  'Tin plate': { engraved: true, power: 80, speed: 2500, passes: 1, mode: 'M4', quality: 10 },
};

export const ACMER_S1_MANUAL_SUMMARY = `
ACMER S1 User Manual V2.2
Maximum engraving area: 130x130mm
Laser: 2.5W fixed-focus diode, 445nm wavelength.
Focus: Uses a 2mm focal length measurement sheet. Red cover should touch the sheet.
Software: Supports LaserGRBL (Windows) and LightBurn (Mac/Windows).
Safety: Class 4 laser. Use goggles. Fire risk.
Recommended Parameters (2.5W Compressed Spot):
- Kraft paper: 80% power, 3000 mm/min, 1 pass, M4 mode.
- Plywood: 90% power, 1500 mm/min, 1 pass, M4 mode.
- Solid wood: 90% power, 1000 mm/min, 1 pass, M4 mode.
- Bamboo: 90% power, 1000 mm/min, 1 pass, M4 mode.
- Cork: 90% power, 1000 mm/min, 1 pass, M4 mode.
- Leather: 60% power, 1500 mm/min, 1 pass, M4 mode.
- Silica gel: 80% power, 1000 mm/min, 1 pass, M4 mode.
- Dark Felt: 60% power, 1500 mm/min, 1 pass, M4 mode.
- Tin plate: 80% power, 2500 mm/min, 1 pass, M4 mode.
`;

// ── Label Printer Configuration ────────────────────────────────
export interface LabelSettings {
  printerModel: string;
  labelWidth: number;  // mm
  labelHeight: number; // mm
  dpi: number;
  orientation: 'portrait' | 'landscape';
  copies: number;
  showCutLine: boolean; // edge silhouette outline for laser cutting
}

export const MUNBYN_ITPP130B = {
  name: 'Munbyn ITPP130B',
  type: 'Direct Thermal',
  maxPrintWidth: 108, // mm (4.25")
  minLabelWidth: 25,  // mm (~1")
  maxLabelWidth: 118, // mm (~4.65")
  dpi: 203,
  maxSpeed: 150,      // mm/s
  connectivity: 'USB',
  labelTypes: ['Shipping', 'Barcode', 'Address', 'Product', 'Custom Sticker', 'Decal'],
};

export const LABEL_SIZE_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  '4x6': { width: 101.6, height: 152.4, label: '4×6" Shipping' },
  '4x3': { width: 101.6, height: 76.2, label: '4×3" Product' },
  '2.25x1.25': { width: 57.15, height: 31.75, label: '2.25×1.25" Address' },
  '2x2': { width: 50.8, height: 50.8, label: '2×2" Square' },
  '3x2': { width: 76.2, height: 50.8, label: '3×2" Barcode' },
  '2.25x0.75': { width: 57.15, height: 19.05, label: '2.25×0.75" Slim' },
  'circle-2': { width: 50.8, height: 50.8, label: '2" Circle Sticker' },
  'circle-3': { width: 76.2, height: 76.2, label: '3" Circle Sticker' },
};

// ── Common 3D Printers Database ────────────────────────────────
export const PRINTER_DATABASE: Record<string, {
  name: string; type: string; buildVolume: string;
  layerHeight: string; nozzle: string; materials: string[];
  connectivity: string; price: string;
}> = {
  'Saturn 3 Ultra': {
    name: 'Elegoo Saturn 3 Ultra', type: 'MSLA Resin',
    buildVolume: '218.88×122.88×260mm', layerHeight: '0.01-0.2mm',
    nozzle: '10" 12K Mono LCD', materials: ['Standard Resin', 'ABS-Like Resin', 'Water Washable', 'Castable Wax'],
    connectivity: 'USB / Wi-Fi', price: '$299',
  },
  'Formbot T-Rex 2': {
    name: 'Formbot T-Rex 2+', type: 'FDM / IDEX',
    buildVolume: '400×400×500mm', layerHeight: '0.05-0.4mm',
    nozzle: 'Dual Independent 0.4mm', materials: ['PLA', 'PETG', 'ABS', 'TPU', 'Nylon', 'PC'],
    connectivity: 'USB / SD Card / Wi-Fi', price: '$799',
  },
  'Bambu Lab P1S': {
    name: 'Bambu Lab P1S', type: 'FDM / CoreXY',
    buildVolume: '256×256×256mm', layerHeight: '0.05-0.32mm',
    nozzle: '0.4mm hardened steel', materials: ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PA', 'PC'],
    connectivity: 'Wi-Fi / LAN / USB', price: '$699',
  },
  'Prusa MK4S': {
    name: 'Prusa MK4S', type: 'FDM / Bedslinger',
    buildVolume: '250×210×220mm', layerHeight: '0.05-0.3mm',
    nozzle: '0.4mm E3D Nextruder', materials: ['PLA', 'PETG', 'ASA', 'ABS', 'Flex'],
    connectivity: 'USB / Wi-Fi / Ethernet', price: '$799',
  },
  'Creality K1 Max': {
    name: 'Creality K1 Max', type: 'FDM / CoreXY',
    buildVolume: '300×300×300mm', layerHeight: '0.05-0.35mm',
    nozzle: '0.4mm all-metal', materials: ['PLA', 'PETG', 'ABS', 'Nylon', 'TPU'],
    connectivity: 'Wi-Fi / USB / LAN', price: '$599',
  },
};

// ── Common Laser Cutters/Engravers Database ────────────────────
export const LASER_DATABASE: Record<string, {
  name: string; type: string; workArea: string;
  power: string; wavelength: string; materials: string[];
  software: string; price: string;
}> = {
  'ACMER S1': {
    name: 'ACMER S1', type: 'Diode Laser Engraver',
    workArea: '130×130mm', power: '2.5W',
    wavelength: '445nm', materials: ['Wood', 'Leather', 'Paper', 'Cork', 'Felt', 'Bamboo', 'Tin'],
    software: 'LaserGRBL / LightBurn', price: '$89',
  },
  'xTool D1 Pro': {
    name: 'xTool D1 Pro 20W', type: 'Diode Laser',
    workArea: '432×406mm', power: '20W',
    wavelength: '455nm', materials: ['Wood', 'Acrylic', 'Leather', 'Metal (marking)', 'Glass', 'Stone'],
    software: 'xTool Creative Space / LightBurn', price: '$599',
  },
  'Glowforge Pro': {
    name: 'Glowforge Pro', type: 'CO2 Laser',
    workArea: '495×279mm', power: '45W',
    wavelength: '10600nm (CO2)', materials: ['Wood', 'Acrylic', 'Leather', 'Fabric', 'Paper', 'Coated Metal'],
    software: 'Glowforge App (Cloud)', price: '$6,995',
  },
  'OMTech 60W': {
    name: 'OMTech 60W CO2', type: 'CO2 Laser Cutter',
    workArea: '508×305mm', power: '60W',
    wavelength: '10600nm (CO2)', materials: ['Wood', 'Acrylic', 'MDF', 'Glass', 'Leather', 'Paper', 'Rubber'],
    software: 'LightBurn / RDWorks', price: '$2,299',
  },
  'Ortur LM3': {
    name: 'Ortur Laser Master 3', type: 'Diode Laser',
    workArea: '400×400mm', power: '10W',
    wavelength: '455nm', materials: ['Wood', 'Leather', 'Paper', 'Fabric', 'Acrylic (dark)'],
    software: 'LaserGRBL / LightBurn / LaserExplorer', price: '$349',
  },
};

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  image: string;
  description?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  openscadSnippet?: string;
  suggestedPrompt?: string;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  // ─── LASER ENGRAVING ──────────────────────────────────────
  { id: 'l01', name: 'Geometric Wolf', category: 'Laser / Animal', image: 'https://picsum.photos/seed/wolf-geo/400/400', description: 'Low-poly geometric wolf portrait. Clean vector lines, perfect for wood or leather.', complexity: 'beginner', tags: ['vector', 'animal', 'low-poly'], suggestedPrompt: 'geometric wolf portrait, low-poly wireframe style, sharp angles, clean vector lines' },
  { id: 'l02', name: 'Mandala Pattern', category: 'Laser / Decor', image: 'https://picsum.photos/seed/mandala-sym/400/400', description: 'Intricate radial mandala with concentric detail layers. Great for coasters or wall art.', complexity: 'intermediate', tags: ['mandala', 'symmetry', 'decorative'], suggestedPrompt: 'intricate mandala pattern, radial symmetry, fine line detail, concentric circles' },
  { id: 'l03', name: 'Personalized Coaster', category: 'Laser / Home', image: 'https://picsum.photos/seed/coaster-set/400/400', description: 'Round coaster with monogram initial and decorative border. Birch plywood friendly.', complexity: 'beginner', tags: ['coaster', 'monogram', 'gift'], suggestedPrompt: 'circular coaster design with ornamental border and monogram letter center' },
  { id: 'l04', name: 'Script Name Plate', category: 'Laser / Gift', image: 'https://picsum.photos/seed/nameplate-scr/400/400', description: 'Elegant cursive name plate for desk or door. Thin stroke calligraphy style.', complexity: 'beginner', tags: ['typography', 'nameplate', 'calligraphy'], suggestedPrompt: 'elegant script name plate, cursive calligraphy, flowing letters with flourishes' },
  { id: 'l05', name: 'Celtic Knot Panel', category: 'Laser / Decor', image: 'https://picsum.photos/seed/celtic-knot/400/400', description: 'Interlocked Celtic knotwork panel. Over-under weave pattern, deep engrave.', complexity: 'intermediate', tags: ['celtic', 'knotwork', 'medieval'], suggestedPrompt: 'celtic knot interlace pattern, continuous loops, over-under weave, square panel' },
  { id: 'l06', name: 'Vintage Compass Rose', category: 'Laser / Nautical', image: 'https://picsum.photos/seed/compass-nav/400/400', description: 'Classic nautical compass rose with cardinal points and decorative fleur-de-lis north marker.', complexity: 'intermediate', tags: ['nautical', 'compass', 'map'], suggestedPrompt: 'vintage compass rose with 32 points, nautical star, fleur-de-lis north indicator' },
  { id: 'l07', name: 'Sakura Branch', category: 'Laser / Nature', image: 'https://picsum.photos/seed/sakura-blossom/400/400', description: 'Cherry blossom branch with scattered petals. Delicate line art for light engrave.', complexity: 'beginner', tags: ['japanese', 'floral', 'cherry-blossom'], suggestedPrompt: 'cherry blossom branch, scattered sakura petals, delicate line art, japanese style' },
  { id: 'l08', name: 'Dragon Crest Shield', category: 'Laser / Fantasy', image: 'https://picsum.photos/seed/dragon-crest/400/400', description: 'Heraldic shield with dragon motif, crossed swords, and banner scroll.', complexity: 'advanced', tags: ['heraldic', 'dragon', 'shield'], suggestedPrompt: 'heraldic shield with dragon, crossed swords, banner, intricate border detail' },
  { id: 'l09', name: 'Steampunk Gearwork', category: 'Laser / Mechanical', image: 'https://picsum.photos/seed/steampunk-gears/400/400', description: 'Interlocking gear cluster with rivets, pipes, and Victorian mechanical aesthetic.', complexity: 'advanced', tags: ['steampunk', 'gears', 'victorian'], suggestedPrompt: 'steampunk gear cluster, interlocking cogs, rivets, brass pipes, victorian mechanical' },
  { id: 'l10', name: 'Forest Treeline', category: 'Laser / Nature', image: 'https://picsum.photos/seed/forest-tree/400/400', description: 'Layered forest silhouette with depth perspective. Pine treeline with mountains.', complexity: 'beginner', tags: ['nature', 'forest', 'silhouette'], suggestedPrompt: 'layered forest silhouette, pine treeline, mountains in background, depth layers' },
  { id: 'l11', name: 'Topographic Map', category: 'Laser / Map', image: 'https://picsum.photos/seed/topo-map/400/400', description: 'Contour-line topographic map of a mountain range. Multi-pass depth engrave.', complexity: 'intermediate', tags: ['topographic', 'contour', 'map'], suggestedPrompt: 'topographic contour map, elevation lines, mountain terrain, clean cartographic style' },
  { id: 'l12', name: 'Art Deco Frame', category: 'Laser / Art', image: 'https://picsum.photos/seed/artdeco-frame/400/400', description: 'Geometric Art Deco decorative frame with sunburst and chevron patterns.', complexity: 'intermediate', tags: ['art-deco', 'frame', 'geometric'], suggestedPrompt: 'art deco frame, sunburst rays, chevron patterns, 1920s geometric ornamental' },
  { id: 'l13', name: 'QR Code Keychain', category: 'Laser / Functional', image: 'https://picsum.photos/seed/qr-keychain/400/400', description: 'Custom QR code keychain tag. Functional + decorative. Acrylic or MDF.', complexity: 'beginner', tags: ['qr-code', 'keychain', 'functional'], suggestedPrompt: 'QR code design embedded in decorative keychain tag shape, rounded corners' },
  { id: 'l14', name: 'Constellation Map', category: 'Laser / Space', image: 'https://picsum.photos/seed/stars-const/400/400', description: 'Star constellation chart (Orion, Ursa Major). Connect-the-dot star patterns.', complexity: 'beginner', tags: ['space', 'constellation', 'stars'], suggestedPrompt: 'star constellation chart with connected stars, Orion and Ursa Major, dot-line style' },
  { id: 'l15', name: 'Honeycomb Trivet', category: 'Laser / Home', image: 'https://picsum.photos/seed/honeycomb-trv/400/400', description: 'Hexagonal honeycomb pattern pot trivet. Cut-through design for heat dissipation.', complexity: 'beginner', tags: ['honeycomb', 'kitchen', 'hexagon'], suggestedPrompt: 'hexagonal honeycomb pattern trivet, geometric cut-through, kitchen accessory' },
  { id: 'l16', name: 'Skull & Roses', category: 'Laser / Art', image: 'https://picsum.photos/seed/skull-roses/400/400', description: 'Detailed skull with rose vine wreath. Line art tattoo style on dark material.', complexity: 'advanced', tags: ['skull', 'roses', 'tattoo-style'], suggestedPrompt: 'detailed skull with roses vine wreath, tattoo line art style, fine detail' },
  { id: 'l17', name: 'Puzzle Box Lid', category: 'Laser / Game', image: 'https://picsum.photos/seed/puzzle-box/400/400', description: 'Interlocking puzzle piece pattern for box lid. Cut + engrave combo on plywood.', complexity: 'intermediate', tags: ['puzzle', 'box', 'interlocking'], suggestedPrompt: 'interlocking jigsaw puzzle piece pattern, box lid design, cut-through lines' },
  { id: 'l18', name: 'Koi Fish Pond', category: 'Laser / Animal', image: 'https://picsum.photos/seed/koi-fish/400/400', description: 'Japanese koi fish swimming in circular pond. Waves, lily pads, flowing fins.', complexity: 'advanced', tags: ['koi', 'japanese', 'pond'], suggestedPrompt: 'japanese koi fish in circular pond, flowing fins, lily pads, wave patterns' },
  { id: 'l19', name: 'Geometric Mountain', category: 'Laser / Nature', image: 'https://picsum.photos/seed/geo-mountain/400/400', description: 'Mountain landscape in geometric faceted style with sun, trees, and river.', complexity: 'intermediate', tags: ['mountain', 'geometric', 'landscape'], suggestedPrompt: 'geometric faceted mountain landscape, low-poly sun, pine trees, river, clean vectors' },
  { id: 'l20', name: 'Circuit Board', category: 'Laser / Tech', image: 'https://picsum.photos/seed/circuit-pcb/400/400', description: 'PCB trace pattern for decorative engraving. Chips, traces, vias, and solder pads.', complexity: 'intermediate', tags: ['circuit', 'pcb', 'tech'], suggestedPrompt: 'circuit board PCB trace pattern, IC chips, solder pads, vias, electronic schematic art' },

  // ─── 3D PRINTING / PROTOTYPING ─────────────────────────────
  { id: 'p01', name: 'Hexapod Walker', category: '3D Print / Robotics', image: 'https://picsum.photos/seed/hexapod-bot/400/400', description: '6-legged walking robot. 18 servos, inverse kinematics gait control. Terrain traversal platform.', complexity: 'advanced', tags: ['robot', 'hexapod', 'servo'], suggestedPrompt: 'design a 6-legged hexapod walking robot with 3 DOF per leg, ESP32 controller, and PCA9685 servo driver',
    openscadSnippet: '// Hexapod body plate\nmodule body_plate() {\n  difference() {\n    hull() {\n      for(a=[0:60:300]) translate([cos(a)*40,sin(a)*40,0]) cylinder(r=12,h=3,$fn=6);\n    }\n    for(a=[0:60:300]) translate([cos(a)*40,sin(a)*40,0]) cylinder(r=2,h=10,$fn=20,center=true);\n  }\n}\nbody_plate();' },
  { id: 'p02', name: 'Quadruped Robot Dog', category: '3D Print / Robotics', image: 'https://picsum.photos/seed/spot-micro/400/400', description: 'Spot Micro-style robot dog. 12 servos, dynamic walking & trotting. Camera-equipped.', complexity: 'advanced', tags: ['robot', 'quadruped', 'dog'], suggestedPrompt: 'design a Spot Micro quadruped robot dog with 12 servos, Raspberry Pi brain, camera module',
    openscadSnippet: '// Quadruped body shell\nmodule body() {\n  difference() {\n    cube([120,60,30],center=true);\n    translate([0,0,3]) cube([114,54,28],center=true);\n  }\n}\nbody();' },
  { id: 'p03', name: '6-DOF Robotic Arm', category: '3D Print / Robotics', image: 'https://picsum.photos/seed/robot-arm6/400/400', description: 'Desktop 6-axis robotic arm. Pick-and-place, drawing, light assembly. Joystick control.', complexity: 'intermediate', tags: ['robot', 'arm', '6dof'], suggestedPrompt: 'design a 6-DOF desktop robotic arm with gripper, MG996R servos, Arduino Mega controller',
    openscadSnippet: '// Robotic arm base turntable\nmodule base() {\n  difference() {\n    cylinder(r=40,h=15,$fn=60);\n    translate([0,0,3]) cylinder(r=35,h=15,$fn=60);\n    cylinder(r=5,h=20,$fn=30,center=true);\n  }\n}\nbase();' },
  { id: 'p04', name: 'Wheeled Rover', category: '3D Print / Robotics', image: 'https://picsum.photos/seed/rover4x4/400/400', description: '4WD autonomous rover with ultrasonic obstacle avoidance. Expandable sensor platform.', complexity: 'beginner', tags: ['robot', 'rover', '4wd'], suggestedPrompt: 'design a 4WD wheeled rover with HC-SR04 sensors, L298N motor driver, ESP32 controller',
    openscadSnippet: '// Rover chassis\nmodule chassis() {\n  difference() {\n    cube([100,70,8],center=true);\n    for(x=[-35,35]) for(y=[-25,25]) translate([x,y,0]) cylinder(r=3,h=10,$fn=20,center=true);\n  }\n}\nchassis();' },
  { id: 'p05', name: 'Voronoi Table Lamp', category: '3D Print / Art', image: 'https://picsum.photos/seed/voronoi-lamp/400/400', description: 'Organic voronoi-pattern lampshade with warm LED glow. Vase-mode print, stunning light diffusion.', complexity: 'beginner', tags: ['lamp', 'voronoi', 'art'], suggestedPrompt: 'design a voronoi pattern table lamp shade with LED strip base, USB-C powered',
    openscadSnippet: '// Voronoi lamp base\nmodule lamp_base() {\n  difference() {\n    cylinder(r=30,h=15,$fn=60);\n    translate([0,0,3]) cylinder(r=27,h=15,$fn=60);\n    cylinder(r=4,h=20,$fn=30,center=true);\n  }\n}\nlamp_base();' },
  { id: 'p06', name: 'Kinetic Wave Sculpture', category: '3D Print / Mechanical', image: 'https://picsum.photos/seed/kinetic-wave/400/400', description: 'Cam-driven wave sculpture with 24 rods creating sinusoidal motion. Single motor, mesmerizing.', complexity: 'intermediate', tags: ['kinetic', 'cam', 'sculpture'], suggestedPrompt: 'design a cam-driven kinetic wave sculpture with 24 rods, NEMA 17 stepper motor, timing belt drive',
    openscadSnippet: '// Cam disc (phase offset)\nmodule cam(phase) {\n  difference() {\n    cylinder(r=15,h=5,$fn=40);\n    translate([5*cos(phase),5*sin(phase),0]) cylinder(r=2,h=10,$fn=20,center=true);\n  }\n}\nfor(i=[0:23]) translate([i*8,0,0]) cam(i*15);' },
  { id: 'p07', name: 'Exposed Gear Clock', category: '3D Print / Mechanical', image: 'https://picsum.photos/seed/gear-clock/400/400', description: 'Wall-mounted clock with all gears visible. Quartz movement with decorative gear train.', complexity: 'intermediate', tags: ['clock', 'gears', 'mechanical'], suggestedPrompt: 'design an exposed gear clock with visible gear train, wall mount, quartz movement' },
  { id: 'p08', name: 'Smart LED Doorknob', category: '3D Print / IoT', image: 'https://picsum.photos/seed/smart-knob/400/400', description: 'Doorknob with NeoPixel ring and capacitive touch. Color-changing lock state indicator.', complexity: 'intermediate', tags: ['iot', 'led', 'smart-home'], suggestedPrompt: 'design a smart doorknob with WS2812B LED ring, ESP32-C3, capacitive touch sensor' },
  { id: 'p09', name: 'IoT Weather Station', category: '3D Print / IoT', image: 'https://picsum.photos/seed/weather-iot/400/400', description: 'Solar-powered outdoor station. Temp, humidity, pressure, wind speed. WiFi dashboard.', complexity: 'intermediate', tags: ['iot', 'weather', 'solar'], suggestedPrompt: 'design a solar-powered weather station with BME280, anemometer, ESP32, OLED display' },
  { id: 'p10', name: 'Macro Keypad', category: '3D Print / Electronics', image: 'https://picsum.photos/seed/macro-keys/400/400', description: '9-key mechanical macro pad with rotary encoder, OLED, per-key RGB. QMK firmware.', complexity: 'beginner', tags: ['keyboard', 'macro', 'mechanical'], suggestedPrompt: 'design a 3x3 macro keypad with Cherry MX switches, rotary encoder, OLED display, Arduino Pro Micro',
    openscadSnippet: '// Keypad case body\nmodule case_body() {\n  difference() {\n    cube([76,76,12]);\n    translate([3,3,3]) cube([70,70,12]);\n    // switch holes\n    for(x=[0:2]) for(y=[0:2]) translate([14+x*24,14+y*24,0]) cube([14,14,5]);\n  }\n}\ncase_body();' },
  { id: 'p11', name: 'FPV Racing Drone', category: '3D Print / Robotics', image: 'https://picsum.photos/seed/fpv-drone/400/400', description: '5" racing drone frame with TPU bumpers. Carbon fiber arms, 3D-printed camera mount.', complexity: 'advanced', tags: ['drone', 'fpv', 'racing'], suggestedPrompt: 'design an FPV racing drone frame for 5-inch props, carbon fiber arms, TPU bumpers, F4 flight controller' },
  { id: 'p12', name: 'Smart Plant Monitor', category: '3D Print / IoT', image: 'https://picsum.photos/seed/plant-sensor/400/400', description: 'Auto-watering plant monitor. Soil moisture + light + temp sensors. OLED + mobile alerts.', complexity: 'beginner', tags: ['iot', 'plant', 'automation'], suggestedPrompt: 'design a smart plant monitor with soil moisture sensor, auto-watering pump, ESP32, OLED display' },
  { id: 'p13', name: 'Phone Charging Dock', category: '3D Print / Home', image: 'https://picsum.photos/seed/phone-dock/400/400', description: 'Desktop phone stand with wireless Qi charging coil and cable management. Clean lines.', complexity: 'beginner', tags: ['phone', 'charger', 'desk'], suggestedPrompt: 'design a phone charging dock with Qi wireless coil mount, cable channel, desk organizer',
    openscadSnippet: '// Phone dock\nmodule dock() {\n  difference() {\n    hull() {\n      cube([80,40,5]);\n      translate([10,0,60]) cube([60,15,5]);\n    }\n    translate([15,5,3]) cube([50,30,60]);\n  }\n}\ndock();' },
  { id: 'p14', name: 'Articulated Dragon', category: '3D Print / Art', image: 'https://picsum.photos/seed/flexi-dragon/400/400', description: 'Print-in-place articulated dragon. Ball-joint spine, movable wings and jaw.', complexity: 'intermediate', tags: ['articulated', 'dragon', 'print-in-place'], suggestedPrompt: 'design a print-in-place articulated dragon with ball-joint spine segments, moveable wings' },
  { id: 'p15', name: 'Lithophane Lamp', category: '3D Print / Art', image: 'https://picsum.photos/seed/lithophane/400/400', description: 'Photo lithophane light box. 3D-prints a photo that reveals detail when backlit.', complexity: 'beginner', tags: ['lithophane', 'photo', 'light'], suggestedPrompt: 'design a cylindrical lithophane lamp housing with LED strip mount and USB power base' },
  { id: 'p16', name: 'Ender 3 Upgrades Kit', category: '3D Print / Upgrades', image: 'https://picsum.photos/seed/ender3-mods/400/400', description: 'Essential Ender 3 upgrades: fan duct, filament guide, cable chain, tool holder, LCD cover.', complexity: 'beginner', tags: ['ender3', 'upgrades', '3d-printer'], suggestedPrompt: 'design Ender 3 upgrade parts: Satsana fan duct, filament guide, cable chain, tool holder' },
  { id: 'p17', name: 'Planetary Gear Set', category: '3D Print / Mechanical', image: 'https://picsum.photos/seed/planetary-gear/400/400', description: 'Epicyclic planetary gear set. Sun + planet + ring gear. Functional mechanical demo.', complexity: 'intermediate', tags: ['gears', 'planetary', 'mechanism'], suggestedPrompt: 'design a planetary gear set with sun gear, 3 planet gears, ring gear, and carrier plate',
    openscadSnippet: '// Sun gear (simplified)\nmodule sun_gear() {\n  difference() {\n    cylinder(r=15,h=8,$fn=40);\n    cylinder(r=3,h=10,$fn=20,center=true);\n    for(i=[0:11]) rotate([0,0,i*30]) translate([15,0,0]) cylinder(r=3,h=10,$fn=6,center=true);\n  }\n}\nsun_gear();' },
  { id: 'p18', name: 'Cable Organizer Set', category: '3D Print / Home', image: 'https://picsum.photos/seed/cable-clips/400/400', description: 'Desk cable management clips, hub, and under-desk tray. Quick-snap design.', complexity: 'beginner', tags: ['cable', 'desk', 'organizer'], suggestedPrompt: 'design a desk cable management set: adhesive clips, multi-cable hub, under-desk tray' },
  { id: 'p19', name: 'Headphone Stand', category: '3D Print / Home', image: 'https://picsum.photos/seed/headphone-std/400/400', description: 'Minimalist headphone stand with cable wrap and small tray for earbuds.', complexity: 'beginner', tags: ['headphone', 'stand', 'desk'], suggestedPrompt: 'design a minimalist headphone stand with wide base, cable wrap slot, and earbud tray' },
  { id: 'p20', name: 'RC Tank Chassis', category: '3D Print / Robotics', image: 'https://picsum.photos/seed/rc-tank/400/400', description: 'Tracked tank chassis with dual N20 motors. Modular turret mount. FPV-capable.', complexity: 'intermediate', tags: ['rc', 'tank', 'tracked'], suggestedPrompt: 'design an RC tracked tank chassis with dual N20 gear motors, track links, turret mount',
    openscadSnippet: '// Tank hull\nmodule hull() {\n  difference() {\n    cube([120,60,25],center=true);\n    translate([0,0,4]) cube([110,50,22],center=true);\n    // turret ring\n    translate([15,0,12]) cylinder(r=18,h=5,$fn=40);\n  }\n}\nhull();' },

  // ─── ELECTRONICS / IoT ─────────────────────────────────────
  { id: 'e01', name: 'ESP32 Dev Board Case', category: 'Electronics / Enclosure', image: 'https://picsum.photos/seed/esp32-case/400/400', description: 'Snap-fit case for ESP32 devkit with button and USB access cutouts.', complexity: 'beginner', tags: ['esp32', 'case', 'enclosure'], suggestedPrompt: 'design a snap-fit case for ESP32-WROOM devkit with USB-C cutout and button access' },
  { id: 'e02', name: 'LED Matrix Display', category: 'Electronics / Display', image: 'https://picsum.photos/seed/led-matrix/400/400', description: '8x32 WS2812B LED matrix with scrolling text and pixel art. WiFi controlled.', complexity: 'intermediate', tags: ['led', 'matrix', 'display'], suggestedPrompt: 'design a WiFi LED matrix display with 8x32 WS2812B grid, ESP32 controller, web interface' },
  { id: 'e03', name: 'Midi Controller', category: 'Electronics / Music', image: 'https://picsum.photos/seed/midi-ctrl/400/400', description: '16-pad MIDI controller with velocity-sensitive pads, faders, and USB-MIDI.', complexity: 'intermediate', tags: ['midi', 'music', 'controller'], suggestedPrompt: 'design a 16-pad MIDI controller with velocity pads, 4 slide potentiometers, Arduino Pro Micro USB-MIDI' },
  { id: 'e04', name: 'Neon Sign (LED)', category: 'Electronics / Art', image: 'https://picsum.photos/seed/neon-led/400/400', description: 'Faux neon sign using flexible LED strips in 3D-printed channels. Wall-mount.', complexity: 'beginner', tags: ['neon', 'led', 'sign'], suggestedPrompt: 'design a faux neon sign with flexible LED strips in 3D-printed diffuser channels, wall mount bracket' },
  { id: 'e05', name: 'Retro Game Console', category: 'Electronics / Gaming', image: 'https://picsum.photos/seed/retro-console/400/400', description: 'Raspberry Pi retro gaming console with custom case, buttons, and ILI9341 display.', complexity: 'intermediate', tags: ['retro', 'gaming', 'raspberry-pi'], suggestedPrompt: 'design a handheld retro game console with Raspberry Pi Zero, ILI9341 display, 6 buttons, speaker' },

  // ─── ARCHITECTURE / FURNITURE ──────────────────────────────
  { id: 'a01', name: 'Parametric Shelf', category: 'Furniture / Home', image: 'https://picsum.photos/seed/para-shelf/400/400', description: 'Wavy parametric wall shelf. CNC or laser-cut slotting plywood construction.', complexity: 'intermediate', tags: ['parametric', 'shelf', 'cnc'], suggestedPrompt: 'design a wavy parametric wall shelf with interlocking slot joints, laser-cut plywood' },
  { id: 'a02', name: 'Tiny House Model', category: 'Architecture / Model', image: 'https://picsum.photos/seed/tiny-house/400/400', description: 'Scale model tiny house with removable roof, interior detail, and solar panel roof.', complexity: 'intermediate', tags: ['architecture', 'model', 'tiny-house'], suggestedPrompt: 'design a 1:50 scale tiny house model with removable roof, loft bed, kitchen, solar panels',
    openscadSnippet: '// Tiny house walls\nmodule walls() {\n  difference() {\n    cube([60,40,35]);\n    translate([2,2,2]) cube([56,36,35]);\n    // windows\n    translate([-1,10,15]) cube([4,12,10]);\n    translate([57,10,15]) cube([4,12,10]);\n    // door\n    translate([25,-1,0]) cube([12,4,22]);\n  }\n}\nwalls();' },
  { id: 'a03', name: 'Modular Desk Organizer', category: 'Furniture / Desk', image: 'https://picsum.photos/seed/desk-org/400/400', description: 'Stackable modular desk organizer with pen cup, card holder, phone stand, tray.', complexity: 'beginner', tags: ['desk', 'organizer', 'modular'], suggestedPrompt: 'design a modular stackable desk organizer set: pen cup, business card holder, phone stand, tray' },
  { id: 'a04', name: 'Dovetail Joint Box', category: 'Furniture / Woodworking', image: 'https://picsum.photos/seed/dovetail/400/400', description: 'Classic dovetail joint jewelry box. Laser-cut finger joints with living hinge lid.', complexity: 'intermediate', tags: ['dovetail', 'box', 'woodworking'], suggestedPrompt: 'design a dovetail joint jewelry box with living hinge lid, laser-cut from 3mm plywood' },

  // ─── WEARABLE / FASHION ────────────────────────────────────
  { id: 'w01', name: 'LED Glasses', category: 'Wearable / Fashion', image: 'https://picsum.photos/seed/led-glasses/400/400', description: 'Programmable LED glasses with WS2812B strips. Sound-reactive patterns.', complexity: 'intermediate', tags: ['wearable', 'led', 'glasses'], suggestedPrompt: 'design LED glasses with WS2812B strips, MSGEQ7 sound sensor, ATtiny85 controller, coin cell battery' },
  { id: 'w02', name: 'Cosplay Helmet', category: 'Wearable / Cosplay', image: 'https://picsum.photos/seed/cosplay-helm/400/400', description: 'Sci-fi helmet with LED visor, speaker, and motorized face plate. Resin + PLA combo.', complexity: 'advanced', tags: ['cosplay', 'helmet', 'prop'], suggestedPrompt: 'design a sci-fi cosplay helmet with LED visor strip, mini speaker, servo-actuated face plate' },
  { id: 'w03', name: 'Watch Stand', category: 'Wearable / Accessories', image: 'https://picsum.photos/seed/watch-stand/400/400', description: 'Minimalist watch display stand with felt-lined cradle. Desktop nightstand piece.', complexity: 'beginner', tags: ['watch', 'stand', 'display'], suggestedPrompt: 'design a minimalist watch display stand with curved cradle, weighted base, felt lining slot' },

  // ─── AUTOMOTIVE / VEHICLE ──────────────────────────────────
  { id: 'v01', name: 'Car Phone Mount', category: 'Vehicle / Accessory', image: 'https://picsum.photos/seed/car-mount/400/400', description: 'Vent-clip phone mount with adjustable ball joint. Spring-loaded side grips.', complexity: 'beginner', tags: ['car', 'phone', 'mount'], suggestedPrompt: 'design a car vent-clip phone mount with ball joint, spring-loaded side grips, one-hand operation' },
  { id: 'v02', name: 'Dashboard Gauge Pod', category: 'Vehicle / Custom', image: 'https://picsum.photos/seed/gauge-pod/400/400', description: 'Custom 52mm gauge pod for dashboard. Fits OBD2 gauges, clean install.', complexity: 'intermediate', tags: ['car', 'gauge', 'dashboard'], suggestedPrompt: 'design a triple 52mm gauge pod with snap-fit mounting, cable routing, dashboard clip' },

  // ─── SCIENCE / EDUCATION ───────────────────────────────────
  { id: 's01', name: 'Solar System Orrery', category: 'Science / Education', image: 'https://picsum.photos/seed/orrery-solar/400/400', description: 'Mechanical orrery showing inner planets orbiting the sun. Gear-driven, hand-crank.', complexity: 'advanced', tags: ['orrery', 'solar-system', 'mechanical'], suggestedPrompt: 'design a mechanical orrery with Sun + 4 inner planets, gear train drive, hand crank, 3D printed gears',
    openscadSnippet: '// Orrery sun mount\nmodule sun_mount() {\n  cylinder(r=20,h=5,$fn=40);\n  translate([0,0,5]) sphere(r=12,$fn=30);\n  cylinder(r=3,h=40,$fn=20);\n}\nsun_mount();' },
  { id: 's02', name: 'Microscope Adapter', category: 'Science / Lab', image: 'https://picsum.photos/seed/micro-adapt/400/400', description: 'Smartphone microscope adapter for USB microscope or eyepiece. Lab or classroom use.', complexity: 'beginner', tags: ['microscope', 'adapter', 'science'], suggestedPrompt: 'design a smartphone microscope adapter that clips to USB microscope eyepiece tube' },
  { id: 's03', name: 'DNA Helix Model', category: 'Science / Education', image: 'https://picsum.photos/seed/dna-helix/400/400', description: 'Double helix DNA model with base pair colors. Snap-together segments for teaching.', complexity: 'intermediate', tags: ['dna', 'biology', 'model'], suggestedPrompt: 'design a snap-together DNA double helix model with color-coded base pair segments' },

  // ─── OUTDOOR / CAMPING ─────────────────────────────────────
  { id: 'o01', name: 'Camp Lantern', category: 'Outdoor / Camping', image: 'https://picsum.photos/seed/camp-lantern/400/400', description: 'Collapsible LED camp lantern with solar panel top, USB recharge, diffuser shade.', complexity: 'beginner', tags: ['camping', 'lantern', 'solar'], suggestedPrompt: 'design a collapsible LED camping lantern with solar panel lid, 18650 battery, USB-C charge' },
  { id: 'o02', name: 'Bike Phone Mount', category: 'Outdoor / Cycling', image: 'https://picsum.photos/seed/bike-mount/400/400', description: 'Quick-release handlebar phone mount with vibration dampening. TPU flex joints.', complexity: 'beginner', tags: ['bike', 'phone', 'mount'], suggestedPrompt: 'design a handlebar phone mount with quick-release, TPU vibration damper, universal fit' },
  { id: 'o03', name: 'Pocket Multitool', category: 'Outdoor / Tools', image: 'https://picsum.photos/seed/multitool/400/400', description: 'Credit-card sized multitool: bottle opener, hex wrenches, ruler, scraper. Laser-cut steel.', complexity: 'intermediate', tags: ['multitool', 'edc', 'laser-cut'], suggestedPrompt: 'design a credit-card multitool with bottle opener, hex wrenches, ruler, screwdriver, laser-cut steel' },

  // ─── BLEEDING EDGE / ADVANCED ──────────────────────────────
  { id: 'x01', name: 'Lidar SLAM Robot', category: 'Advanced / Robotics', image: 'https://picsum.photos/seed/lidar-slam/400/400', description: 'Autonomous mapping robot with RPLidar A1, ROS2, SLAM navigation. Jetson Nano brain.', complexity: 'advanced', tags: ['lidar', 'slam', 'ros2', 'autonomous'], suggestedPrompt: 'design a SLAM navigation robot with RPLidar A1, Jetson Nano, differential drive, ROS2 stack' },
  { id: 'x02', name: 'CNC Pen Plotter', category: 'Advanced / CNC', image: 'https://picsum.photos/seed/pen-plotter/400/400', description: 'CoreXY pen plotter/laser engraver. GRBL firmware, 300x300mm work area.', complexity: 'advanced', tags: ['cnc', 'plotter', 'corexy'], suggestedPrompt: 'design a CoreXY pen plotter with 300x300mm work area, NEMA 17 steppers, GRBL controller, pen lift servo' },
  { id: 'x03', name: 'Stewart Platform', category: 'Advanced / Mechanical', image: 'https://picsum.photos/seed/stewart-plat/400/400', description: '6-DOF Stewart/hexapod platform. Motion simulator base. 6 linear actuators.', complexity: 'advanced', tags: ['stewart', 'hexapod', '6dof', 'simulator'], suggestedPrompt: 'design a 6-DOF Stewart platform with 6 linear actuators, ball joints, Arduino controller',
    openscadSnippet: '// Stewart platform base\nmodule base_plate() {\n  difference() {\n    cylinder(r=80,h=5,$fn=6);\n    for(a=[0:60:300]) translate([cos(a)*65,sin(a)*65,0]) cylinder(r=4,h=10,$fn=20,center=true);\n  }\n}\nbase_plate();' },
  { id: 'x04', name: 'Delta 3D Printer', category: 'Advanced / CNC', image: 'https://picsum.photos/seed/delta-3dp/400/400', description: 'DIY delta-style 3D printer with linear rails. Fast, tall build volume. Klipper firmware.', complexity: 'advanced', tags: ['3d-printer', 'delta', 'diy'], suggestedPrompt: 'design a delta 3D printer with linear rails, 32-bit board, Klipper firmware, 220mm round bed' },
  { id: 'x05', name: 'Open Source Prosthetic Hand', category: 'Advanced / Biomedical', image: 'https://picsum.photos/seed/prosthetic-hand/400/400', description: 'e-NABLE style prosthetic hand with tendon-driven fingers. Body-powered or servo-actuated.', complexity: 'advanced', tags: ['prosthetic', 'biomedical', 'open-source'], suggestedPrompt: 'design an open-source prosthetic hand with tendon-driven fingers, adjustable wrist, TPU pads' },
  { id: 'x06', name: 'Reaction Wheel Cube', category: 'Advanced / Controls', image: 'https://picsum.photos/seed/reaction-cube/400/400', description: 'Self-balancing cube using reaction wheels. 3-axis IMU + brushless motors. Controls demo.', complexity: 'advanced', tags: ['reaction-wheel', 'balancing', 'controls'], suggestedPrompt: 'design a self-balancing reaction wheel cube with 3 brushless motors, MPU6050 IMU, ESP32 PID controller',
    openscadSnippet: '// Reaction wheel cube frame\nmodule cube_frame(size=60,wall=3) {\n  difference() {\n    cube(size,center=true);\n    cube(size-wall*2,center=true);\n    // motor holes on 3 faces\n    for(r=[[0,0,0],[90,0,0],[0,90,0]]) rotate(r) cylinder(r=12,h=size+2,$fn=30,center=true);\n  }\n}\ncube_frame();' },
  { id: 'x07', name: 'Pick-and-Place Machine', category: 'Advanced / Manufacturing', image: 'https://picsum.photos/seed/pnp-machine/400/400', description: 'OpenPnP-compatible pick-and-place for SMD assembly. Camera vision, vacuum nozzle.', complexity: 'advanced', tags: ['pick-place', 'smd', 'manufacturing'], suggestedPrompt: 'design a desktop pick-and-place machine with camera vision, vacuum nozzle, OpenPnP firmware' },
  { id: 'x08', name: 'Drone Delivery Pod', category: 'Advanced / Aerial', image: 'https://picsum.photos/seed/delivery-drone/400/400', description: 'Payload delivery pod for quadcopter. Servo-actuated drop mechanism with GPS guidance.', complexity: 'advanced', tags: ['drone', 'delivery', 'payload'], suggestedPrompt: 'design a drone delivery pod with servo-actuated release, GPS module, 500g payload capacity' },
];
