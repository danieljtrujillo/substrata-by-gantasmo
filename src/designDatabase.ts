// ═══════════════════════════════════════════════════════════════
// SUBSTRATA Design Reference Database
// Local repository of templates, components, and design practices
// ═══════════════════════════════════════════════════════════════

// ── Design Templates ──────────────────────────────────────────
// Categorized project archetypes with subsystem breakdowns
// Used by the advisor and blueprint generator for reference

export type StudioMode = 'maker' | 'architecture' | 'hacker' | 'all';

export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  subsystems: string[];
  keyComponents: string[];
  fabricationMethods: string[];
  /** Studio mode this template belongs to. 'all' = inject regardless. Defaults to 'maker' if absent. */
  mode?: StudioMode;
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  // ── Robotics ───────────────────────────────────────────────
  {
    id: 'hexapod',
    name: 'Hexapod Walker',
    category: 'Robotics',
    description: '6-legged walking robot with 3 DOF per leg (18 servos). Inverse kinematics gait control. Great for terrain traversal.',
    complexity: 'advanced',
    subsystems: ['Chassis Frame', 'Leg Assembly x6', 'Servo Controller (PCA9685)', 'Power Distribution', 'IMU Balance (MPU6050)', 'Wireless Control (ESP32)'],
    keyComponents: ['MG996R Servo x18', 'PCA9685 16-ch PWM x2', 'ESP32-WROOM', 'MPU6050 IMU', 'LiPo 3S 2200mAh', 'Buck Converter 5V 10A', 'M3 Standoffs', '608ZZ Bearings'],
    fabricationMethods: ['3D Print: Body plates, coxa/femur/tibia segments, servo brackets (PLA/PETG)', 'Laser Cut: Base plate (3mm acrylic or birch ply)', 'Off-shelf: Servos, electronics, M3 fasteners, bearings']
  },
  {
    id: 'quadruped',
    name: 'Quadruped Robot (Spot Micro)',
    category: 'Robotics',
    description: '4-legged robot dog with 3 DOF per leg (12 servos). Dynamic walking, trotting, and balancing.',
    complexity: 'advanced',
    subsystems: ['Body Frame', 'Leg Assembly x4', 'Motor Driver', 'Power System', 'Sensor Suite', 'Compute Module'],
    keyComponents: ['DS3218 Servo x12', 'Raspberry Pi 4 or Jetson Nano', 'PCA9685', 'MPU6050', 'LiPo 3S 5000mAh', 'HC-SR04 Ultrasonic x2', 'Pi Camera v2'],
    fabricationMethods: ['3D Print: Body shell, shoulder/upper/lower leg links, foot pads (PETG)', 'Laser Cut: Structural side plates (3mm MDF)', 'Off-shelf: Servos, bearings, M3 hardware']
  },
  {
    id: 'robotic_arm',
    name: '6-DOF Robotic Arm',
    category: 'Robotics',
    description: 'Desktop robotic arm with 6 degrees of freedom. Pick-and-place, drawing, or light assembly tasks.',
    complexity: 'intermediate',
    subsystems: ['Base Turntable', 'Shoulder Joint', 'Elbow Joint', 'Wrist (2-axis)', 'Gripper', 'Controller'],
    keyComponents: ['MG996R Servo x4', 'SG90 Servo x2', 'Arduino Mega', 'Joystick Module x2', '12V 5A PSU', 'Turntable Bearing 60mm'],
    fabricationMethods: ['3D Print: All arm segments, gripper jaws, bearing housings (PLA)', 'Laser Cut: Base plate (5mm acrylic)', 'Off-shelf: Servos, bearings, power supply']
  },
  {
    id: 'wheeled_rover',
    name: 'Wheeled Rover',
    category: 'Robotics',
    description: '4WD autonomous rover with obstacle avoidance. Expandable sensor platform.',
    complexity: 'beginner',
    subsystems: ['Chassis', 'Drive System', 'Sensor Array', 'Controller', 'Power'],
    keyComponents: ['TT Motor x4', 'L298N Motor Driver', 'Arduino Uno or ESP32', 'HC-SR04 x3', 'IR Sensor x2', '18650 Battery Holder', 'Wheels 65mm x4'],
    fabricationMethods: ['3D Print: Chassis body, sensor mounts, battery bracket (PLA)', 'Laser Cut: Flat chassis plate (3mm MDF)', 'Off-shelf: Motors, wheels, electronics']
  },
  // ── Electronics / IoT ──────────────────────────────────────
  {
    id: 'led_doorknob',
    name: 'Smart LED Doorknob',
    category: 'Electronics',
    description: 'Doorknob with embedded NeoPixel ring and capacitive touch sensor. Changes color based on lock state or notifications.',
    complexity: 'intermediate',
    subsystems: ['Outer Shell', 'LED Ring Housing', 'Touch Sensing', 'MCU & Wireless', 'Power Management'],
    keyComponents: ['WS2812B Ring 24-LED', 'ESP32-C3 Mini', 'TTP223 Touch Sensor', 'LiPo 500mAh', 'TP4056 Charger', 'Existing Doorknob Hardware'],
    fabricationMethods: ['3D Print: Outer shell (translucent PETG/resin), LED diffuser ring, PCB mount', 'Laser Cut: Decorative face plate (3mm acrylic, frosted)', 'Off-shelf: ESP32, LED ring, touch sensor, battery']
  },
  {
    id: 'weather_station',
    name: 'IoT Weather Station',
    category: 'Electronics',
    description: 'Solar-powered outdoor weather station with temp, humidity, pressure, wind speed. Reports to dashboard via WiFi.',
    complexity: 'intermediate',
    subsystems: ['Enclosure', 'Sensor Array', 'Solar Power', 'MCU & WiFi', 'Data Logging'],
    keyComponents: ['ESP32', 'BME280 (Temp/Hum/Press)', 'Anemometer Kit', 'Rain Gauge', '6V 1W Solar Panel', 'TP4056 + 18650', 'OLED SSD1306 128x64'],
    fabricationMethods: ['3D Print: Stevenson screen enclosure, sensor mounts (ASA for UV resistance)', 'Laser Cut: Mounting bracket (3mm acrylic)', 'Off-shelf: Sensors, solar panel, battery']
  },
  {
    id: 'macro_keypad',
    name: 'Custom Macro Keypad',
    category: 'Electronics',
    description: '9-12 key mechanical macro pad with rotary encoder, OLED display, and per-key RGB.',
    complexity: 'beginner',
    subsystems: ['Case', 'Switch Plate', 'PCB/Wiring', 'Controller', 'Firmware'],
    keyComponents: ['Cherry MX or Gateron Switches x9', 'Arduino Pro Micro (ATmega32U4)', 'Rotary Encoder KY-040', 'SSD1306 OLED 0.91"', 'WS2812B LEDs x9', 'Keycaps', 'USB-C Breakout'],
    fabricationMethods: ['3D Print: Case body, switch plate (PLA/Resin)', 'Laser Cut: Top plate (1.5mm steel or 3mm acrylic)', 'Off-shelf: Switches, keycaps, Pro Micro, encoder']
  },
  // ── Mechanical / Art ───────────────────────────────────────
  {
    id: 'kinetic_sculpture',
    name: 'Kinetic Sculpture (Wave)',
    category: 'Mechanical',
    description: 'Cam-driven wave sculpture with 20+ rods creating a sinusoidal wave pattern. Single motor driven.',
    complexity: 'intermediate',
    subsystems: ['Base Frame', 'Cam Shaft Assembly', 'Wave Rods', 'Motor Drive', 'Display Base'],
    keyComponents: ['NEMA 17 Stepper', 'A4988 Driver', 'Arduino Nano', '3mm Steel Rod x24', '608ZZ Bearings x4', 'Timing Belt + Pulleys'],
    fabricationMethods: ['3D Print: Cam discs (each at different phase angle), rod guides, motor mount (PLA)', 'Laser Cut: Side plates, base (5mm birch ply)', 'Off-shelf: Steel rods, bearings, motor, belt']
  },
  {
    id: 'lamp_voronoi',
    name: 'Voronoi Table Lamp',
    category: 'Art/Decor',
    description: 'Organic voronoi-pattern lamp shade with warm LED strip. Stunning light diffusion.',
    complexity: 'beginner',
    subsystems: ['Shade', 'Base', 'LED System', 'Power'],
    keyComponents: ['WS2812B Strip 1m (warm white)', 'ESP32-C3 (WiFi dimming)', '5V 2A USB-C PSU', 'Diffuser Film'],
    fabricationMethods: ['3D Print: Voronoi shade (white PLA, vase mode)', 'Laser Cut: Base plate, decorative insert (3mm birch ply)', 'Off-shelf: LED strip, controller, power supply']
  },
  {
    id: 'gear_clock',
    name: 'Exposed Gear Clock',
    category: 'Mechanical',
    description: 'Wall-mounted clock with all gears visible. Mesmerizing mechanical display.',
    complexity: 'intermediate',
    subsystems: ['Gear Train', 'Frame & Pillars', 'Clock Movement', 'Hands', 'Mounting'],
    keyComponents: ['Clock Quartz Movement', 'M3 Brass Standoffs', 'Clock Hands Set', 'Wall Mount Hardware'],
    fabricationMethods: ['3D Print: All gears (module 1.5-2.0), frame pillars, hand hubs (PLA)', 'Laser Cut: Back plate, gear outlines for decoration (3mm acrylic)', 'Off-shelf: Clock movement, fasteners']
  },
  {
    id: 'drone_frame',
    name: 'FPV Racing Drone Frame',
    category: 'Robotics',
    description: '5" racing drone frame. Lightweight carbon fiber design with 3D printed accessories.',
    complexity: 'advanced',
    subsystems: ['Main Frame', 'Motor Mounts', 'Camera Mount', 'Electronics Stack', 'Antenna Mount'],
    keyComponents: ['2306 Brushless Motor x4', 'ESC 4-in-1 30A', 'F4 Flight Controller', 'FPV Camera', 'VTX 400mW', 'LiPo 4S 1300mAh', '5" Props x8'],
    fabricationMethods: ['Laser Cut: Main frame arms & plates (2mm carbon fiber sheet)', '3D Print: Camera mount, antenna holder, TPU bumpers (TPU)', 'Off-shelf: Motors, ESC, FC, FPV gear']
  },
  {
    id: 'plant_monitor',
    name: 'Smart Plant Monitor',
    category: 'Electronics',
    description: 'Soil moisture, light, and temperature monitor with auto-watering. OLED display + mobile alerts.',
    complexity: 'beginner',
    subsystems: ['Enclosure', 'Sensor Probes', 'Pump System', 'Controller', 'Display'],
    keyComponents: ['ESP32', 'Capacitive Soil Moisture Sensor', 'BH1750 Light Sensor', 'DS18B20 Temp', 'Mini Water Pump 3-5V', 'MOSFET Module', 'OLED SSD1306', 'Silicone Tubing'],
    fabricationMethods: ['3D Print: Weatherproof enclosure, probe housing (PETG)', 'Laser Cut: Decorative front panel (3mm ply)', 'Off-shelf: Sensors, pump, tubing, ESP32']
  },

  // ── Architecture (mode-gated) ─────────────────────────────────
  {
    id: 'arch_single_family',
    name: 'Single-Family House',
    category: 'Residential',
    description: 'Two-story SFH on a small urban lot. Gabled or hipped roof, three bedrooms above, open kitchen/living/dining below, attached one-car garage, full basement, code-compliant egress everywhere.',
    complexity: 'intermediate',
    mode: 'architecture',
    subsystems: ['Foundation + slab', 'Wood-frame envelope', 'Roof assembly (gabled / hipped)', 'Fenestration (ABA front / regular sides)', 'Mechanical/electrical chase', 'Garage + driveway', 'Egress staircase'],
    keyComponents: ['ICF foundation walls', '2x6 stud framing 16" o.c.', '5/8" exterior sheathing', 'Vinyl/fibre-cement siding', 'Asphalt shingle roofing', 'LVL ridge beam', 'Egress windows (≥5.7 sf opening)'],
    fabricationMethods: ['Site-built wood framing', 'CMU or ICF basement', 'Truss-fabricated roof or stick-framed rafters']
  },
  {
    id: 'arch_adu',
    name: 'Accessory Dwelling Unit (ADU)',
    category: 'Residential',
    description: 'Standalone backyard cottage. Compact 400-800 sf footprint, single story, full kitchen + bath + sleeping area, accessible entry, parking on-grade. Designed to meet typical municipal ADU ordinances.',
    complexity: 'beginner',
    mode: 'architecture',
    subsystems: ['Pier-and-beam or slab foundation', 'Wood-frame envelope', 'Shed or hipped roof', 'Mini-split HVAC', 'Compact kitchenette', 'ADA-compliant bath'],
    keyComponents: ['2x6 framing', 'Mini-split heat pump', 'Compact stacked W/D', 'On-demand water heater', 'LVT or polished concrete floor'],
    fabricationMethods: ['Site-built wood framing', 'Modular/prefab panel option', 'Slab-on-grade or pier foundation']
  },
  {
    id: 'arch_mixed_use_4',
    name: 'Mixed-Use 4-Story',
    category: 'Commercial',
    description: 'Ground-floor retail with three levels of residential apartments above. Corner site, fire-rated separation between uses, central stair + elevator, podium parking optional.',
    complexity: 'advanced',
    mode: 'architecture',
    subsystems: ['Concrete podium ground floor', '3 levels Type V wood-frame', 'Retail storefront (curtain wall)', 'Apartment unit grid', 'Egress stair + elevator', 'MEP chase'],
    keyComponents: ['Concrete podium slab', 'Wood-frame (Type V-A)', 'Aluminum storefront', 'Fire-rated assemblies (2-hr podium, 1-hr corridor)', 'Elevator (MRL)', 'Sprinkler system NFPA 13'],
    fabricationMethods: ['Cast-in-place concrete podium', 'Prefab wood-frame panels (above podium)', 'Steel stair']
  },
  {
    id: 'arch_courtyard_office',
    name: 'Courtyard Office Building',
    category: 'Commercial',
    description: 'Two-story office around a central planted courtyard. Continuous clerestory on courtyard side for daylighting. Curtain-wall street facade, masonry side walls.',
    complexity: 'intermediate',
    mode: 'architecture',
    subsystems: ['Concrete slab', 'Steel-frame structure', 'Courtyard (open-air or atrium)', 'Curtain-wall street facade', 'Punched-hole side facades', 'Mansard or flat roof + clerestory'],
    keyComponents: ['Wide-flange steel framing', 'Curtain wall (4" mullion)', 'Clay brick or fibre-cement panel siding', 'Operable clerestory glazing', 'TPO roof membrane'],
    fabricationMethods: ['Steel erection', 'Curtain-wall panelized install', 'On-site CMU/brick masonry']
  },
  {
    id: 'arch_pavilion',
    name: 'Park Pavilion',
    category: 'Civic',
    description: 'Open-air timber pavilion for a public park. Glulam ridge with cantilevered eaves, butterfly or hipped roof, no walls (or knee-height parapet only), heavy-timber columns on stone bases.',
    complexity: 'intermediate',
    mode: 'architecture',
    subsystems: ['Stone or concrete piers', 'Glulam timber columns', 'Glulam beams + ridge', 'Standing-seam metal or shingle roof', 'Optional knee walls / benches'],
    keyComponents: ['Glulam 20F-V4', 'Concealed Simpson connectors', 'Standing-seam zinc or copper roofing', 'Stone column bases'],
    fabricationMethods: ['Prefab glulam delivered + erected on-site', 'Stone masonry bases', 'Pre-engineered metal roofing']
  },
  {
    id: 'arch_micro_cabin',
    name: 'Off-Grid Micro Cabin',
    category: 'Residential',
    description: '160-300 sf solo retreat cabin. Single-pitch shed roof, west-facing solar array, composting toilet, propane cooktop, wood stove, no grid utilities.',
    complexity: 'beginner',
    mode: 'architecture',
    subsystems: ['Pier foundation', 'SIP or 2x4 framing', 'Shed roof', 'Solar electrical', 'Wood-burning stove', 'Composting toilet'],
    keyComponents: ['Pier footings (CMU or sonotube)', '4" SIPs or 2x4 framing', '5/8" T&G plywood deck', 'Standing-seam metal roof', '300W solar panel x4', '12V Li battery', 'Cubic Mini wood stove'],
    fabricationMethods: ['Site-built or panelized', 'On-grade pier foundation (no excavation)']
  },
  {
    id: 'arch_retail_kiosk',
    name: 'Retail Kiosk',
    category: 'Commercial',
    description: 'Standalone retail kiosk 80-120 sf. Roll-up service window, storage closet, single ADA-accessible entrance. Designed for sidewalk/plaza placement.',
    complexity: 'beginner',
    mode: 'architecture',
    subsystems: ['Reinforced slab', 'CMU or steel-frame walls', 'Roll-up service shutter', 'Flat or shed roof', 'HVAC mini-split', 'Locking storage closet'],
    keyComponents: ['Pre-cast concrete pad', 'CMU 6" walls', 'Roll-up door (steel)', 'HVAC mini-split', 'Tempered storefront glass'],
    fabricationMethods: ['Pre-cast modular delivery', 'On-site CMU + finish']
  },
  {
    id: 'arch_footbridge',
    name: 'Pedestrian Footbridge',
    category: 'Civic',
    description: 'Single-span pedestrian footbridge 8-20m crossing a creek or road. Truss, cable-stayed, or arch typology depending on span. Steel + timber composite deck.',
    complexity: 'advanced',
    mode: 'architecture',
    subsystems: ['Concrete abutments', 'Main structural span (truss / arch / cable)', 'Timber or composite deck', 'Railings (≥1067mm tall, pickets ≤100mm gap)', 'Drainage'],
    keyComponents: ['Cast-in-place concrete abutments', 'Galvanised steel structure', 'IPE or thermally modified timber deck', 'Stainless cable infill or picket rail'],
    fabricationMethods: ['Prefab steel main span erected by crane', 'On-site abutment formwork + pour', 'On-site deck install']
  },
];

