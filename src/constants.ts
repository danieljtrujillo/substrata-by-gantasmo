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

export const PROJECT_TEMPLATES = [
  { id: 't1', name: 'Geometric Wolf', category: 'Animal', image: 'https://picsum.photos/seed/wolf/400/400' },
  { id: 't2', name: 'Mandala Pattern', category: 'Decor', image: 'https://picsum.photos/seed/mandala/400/400' },
  { id: 't3', name: 'Personalized Coaster', category: 'Home', image: 'https://picsum.photos/seed/coaster/400/400' },
  { id: 't4', name: 'Script Name Plate', category: 'Gift', image: 'https://picsum.photos/seed/name/400/400' },
  { id: 't5', name: 'Celtic Knot', category: 'Decor', image: 'https://picsum.photos/seed/celtic/400/400' },
  { id: 't6', name: 'Vintage Compass', category: 'Nautical', image: 'https://picsum.photos/seed/compass/400/400' },
  { id: 't7', name: 'Sakura Branch', category: 'Nature', image: 'https://picsum.photos/seed/sakura/400/400' },
  { id: 't8', name: 'Dragon Crest', category: 'Fantasy', image: 'https://picsum.photos/seed/dragon/400/400' },
  { id: 't9', name: 'Steampunk Gears', category: 'Mechanical', image: 'https://picsum.photos/seed/gears/400/400' },
  { id: 't10', name: 'Forest Silhouette', category: 'Nature', image: 'https://picsum.photos/seed/forest/400/400' },
];
