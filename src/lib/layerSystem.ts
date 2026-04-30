// CAD layer management — AIA/ISO-16739 layer naming conventions
// Used to organise 3D primitives by discipline, enable hide/show,
// and produce DXF-compatible layer metadata.

export type LayerCategory = 'architectural' | 'structural' | 'mep' | 'site' | 'annotation' | 'general';

export interface Layer {
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  lineweightMm: number;
  linetype: 'continuous' | 'dashed' | 'dotted' | 'dashdot';
  description: string;
  category: LayerCategory;
  printable: boolean;
}

// ── AIA/NCS-compliant layer presets ─────────────────────────────────────────
// Format: <Discipline>-<Major Group>[-<Minor Group>]
// Discipline codes: A=Architectural, S=Structural, M=Mechanical(HVAC), P=Plumbing,
//   E=Electrical, C=Civil/Site, G=General, I=Interiors, L=Landscape

export const ARCHITECTURAL_LAYERS: Layer[] = [
  // ── Architectural
  { name: 'A-WALL',      color: '#e8e8e8', visible: true,  locked: false, lineweightMm: 0.50, linetype: 'continuous', description: 'Walls (full height)',          category: 'architectural', printable: true },
  { name: 'A-WALL-PRHT', color: '#a0a0a0', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Walls (partial height)',        category: 'architectural', printable: true },
  { name: 'A-DOOR',      color: '#87ceeb', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Doors',                          category: 'architectural', printable: true },
  { name: 'A-DOOR-SWNG', color: '#add8e6', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Door swing arcs',               category: 'architectural', printable: true },
  { name: 'A-WIND',      color: '#87ceeb', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Windows and glazing',            category: 'architectural', printable: true },
  { name: 'A-FLOR',      color: '#c8a96e', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Floor finish patterns',          category: 'architectural', printable: true },
  { name: 'A-FLOR-EVTR', color: '#deb887', visible: true,  locked: false, lineweightMm: 0.35, linetype: 'continuous', description: 'Elevator/shaft openings',        category: 'architectural', printable: true },
  { name: 'A-ROOF',      color: '#808080', visible: true,  locked: false, lineweightMm: 0.35, linetype: 'continuous', description: 'Roof outline',                   category: 'architectural', printable: true },
  { name: 'A-CEIL',      color: '#b0b0b0', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'dashed',     description: 'Ceiling elements (in plan)',    category: 'architectural', printable: true },
  { name: 'A-STAIR',     color: '#ffa500', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Stairs and ramps',              category: 'architectural', printable: true },
  { name: 'A-FURN',      color: '#8fbc8f', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Furniture',                      category: 'architectural', printable: true },
  { name: 'A-EQPM',      color: '#dda0dd', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Architectural equipment',        category: 'architectural', printable: true },
  { name: 'A-COLS',      color: '#ffffff', visible: true,  locked: false, lineweightMm: 0.50, linetype: 'continuous', description: 'Architectural column fills',     category: 'architectural', printable: true },
  // ── Structural
  { name: 'S-COLS',      color: '#ff4444', visible: true,  locked: false, lineweightMm: 0.50, linetype: 'continuous', description: 'Structural columns',            category: 'structural',    printable: true },
  { name: 'S-BEAM',      color: '#cc2222', visible: true,  locked: false, lineweightMm: 0.35, linetype: 'continuous', description: 'Structural beams / lintels',    category: 'structural',    printable: true },
  { name: 'S-FNDN',      color: '#8b4513', visible: true,  locked: false, lineweightMm: 0.50, linetype: 'continuous', description: 'Foundation / footings',         category: 'structural',    printable: true },
  { name: 'S-SLAB',      color: '#d2b48c', visible: true,  locked: false, lineweightMm: 0.35, linetype: 'continuous', description: 'Slabs (floor / roof)',           category: 'structural',    printable: true },
  { name: 'S-JOIS',      color: '#cd853f', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Joists and decking',            category: 'structural',    printable: true },
  { name: 'S-BRAC',      color: '#b22222', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Bracing',                       category: 'structural',    printable: true },
  // ── Mechanical / HVAC
  { name: 'M-HVAC-SUPL', color: '#87ceeb', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'HVAC supply ductwork',          category: 'mep',           printable: true },
  { name: 'M-HVAC-RETN', color: '#6495ed', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'HVAC return ductwork',          category: 'mep',           printable: true },
  { name: 'M-HVAC-EXHS', color: '#4169e1', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'HVAC exhaust',                  category: 'mep',           printable: true },
  { name: 'M-HVAC-UNIT', color: '#1e90ff', visible: true,  locked: false, lineweightMm: 0.35, linetype: 'continuous', description: 'HVAC equipment units',          category: 'mep',           printable: true },
  // ── Plumbing
  { name: 'P-PIPE-SANR', color: '#228b22', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Sanitary drainage',             category: 'mep',           printable: true },
  { name: 'P-PIPE-DOMW', color: '#32cd32', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Domestic water supply',         category: 'mep',           printable: true },
  { name: 'P-PIPE-FTPR', color: '#006400', visible: true,  locked: false, lineweightMm: 0.35, linetype: 'dashed',     description: 'Fire suppression / sprinkler',  category: 'mep',           printable: true },
  { name: 'P-FIXT',      color: '#7cfc00', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Plumbing fixtures',             category: 'mep',           printable: true },
  // ── Electrical
  { name: 'E-LITE',      color: '#ffff44', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Lighting fixtures',             category: 'mep',           printable: true },
  { name: 'E-POWR',      color: '#ff8c00', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Power / receptacles',           category: 'mep',           printable: true },
  { name: 'E-COMM',      color: '#ffd700', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Communications / data',         category: 'mep',           printable: true },
  { name: 'E-PANL',      color: '#ff6347', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Electrical panels',             category: 'mep',           printable: true },
  // ── Civil / Site
  { name: 'C-PROP',      color: '#ff69b4', visible: true,  locked: false, lineweightMm: 0.50, linetype: 'dashdot',    description: 'Property line',                 category: 'site',          printable: true },
  { name: 'C-TOPO',      color: '#228b22', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Topography / contours',         category: 'site',          printable: true },
  { name: 'C-PKNG',      color: '#808080', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Parking',                       category: 'site',          printable: true },
  { name: 'C-WALK',      color: '#a9a9a9', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Walkways / hardscape',          category: 'site',          printable: true },
  { name: 'L-PLNT',      color: '#006400', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Planting / landscaping',        category: 'site',          printable: true },
  // ── Annotation (always on top, typically non-printing except dimensions)
  { name: 'A-ANNO-TEXT', color: '#ffffff', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Text annotations',              category: 'annotation',    printable: true },
  { name: 'A-ANNO-DIMS', color: '#ffffff', visible: true,  locked: false, lineweightMm: 0.18, linetype: 'continuous', description: 'Dimension strings',             category: 'annotation',    printable: true },
  { name: 'A-ANNO-SYMB', color: '#ffffff', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Drawing symbols / keynotes',    category: 'annotation',    printable: true },
  { name: 'A-ANNO-SECT', color: '#ff0000', visible: true,  locked: false, lineweightMm: 0.50, linetype: 'continuous', description: 'Section cut lines',             category: 'annotation',    printable: true },
  { name: 'A-ANNO-ELEV', color: '#ffffff', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Elevation markers',             category: 'annotation',    printable: true },
  { name: 'A-ANNO-GRDX', color: '#ff0000', visible: true, locked: false, lineweightMm: 0.35, linetype: 'dashdot',    description: 'Column grid lines',             category: 'annotation',    printable: true },
  { name: 'DEFPOINTS',   color: '#ffffff', visible: false, locked: true,  lineweightMm: 0.00, linetype: 'continuous', description: 'Dimension definition points',   category: 'annotation',    printable: false },
  // ── General default
  { name: '0',            color: '#ffffff', visible: true,  locked: false, lineweightMm: 0.25, linetype: 'continuous', description: 'Default layer',                category: 'general',       printable: true },
];

// ── LayerManager ─────────────────────────────────────────────────────────────

export class LayerManager {
  private layers = new Map<string, Layer>();
  private partLayerMap = new Map<string, string>(); // partLabel → layerName

  constructor(preset: 'architectural' | 'empty' = 'empty') {
    this.layers.set('0', { ...ARCHITECTURAL_LAYERS.find(l => l.name === '0')! });
    if (preset === 'architectural') {
      ARCHITECTURAL_LAYERS.forEach(l => this.layers.set(l.name, { ...l }));
    }
  }

  addLayer(layer: Layer): void {
    this.layers.set(layer.name, { ...layer });
  }

  getLayer(name: string): Layer | undefined {
    return this.layers.get(name);
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  getLayersByCategory(): Record<LayerCategory, Layer[]> {
    const out: Record<LayerCategory, Layer[]> = {
      architectural: [], structural: [], mep: [], site: [], annotation: [], general: [],
    };
    for (const l of this.layers.values()) out[l.category].push(l);
    return out;
  }

  setVisibility(name: string, visible: boolean): void {
    const l = this.layers.get(name);
    if (l && !l.locked) l.visible = visible;
  }

  setAllVisible(category: LayerCategory | 'all', visible: boolean): void {
    for (const l of this.layers.values()) {
      if ((category === 'all' || l.category === category) && !l.locked) l.visible = visible;
    }
  }

  toggleCategory(category: LayerCategory): void {
    const layers = this.getAllLayers().filter(l => l.category === category && !l.locked);
    const allVisible = layers.every(l => l.visible);
    layers.forEach(l => { l.visible = !allVisible; });
  }

  assignPartToLayer(partLabel: string, layerName: string): void {
    if (this.layers.has(layerName)) this.partLayerMap.set(partLabel, layerName);
  }

  getPartLayer(partLabel: string): Layer {
    const name = this.partLayerMap.get(partLabel) ?? '0';
    return this.layers.get(name) ?? this.layers.get('0')!;
  }

  isPartVisible(partLabel: string): boolean {
    return this.getPartLayer(partLabel).visible;
  }

  // Keyword-driven auto-assignment for generated model labels
  autoAssignPart(partLabel: string): string {
    const lc = partLabel.toLowerCase();

    if (/\bwall\b|partition|shear\s*wall/.test(lc))               return 'A-WALL';
    if (/\bdoor\b|entry|exit\s*door/.test(lc))                    return 'A-DOOR';
    if (/door.?swing|swing/.test(lc))                             return 'A-DOOR-SWNG';
    if (/\bwindow\b|glazing|curtain.?wall/.test(lc))              return 'A-WIND';
    if (/\bstair\b|step|riser|tread|ramp/.test(lc))              return 'A-STAIR';
    if (/\broof\b|overhang|eave|parapet/.test(lc))               return 'A-ROOF';
    if (/\bceiling\b|soffit/.test(lc))                            return 'A-CEIL';
    if (/\bfloor\b|tile|carpet|hardwood|finish/.test(lc))         return 'A-FLOR';
    if (/elevator|shaft|lift/.test(lc))                           return 'A-FLOR-EVTR';
    if (/furniture|chair|table|desk|bed|sofa|counter/.test(lc))   return 'A-FURN';
    if (/equipment|appliance|casework/.test(lc))                  return 'A-EQPM';

    if (/struct.*col|steel.*col|\bpost\b|\bpillar\b/.test(lc))   return 'S-COLS';
    if (/\bbeam\b|lintel|header|purlin/.test(lc))                 return 'S-BEAM';
    if (/foundation|footing|pile|caisson/.test(lc))               return 'S-FNDN';
    if (/\bslab\b|deck|topping/.test(lc))                         return 'S-SLAB';
    if (/\bjoist\b|truss|rafter/.test(lc))                        return 'S-JOIS';
    if (/brac|knee\s*wall|shear/.test(lc))                        return 'S-BRAC';

    if (/hvac|duct|air\s*handler|diffuser|grille/.test(lc))       return 'M-HVAC-SUPL';
    if (/return\s*air|ra\s*duct/.test(lc))                        return 'M-HVAC-RETN';
    if (/exhaust|vent\s*fan/.test(lc))                            return 'M-HVAC-EXHS';
    if (/chiller|boiler|ahu|rtu|unit\s*heater/.test(lc))          return 'M-HVAC-UNIT';

    if (/sanit|drain|sewer|waste|vent\s*stack/.test(lc))          return 'P-PIPE-SANR';
    if (/water\s*supply|cold\s*water|hot\s*water|domestic/.test(lc)) return 'P-PIPE-DOMW';
    if (/sprinkler|fire\s*sup|standpipe/.test(lc))                return 'P-PIPE-FTPR';
    if (/toilet|sink|lavatory|fixture|shower|tub/.test(lc))       return 'P-FIXT';

    if (/light|lamp|fixture|luminaire|pendant/.test(lc))          return 'E-LITE';
    if (/outlet|receptacle|circuit|conduit|power/.test(lc))       return 'E-POWR';
    if (/panel|switchboard|transformer|mcc/.test(lc))             return 'E-PANL';
    if (/data|comm|telecom|network|speaker|camera/.test(lc))      return 'E-COMM';

    if (/property\s*line|setback/.test(lc))                       return 'C-PROP';
    if (/contour|topograph|grade/.test(lc))                       return 'C-TOPO';
    if (/parking|car\s*space/.test(lc))                           return 'C-PKNG';
    if (/walk|path|pavement|curb/.test(lc))                       return 'C-WALK';
    if (/plant|shrub|tree|lawn|garden/.test(lc))                  return 'L-PLNT';

    if (/\bdim\b|dimension|measure/.test(lc))                     return 'A-ANNO-DIMS';
    if (/annot|note|text|label|keynote/.test(lc))                 return 'A-ANNO-TEXT';
    if (/section|cut\s*line/.test(lc))                            return 'A-ANNO-SECT';
    if (/grid\s*line|column\s*grid/.test(lc))                     return 'A-ANNO-GRDX';
    if (/elevation\s*mark|elev\s*tag/.test(lc))                   return 'A-ANNO-ELEV';

    return '0';
  }

  // Bulk auto-assign an array of part labels
  autoAssignAll(partLabels: string[]): void {
    for (const label of partLabels) {
      this.assignPartToLayer(label, this.autoAssignPart(label));
    }
  }

  // Serialise for persistence
  toJSON(): Record<string, { visible: boolean; locked: boolean; layerName: string }[]> {
    const layers: Record<string, { visible: boolean; locked: boolean; layerName: string }[]> = {};
    for (const [name, l] of this.layers.entries()) {
      layers[name] = [{ visible: l.visible, locked: l.locked, layerName: name }];
    }
    return layers;
  }
}

// ── Convenience: build a fresh architectural LayerManager ────────────────────

export function createArchitecturalLayerManager(): LayerManager {
  return new LayerManager('architectural');
}