// ── Component Reference Database ──────────────────────────────
// Common components with specs, pricing, and sourcing info
// Injected into AI prompts for accurate BOM generation

export interface ComponentRef {
  name: string;
  category: string;
  specs: string;
  typicalPrice: number;
  sources: string[];
  notes: string;
}

export const COMPONENT_DATABASE: ComponentRef[] = [
  // Actuators
  { name: 'SG90 Micro Servo', category: 'Actuator', specs: '180° rotation, 1.8kg·cm torque, 4.8V', typicalPrice: 2.50, sources: ['Amazon', 'Adafruit'], notes: 'Good for lightweight applications. Plastic gears wear quickly under load.' },
  { name: 'MG996R Metal Gear Servo', category: 'Actuator', specs: '180° rotation, 11kg·cm torque, 6V', typicalPrice: 8.00, sources: ['Amazon', 'Pololu'], notes: 'Standard for robotics. Metal gears. High current draw (~2.5A stall).' },
  { name: 'DS3218 Digital Servo', category: 'Actuator', specs: '270° rotation, 21kg·cm torque, 6.8V', typicalPrice: 12.00, sources: ['Amazon'], notes: 'High-torque waterproof. Good for large robots.' },
  { name: 'NEMA 17 Stepper (42mm)', category: 'Actuator', specs: '1.8°/step, 40N·cm holding torque, 1.5A', typicalPrice: 10.00, sources: ['Amazon', 'McMaster'], notes: 'Standard 3D printer motor. Pair with A4988 or TMC2209 driver.' },
  { name: '28BYJ-48 Stepper + ULN2003', category: 'Actuator', specs: '5V unipolar, 4096 steps/rev, low torque', typicalPrice: 3.00, sources: ['Amazon', 'Adafruit'], notes: 'Cheap and easy. Too weak for structural loads.' },
  { name: 'TT Geared Motor (3-6V)', category: 'Actuator', specs: '200RPM, 0.8kg·cm, dual shaft', typicalPrice: 2.00, sources: ['Amazon', 'Adafruit'], notes: 'Standard for small rovers. Pair with 65mm yellow wheels.' },

  // MCUs
  { name: 'ESP32-WROOM-32', category: 'MCU', specs: 'Dual-core 240MHz, WiFi+BT, 34 GPIO, 520KB SRAM', typicalPrice: 6.00, sources: ['Amazon', 'Adafruit', 'Mouser'], notes: 'Best all-rounder for IoT. Use with Arduino IDE or ESP-IDF.' },
  { name: 'Arduino Nano', category: 'MCU', specs: 'ATmega328P, 16MHz, 14 digital + 8 analog, 32KB flash', typicalPrice: 4.00, sources: ['Amazon', 'Adafruit'], notes: 'Good for simple projects. No WiFi. Use clones for cost savings.' },
  { name: 'Raspberry Pi Pico W', category: 'MCU', specs: 'RP2040 dual-core 133MHz, WiFi, 26 GPIO, 264KB SRAM', typicalPrice: 6.00, sources: ['Adafruit', 'Mouser'], notes: 'Excellent for PIO state machines. MicroPython or C++ SDK.' },
  { name: 'Teensy 4.1', category: 'MCU', specs: 'ARM Cortex-M7 600MHz, 55 GPIO, 1MB SRAM, SD card', typicalPrice: 32.00, sources: ['PJRC', 'Adafruit'], notes: 'Extreme performance. Audio, USB host, Ethernet. Overkill for simple projects.' },
  { name: 'Arduino Pro Micro (ATmega32U4)', category: 'MCU', specs: '16MHz, native USB HID, 18 GPIO', typicalPrice: 5.00, sources: ['Amazon', 'SparkFun'], notes: 'Perfect for custom keyboards/macropads. Native USB HID support.' },
  { name: 'Seeed XIAO ESP32-S3', category: 'MCU', specs: 'ESP32-S3, WiFi+BT5, 11 GPIO, tiny 21x17mm', typicalPrice: 7.00, sources: ['Seeed', 'Amazon'], notes: 'Ultra-compact. Camera support. Good for wearables.' },

  // Sensors
  { name: 'MPU6050 6-Axis IMU', category: 'Sensor', specs: 'Accelerometer + Gyroscope, I2C, ±16g/±2000°/s', typicalPrice: 2.50, sources: ['Amazon', 'Adafruit'], notes: 'Standard for balance/orientation. Use DMP for fused output.' },
  { name: 'HC-SR04 Ultrasonic', category: 'Sensor', specs: '2cm-400cm range, ±3mm accuracy, 5V trigger/echo', typicalPrice: 1.50, sources: ['Amazon'], notes: 'Basic distance sensor. Slow update rate (~50ms). Not great for fast robots.' },
  { name: 'VL53L0X ToF Laser Ranger', category: 'Sensor', specs: 'Up to 2m, I2C, ±3% accuracy, fast', typicalPrice: 6.00, sources: ['Adafruit', 'Amazon'], notes: 'Much better than ultrasonic. Tiny breakout. Multiple via XSHUT pin.' },
  { name: 'BME280 Environment', category: 'Sensor', specs: 'Temp/Humidity/Pressure, I2C/SPI', typicalPrice: 4.00, sources: ['Adafruit', 'Amazon'], notes: 'High-accuracy weather sensor. BMP280 is cheaper (no humidity).' },
  { name: 'Capacitive Soil Moisture v1.2', category: 'Sensor', specs: 'Analog output, corrosion-resistant, 3.3-5V', typicalPrice: 2.00, sources: ['Amazon'], notes: 'Capacitive > resistive (no corrosion). Calibrate min/max in air and water.' },

  // LEDs & Displays
  { name: 'WS2812B NeoPixel Strip (1m, 60/m)', category: 'LED', specs: 'Addressable RGB, 5V, ~18W/m at full white', typicalPrice: 8.00, sources: ['Adafruit', 'Amazon'], notes: 'Standard addressable LED. 60mA per LED at full white. Use 1000µF cap on power.' },
  { name: 'WS2812B Ring (24 LED)', category: 'LED', specs: 'Circular addressable RGB, 5V', typicalPrice: 5.00, sources: ['Adafruit', 'Amazon'], notes: 'Great for indicators, gauges, decorative lighting.' },
  { name: 'SSD1306 OLED 0.96" 128x64', category: 'Display', specs: 'I2C, monochrome white/blue, 3.3-5V', typicalPrice: 3.00, sources: ['Amazon', 'Adafruit'], notes: 'Tiny but readable. Use Adafruit_SSD1306 or u8g2 library.' },
  { name: 'ILI9341 TFT 2.8" 320x240', category: 'Display', specs: 'SPI, 65K color, touch optional, 3.3V logic', typicalPrice: 8.00, sources: ['Amazon', 'Adafruit'], notes: 'Good middle ground. Use TFT_eSPI library for fast rendering.' },

  // Power
  { name: 'LiPo 3S 2200mAh 11.1V', category: 'Power', specs: '25C discharge, XT60 connector', typicalPrice: 15.00, sources: ['Amazon', 'HobbyKing'], notes: 'Standard for robotics. MUST use balance charger. Fire hazard if punctured.' },
  { name: '18650 Li-Ion Cell (Samsung 30Q)', category: 'Power', specs: '3000mAh, 15A continuous, 3.7V nominal', typicalPrice: 5.00, sources: ['Amazon', '18650BatteryStore'], notes: 'Trusted cell. Use holders or spot-weld for packs. Always include BMS.' },
  { name: 'TP4056 USB-C Charger Module', category: 'Power', specs: '1A charge, DW01 protection, USB-C in', typicalPrice: 1.00, sources: ['Amazon'], notes: 'Single-cell LiPo/Li-Ion charger. Has over-discharge protection.' },
  { name: 'LM2596 Buck Converter Module', category: 'Power', specs: 'Adjustable 1.25-35V out, 3A max', typicalPrice: 2.00, sources: ['Amazon'], notes: 'Adjustable step-down. Set with potentiometer. Not great efficiency at low loads.' },
  { name: 'PCA9685 16-Ch PWM Driver', category: 'Driver', specs: 'I2C, 12-bit resolution, 40-1000Hz, chainable', typicalPrice: 4.00, sources: ['Adafruit', 'Amazon'], notes: 'Essential for multi-servo robots. Offloads PWM from MCU. External V+ for servos.' },

  // Structural
  { name: 'M3 Screw Assortment (Button/Socket)', category: 'Hardware', specs: 'M3x6/8/10/12/16/20mm, stainless', typicalPrice: 12.00, sources: ['Amazon', 'McMaster'], notes: 'M3 is the standard for maker projects. Button head looks cleaner.' },
  { name: '608ZZ Ball Bearing', category: 'Hardware', specs: '8mm bore, 22mm OD, 7mm width', typicalPrice: 0.50, sources: ['Amazon', 'McMaster'], notes: 'Standard skateboard bearing. Use for axles, turntables, joints.' },
  { name: 'GT2 Timing Belt + Pulleys Kit', category: 'Hardware', specs: '2mm pitch, 6mm width, 20T pulleys', typicalPrice: 8.00, sources: ['Amazon'], notes: 'Standard for 3D printers and CNC. Zero backlash.' },
  { name: 'Linear Rail MGN12H (300mm)', category: 'Hardware', specs: '12mm rail, MGN12H carriage, ~2.5kg capacity', typicalPrice: 12.00, sources: ['Amazon', 'AliExpress'], notes: 'Precision linear motion. Much better than rods + bearings.' },
];

