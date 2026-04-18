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