// ── Design Practices ──────────────────────────────────────────
// Quick-reference best practices injected into AI prompts

export const DESIGN_PRACTICES = `
## 3D PRINTING DESIGN FOR MANUFACTURING (DFM)
- Min wall thickness: 1.2mm FDM, 0.8mm SLA
- Overhang limit: 45° without supports (FDM). Design with flat bottoms.
- Hole tolerance: Print holes 0.2-0.4mm undersized, ream to fit
- Bridging: Up to ~50mm unsupported spans on tuned FDM printers
- Screw bosses: Use heat-set brass inserts (M3 = 4.0mm hole in PLA) over self-tapping
- Snap fits: 1-2mm deflection in PLA. PETG has better flex fatigue.
- Living hinges: Print flat in TPU/PP, not PLA
- Orientation matters: Strongest along XY, weakest in Z (layer adhesion)
- Material guide: PLA (easy, stiff, brittle), PETG (tough, slight flex), ABS/ASA (heat resistant, warps), TPU (flexible), Resin (fine detail, brittle)

## LASER CUTTING DFM (Diode 2.5-10W)
- Kerf compensation: ~0.1-0.2mm per side for 2.5W diode on wood
- Tab-and-slot: Use 0.1mm interference fit for press-fit joints
- Max cut thickness (2.5W): ~3mm balsa, ~2mm MDF (multiple passes)
- Engraving: Use M4 dynamic power mode for grayscale
- Living hinges: Laser-cut parallel kerfs in thin ply (0.5mm spacing, 80% depth)
- Material: Birch ply and MDF cut cleanest. Acrylic needs higher power. NEVER cut PVC/vinyl (toxic chlorine gas).
- Focus: Consistent focus height is critical. Use a focusing jig.

## ELECTRONICS DESIGN RULES
- Decoupling: 100nF ceramic cap on every IC's VCC pin, as close as possible
- Power traces: Wide for high current. 1oz copper: ~1A per 0.25mm width (PCB)
- Pull-up resistors: I2C needs 4.7kΩ pull-ups on SDA/SCL (one set per bus)
- Servo power: NEVER power servos from MCU pin or USB. Use separate 5-6V supply via BEC/regulator.
- Motor flyback: Always use flyback diodes (1N4007) on motor/relay coils, or use a driver IC
- Signal levels: ESP32 is 3.3V logic. Use level shifters for 5V peripherals (or use 5V-tolerant pins).
- Grounding: Star grounding for mixed analog/digital. Keep high-current return paths away from signal traces.

## MECHANICAL DESIGN PRINCIPLES
- Gear design: Module 1.0-2.0 for 3D printed gears. Pressure angle 20°. Min 12 teeth.
- Bearing selection: 608ZZ for general axles. 6001ZZ for higher loads. Thrust bearings for turntables.
- Fastener rule: Engagement depth ≥ 1.5x screw diameter in metal, 2x in plastic
- Backlash: Use spring-loaded anti-backlash nuts or timing belts for precision
- Vibration: Add rubber grommets or TPU dampers for motor mounts
- Assembly order: Design for assembly (DFA) - minimize fastener types, avoid blind assembly

## PROJECT STRUCTURE BEST PRACTICES
- Start with requirements → subsystem decomposition → interface definition → detail design
- Define interfaces between subsystems FIRST (connector types, mounting hole patterns, signal protocols)
- Prototype the riskiest subsystem first
- Version control your CAD files (git-lfs for STLs, or use parametric CAD with text-based formats)
- Document pinouts, wiring, and assembly order for future-you
`;

// ── Community Source Patterns ─────────────────────────────────
// Search patterns for finding reference designs

export const COMMUNITY_SOURCES = [
  { platform: 'GitHub', searchUrl: 'https://github.com/search?type=repositories&q=', categories: ['firmware', 'control code', 'CAD files', 'full projects', 'libraries'] },
  { platform: 'Thingiverse', searchUrl: 'https://www.thingiverse.com/search?q=', categories: ['3D printable parts', 'enclosures', 'mechanisms', 'art'] },
  { platform: 'Instructables', searchUrl: 'https://www.instructables.com/search/?q=', categories: ['full build guides', 'step-by-step tutorials', 'wiring diagrams'] },
  { platform: 'Hackaday.io', searchUrl: 'https://hackaday.io/search?term=', categories: ['electronics projects', 'PCB designs', 'hacks', 'research'] },
  { platform: 'GrabCAD', searchUrl: 'https://grabcad.com/library?query=', categories: ['professional CAD models', 'STEP files', 'engineering drawings'] },
  { platform: 'Adafruit Learn', searchUrl: 'https://learn.adafruit.com/search?q=', categories: ['tutorials', 'wiring guides', 'code examples'] },
];

// ── Prompt Injection for AI ───────────────────────────────────
// Compiled database summary for injection into generation prompts

export function getComponentDatabaseSummary(): string {
  const byCategory: Record<string, ComponentRef[]> = {};
  for (const c of COMPONENT_DATABASE) {
    if (!byCategory[c.category]) byCategory[c.category] = [];
    byCategory[c.category].push(c);
  }
  let summary = '## AVAILABLE COMPONENTS REFERENCE\n';
  for (const [cat, items] of Object.entries(byCategory)) {
    summary += `\n### ${cat}\n`;
    for (const item of items) {
      summary += `- **${item.name}**: ${item.specs}. ~$${item.typicalPrice}. ${item.notes}\n`;
    }
  }
  return summary;
}

export function getTemplateSummary(mode?: StudioMode): string {
  const filtered = mode && mode !== 'all'
    ? DESIGN_TEMPLATES.filter(t => (t.mode ?? 'maker') === mode || t.mode === 'all')
    : DESIGN_TEMPLATES;
  let summary = `## DESIGN TEMPLATE REFERENCE${mode ? ` (${mode} mode)` : ''}\n`;
  for (const t of filtered) {
    summary += `\n### ${t.name} [${t.category}] (${t.complexity})\n`;
    summary += `${t.description}\n`;
    summary += `Subsystems: ${t.subsystems.join(', ')}\n`;
    summary += `Key Components: ${t.keyComponents.join(', ')}\n`;
    summary += `Fabrication: ${t.fabricationMethods.join(' | ')}\n`;
  }
  return summary;
}
