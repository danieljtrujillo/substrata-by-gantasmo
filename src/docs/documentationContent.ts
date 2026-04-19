/**
 * SUBSTRATA by GANTASMO — Documentation Content
 * This module contains all documentation sections rendered in the in-app docs viewer.
 * It is also used as the source for PDF/HTML export.
 */

export interface DocSection {
  id: string;
  title: string;
  icon: string; // lucide icon name
  content: string; // markdown
  children?: DocSection[];
}

export const DOCUMENTATION: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: 'BookOpen',
    content: `
# SUBSTRATA by GANTASMO

**SUBSTRATA** is an AI-powered rapid prototyping suite that takes your idea from concept to physical object. It combines design generation, 2D/3D modeling, image processing, fabrication planning, laser engraving, and cloud project management into one end-to-end pipeline.

## The Prototyping Pipeline

Every project in SUBSTRATA follows a pipeline:

| Stage | What Happens | Tools Used |
|-------|-------------|------------|
| **Ideate** | Brainstorm concepts, browse community projects, describe your vision | AI Advisor, Community Sources (GitHub, Thingiverse, Instructables, Hackaday) |
| **Design** | Generate 2D designs or 3D blueprints from text/voice prompts | Design Studio, Prototyping Studio, AI Image Generation |
| **Process** | Refine images with filters, dithering, edge detection, canvas editing | Image Processor, Advanced Editor (inpaint, outpaint, style transfer) |
| **Fabricate** | Generate STL files, BOMs, print parameters, and control code | 3D Prototyping Studio, Fabrication Files, BOM Generator |
| **Finish** | Laser engrave, cut, or mark your finished parts | Laser Fabrication, Material Presets, PNG/SVG Export |

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **3D Prototyping** | AI-generated hardware blueprints with BOM, STL files, print params, and control code |
| **AI Design Generation** | Generate designs from text or voice prompts in 4 styles |
| **Image Processing** | Floyd-Steinberg dithering, Sobel edge detection, brightness/contrast/threshold |
| **Advanced Canvas Editor** | Konva-powered editor with AI inpainting, outpainting, and style transfer |
| **Laser Fabrication** | Material presets, power/speed/passes tuning, PNG/SVG export for laser cutters |
| **AI Prototyping Advisor** | Full-spectrum expert chat: materials, design, fabrication, electronics, mechanical engineering |
| **Community Inspiration** | Pull project ideas from GitHub, Thingiverse, Instructables, Hackaday |
| **Project Management** | Firebase-backed save/load/rename/duplicate with Google Auth |

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix primitives + CVA)
- **3D Engine**: Three.js via React Three Fiber + Drei
- **Canvas Editor**: Konva + react-konva
- **AI**: Google Gemini API (3.1 Pro, Flash, Flash Image, Flash TTS)
- **Backend**: Firebase (Auth + Firestore)
- **Animation**: Motion (Framer Motion successor)

## Design Language

SUBSTRATA uses a **frosted glass (glassmorphism)** design system with:
- Dark background with radial gradient overlays
- \`backdrop-blur\` panels with 5% white opacity
- Cyan accent color (\`#00f2ff\`) throughout
- Geist Variable font family
- Minimal, industrial typography with tracking-widest uppercase labels

## Application Screenshots

![3D Prototyping Studio — AI-powered hardware design engine](/docs/screenshots/01-prototyping-studio.png)

![Design Studio — Image generation, processing, and fabrication prep](/docs/screenshots/02-laser-studio.png)

![AI Prototyping Advisor — Expert chat with TTS voice responses](/docs/screenshots/03-advisor-tab.png)

![Maintenance Dashboard — Safety checks, stats, and troubleshooting](/docs/screenshots/04-maintenance-tab.png)

![Project Library — Cloud-synced project gallery with templates](/docs/screenshots/05-library-tab.png)
`
  },
  {
    id: 'pipeline',
    title: 'Prototyping Pipeline',
    icon: 'Workflow',
    content: `
# The Prototyping Pipeline

SUBSTRATA is built around one core idea: **every physical product starts as an idea and ends as a real object.** The app structures this journey into clear stages.

## Stage 1: Ideate

Before you design anything, gather inspiration and define what you're building.

### AI Brainstorming
- Open the **AI Advisor** tab and describe what you want to build
- The advisor uses deep thinking (Gemini Pro) for complex engineering questions
- Ask about materials, feasibility, cost estimates, or design approaches

### Community Sources
Browse real-world projects from the maker community:

| Source | Best For | URL |
|--------|----------|-----|
| **GitHub** | Open-source hardware, firmware, reference designs, schematics | github.com |
| **Thingiverse** | 3D-printable models, remixable designs, parametric files | thingiverse.com |
| **Instructables** | Step-by-step build guides, multi-discipline projects | instructables.com |
| **Hackaday** | Hardware hacking, teardowns, engineering deep-dives, IoT projects | hackaday.io |

### Tips for Ideation
- Search Thingiverse for existing models before designing from scratch — remix is faster than re-inventing
- Check Hackaday for similar projects to learn from others' mistakes
- Use GitHub to find firmware/code you can adapt for your control systems
- Browse Instructables for material and technique ideas you might not have considered

---

## Stage 2: Design

Turn your concept into a visual design — either 2D artwork or a full 3D hardware blueprint.

### 2D Design Path (Design Studio)
1. **Text Prompt**: Describe your design and pick a style (minimalist, deconstructivist, classical, organic)
2. **Voice Prompt**: Hold the mic button and speak your design — transcribed and generated automatically
3. **File Upload**: Import an existing PNG, JPEG, or SVG (up to 10MB)
4. **Templates**: Start from a pre-built template (Geometric Wolf, Mandala, Celtic Knot, etc.)

### 3D Design Path (Prototyping Studio)
1. Describe your hardware project in the Design Objectives textarea
2. Select your target 3D printer (Saturn 3 Ultra Resin, Formbot T-Rex 2 FDM, or Custom)
3. Click **GENERATE BLUEPRINT** — Gemini Pro generates a complete project:
   - Interactive 3D model
   - Bill of Materials with pricing and sourcing
   - STL fabrication files with print parameters
   - Python/Arduino control code

---

## Stage 3: Process

Refine your design with image processing and AI-powered editing.

### Image Processing Pipeline
All images pass through a real-time processing pipeline:

1. **Grayscale Conversion** — Luma-weighted (0.299R + 0.587G + 0.114B)
2. **Brightness Adjustment** — Range: -100% to +100%
3. **Contrast Enhancement** — Factor-based with clamping
4. **Palette Inversion** — Optional color inversion
5. **Binarization** — Choose between:
   - **Floyd-Steinberg Dithering** — Error diffusion for smooth gradients (great for photos)
   - **Sobel Edge Detection** — Extracts edges for cutting/etching paths
   - **Simple Threshold** — Hard black/white split at configurable threshold (0-255)

### Filter Presets
| Preset | Brightness | Contrast | Threshold | Dither | Edge |
|--------|-----------|----------|-----------|--------|------|
| Draft | 0% | 20% | 128 | Off | Off |
| Fine Detail | -10% | 30% | 120 | On | Off |
| High Contrast | 0% | 80% | 128 | On | Off |
| Stencil | 0% | 50% | 150 | Off | On |

### Advanced Editor (Design Synth)
Open the full canvas editor for precision work:

- **Select Tool**: Move and resize elements
- **Box Tool**: Draw rectangular selection areas for masking
- **Eraser**: Brush-based erasing
- **Text**: Add text overlays
- **AI Inpaint**: Select a region and describe what should fill it
- **AI Outpaint**: Extend image edges seamlessly
- **Style Transfer**: Restyle the entire image (e.g., "make it art deco" or "convert to technical drawing")

---

## Stage 4: Fabricate

Generate the files and specs needed to physically manufacture your design.

### 3D Printing
The Prototyping Studio generates fabrication-ready output:
- **STL Files**: Manifests with SLA/FDM print parameters (layer height, exposure time, infill, supports)
- **Printer Support**: Saturn 3 Ultra (Resin/SLA), Formbot T-Rex 2 (FDM), Custom Industrial
- **Bill of Materials**: Parts sourced from Amazon, McMaster-Carr, Pololu, Adafruit, Grainger
- **Sort by**: Cheapest price or fastest shipping (Today, Tomorrow, 2-3 Days, 1-Week)

### Control Code
- Python scripts for motor control, sensor reading, and automation
- Arduino code for microcontroller-based prototypes
- Generated with pin assignments, timing, and communication protocols

---

## Stage 5: Finish

The final fabrication step — laser engraving, cutting, or marking.

### Laser Fabrication
- **9 Material Presets**: Pre-configured power/speed/passes for Kraft paper, Plywood, Solid wood, Bamboo, Cork, Leather, Silica gel, Dark Felt, Tin plate
- **Manual Tuning**: Power (0-100%), Speed (0-5000 mm/min), Passes (1-10)
- **Export Formats**: PNG raster or SVG vector (compatible with LaserGRBL and LightBurn)
- **Canvas Transforms**: Rotate (90° increments), Flip horizontal/vertical

### When to Use Laser Engraving
- **Enclosure marking**: Serial numbers, logos, labels on 3D-printed or machined parts
- **Custom panels**: Control panels, faceplates, bezels with etched text/graphics
- **Decorative finishing**: Wooden covers, leather patches, acrylic inlays
- **Prototyping stencils**: Quick stencils for paint masking or solder paste
- **Jigs and fixtures**: Alignment marks, measurement grids, registration features
`
  },
  {
    id: 'design-guides',
    title: 'Design Guides',
    icon: 'Palette',
    content: `
# Design Guides & Best Practices

## Rapid Prototyping Principles

### 1. Start Rough, Iterate Fast
- Use the AI advisor to quickly validate your concept before committing to CAD
- Generate a 3D blueprint first to understand scale, part count, and cost
- Don't over-detail your first prototype — get the form factor right, then refine

### 2. Design for Manufacturing (DFM)
- **3D Printing**: Avoid overhangs >45° without supports. Use minimum 1.2mm wall thickness for FDM, 0.8mm for SLA
- **Laser Cutting**: Design for the kerf — laser cuts remove ~0.1-0.3mm of material. Adjust tolerances accordingly
- **Assembly**: Design snap-fit joints or screw bosses into your 3D prints to avoid glue

### 3. Material Selection Guide

| Material | Best For | Process | Notes |
|----------|----------|---------|-------|
| **PLA** | Quick prototypes, visual models | FDM 3D Print | Easy to print, brittle, not heat-resistant |
| **PETG** | Functional parts, enclosures | FDM 3D Print | Good strength, slight flexibility, food-safe |
| **ABS** | Heat-resistant parts, automotive | FDM 3D Print | Needs enclosed printer, prone to warping |
| **Resin (Standard)** | High-detail models, miniatures | SLA 3D Print | Smooth finish, brittle, needs post-curing |
| **Resin (Tough)** | Functional parts, snap-fits | SLA 3D Print | ABS-like properties, good for engineering |
| **Plywood** | Enclosures, frames, decorative | Laser Cut/Engrave | 3mm-6mm ideal for laser, cheap and fast |
| **Acrylic** | Windows, light pipes, panels | Laser Cut | Clean edges, available in colors, cracks if forced |
| **Leather** | Patches, covers, accessories | Laser Engrave | Low power, smells terrible, ventilate well |
| **Cork** | Coasters, gaskets, padding | Laser Engrave | Low density, burns easily — use low power |
| **Kraft paper** | Stencils, templates, patterns | Laser Cut | Fastest iteration cycle — cut and test in seconds |

### 4. Design Style Guide

When using AI design generation, choose your style based on the end use:

| Style | Characteristics | Best For |
|-------|----------------|----------|
| **Minimalist** | Clean lines, stark contrast, geometric | Technical labels, modern branding, UI icons |
| **Deconstructivist** | Fragmented, chaotic, non-rectilinear | Art pieces, experimental designs, statement objects |
| **Classical** | Balanced, symmetrical, ornate details | Luxury branding, traditional craft, gift items |
| **Organic** | Fluid curves, voronoi patterns, natural | Biomimetic design, nature-inspired art, jewelry |

---

## Best Practices by Project Type

### Electronics Enclosures
1. Start with a 3D blueprint describing your board dimensions and port locations
2. Generate STL files with proper wall thickness (2mm minimum for FDM)
3. Add laser-engraved labels and port markings to the finished enclosure
4. Use the BOM to source standoffs, screws, and rubber feet

### Robotics Projects
1. Describe your robot's degrees of freedom and actuator types in the Prototyping Studio
2. Review the generated BOM for servos, motors, and structural parts
3. Use the control code generator for Python or Arduino firmware
4. Laser-cut flat structural members from plywood or acrylic
5. 3D print complex joints, mounts, and brackets

### Custom Gifts & Décor
1. Use the AI Design Generator with the **classical** or **organic** style
2. Process through the image pipeline with Floyd-Steinberg dithering for photo engravings
3. Use Sobel edge detection for clean line art on wood or leather
4. Apply material presets for consistent results across multiple pieces

### PCB & Circuit Prototyping
1. Use the AI advisor to discuss circuit design and component selection
2. Generate an enclosure blueprint that accounts for your PCB dimensions
3. Laser-cut a solder paste stencil from Kraft paper or Mylar
4. Engrave component placement guides on the board housing

---

## Image Processing Best Practices

### For Photo Engravings
- Use **Floyd-Steinberg dithering** — it preserves gradients better than simple threshold
- Increase contrast to +30-50% before dithering for more dramatic results
- Set brightness slightly negative (-5 to -15%) to preserve shadow detail
- Test on cardboard first at low power before committing to final material

### For Line Art & Logos
- Use **Sobel edge detection** for automatic edge extraction
- Or use **Stencil preset** (high threshold, edge detection on) for clean black/white
- Invert colors if your design is light-on-dark

### For Cutting Paths
- Enable **Sobel edge detection** to extract cut lines
- Export as SVG for vector-based cutting in LaserGRBL or LightBurn
- Verify closed paths — open paths won't cut properly

### Resolution & Scale
- Generate at 1:1 aspect ratio for square engravings
- The ACMER S1 work area is 130x130mm — design within this boundary
- For larger projects, tile your design and use registration marks
`
  },
  {
    id: 'community',
    title: 'Community Sources',
    icon: 'Globe',
    content: `
# Community Sources & Inspiration

SUBSTRATA connects you to the global maker community. Use these platforms to find inspiration, download existing models, fork open-source hardware, and learn from others' builds.

## GitHub — Open Source Hardware

**Best for**: Firmware, schematics, reference designs, PCB files, documentation

### How to Use
- Search for hardware projects by keyword (e.g., "robot arm", "LED controller", "CNC shield")
- Look for repos with \`hardware\`, \`open-source-hardware\`, \`oshw\`, or \`kicad\` topics
- Check the README for BOM lists and assembly instructions
- Fork and adapt firmware for your specific microcontroller

### Recommended Searches
| Search Query | What You'll Find |
|-------------|-----------------|
| \`topic:open-source-hardware\` | Curated OSHW projects |
| \`topic:3d-printing\` | Printable designs with source files |
| \`topic:arduino\` | Arduino-based projects with code |
| \`topic:raspberry-pi\` | RPi HATs, enclosures, and projects |
| \`kicad PCB layout\` | Open-source circuit board designs |

---

## Thingiverse — 3D Printable Models

**Best for**: Ready-to-print STL files, parametric designs, remixable models

### How to Use
- Search by object type or function (e.g., "servo bracket", "raspberry pi case", "cable management")
- Filter by **Most Makes** to find designs that are proven to print well
- Check the **Remixes** tab for variations and improvements by other makers
- Download STL files and use them as starting points in your Prototyping Studio

### Tips
- Models tagged **Customizer** have adjustable parameters — you can resize before downloading
- Always read maker comments for print settings and gotchas
- Look for multi-part assemblies that demonstrate good mechanical design
- Sort by "Most Popular" to find battle-tested designs

---

## Instructables — Build Guides

**Best for**: Step-by-step tutorials, multi-discipline projects, technique guides

### How to Use
- Browse by category: Technology, Workshop, Craft, Living, Outside
- Follow the step-by-step format to learn new fabrication techniques
- Pay attention to the **Materials & Tools** list — it's the real-world BOM
- Check the comments for tips, corrections, and improvements

### Recommended Categories for Prototyping
| Category | What You'll Find |
|----------|-----------------|
| **Technology > Arduino** | Sensor projects, automation, IoT builds |
| **Technology > Raspberry Pi** | Media centers, robots, home automation |
| **Workshop > 3D Printing** | Print techniques, finishing, multi-material |
| **Workshop > Laser Cutting** | Material guides, jig design, living hinges |
| **Workshop > CNC** | Toolpaths, feeds and speeds, fixtures |
| **Technology > Electronics** | Circuit design, soldering guides, PCB etching |

---

## Hackaday — Hardware Hacking

**Best for**: Engineering deep-dives, teardowns, unique builds, IoT projects

### How to Use
- Browse the project feed on **hackaday.io** for current maker projects
- Read the blog posts on **hackaday.com** for technique articles and teardowns
- Use the project logs to see iteratice development — learn from failures, not just successes
- The comments section often contains expert-level critiques and suggestions

### Why Hackaday is Valuable
- Projects show the **full engineering process**, not just the final result
- Teardowns teach you how commercial products are designed and manufactured
- Articles cover niche techniques (flex PCBs, injection molding at home, resin casting)
- The community skews toward experienced engineers — high signal, low noise

---

## Workflow: Community → SUBSTRATA

Here's how to integrate community sources into your prototyping pipeline:

1. **Find inspiration** — Browse any of the four sources for a project similar to yours
2. **Adapt the concept** — Use the AI Advisor to discuss modifications and improvements
3. **Generate your design** — Describe your adapted idea in the Prototyping Studio
4. **Source parts** — Use the generated BOM or reference the community project's parts list
5. **Fabricate** — Print, cut, and engrave using SUBSTRATA's tools
6. **Share back** — Open-source your improvements on GitHub, post your remix on Thingiverse
`
  },
  {
    id: 'features',
    title: 'Feature Reference',
    icon: 'Sparkles',
    content: `
# Feature Reference

## 1. 3D Prototyping Studio

The Prototyping Studio is an AI-powered hardware design engine that generates complete prototyping blueprints from text descriptions.

![3D Prototyping Studio — Generate complete hardware blueprints from text descriptions](/docs/screenshots/01-prototyping-studio.png)

### Workflow
1. Describe your hardware project in the Design Objectives textarea
2. Select your target 3D printer (Saturn 3 Ultra Resin, Formbot T-Rex 2 FDM, or Custom)
3. Click **GENERATE BLUEPRINT** — Gemini Pro generates a complete project

### Generated Outputs
- **3D Workspace**: Interactive Three.js viewport with orbit controls and multi-light staging
- **Bill of Materials**: Parts list with pricing, sourcing (Amazon, McMaster-Carr, Pololu, Adafruit), and shipping speed
- **Fabrication Files**: STL file manifest with SLA/FDM print parameters (layer height, exposure time, infill, supports)
- **Control Code**: Python/Arduino code for the prototype

### BOM Features
- Sort by **Fastest Ship** or **Cheapest** price
- Each part shows: name, source, specs, price, delivery estimate
- External links to suppliers

---

## 2. Design Studio

The Design Studio is where you create, upload, and process 2D designs for fabrication.

![Design Studio — Image generation, processing, and fabrication preparation](/docs/screenshots/02-laser-studio.png)

### Image Input Methods
- **File Upload**: Drag or click to upload PNG, JPEG, or SVG files (up to 10MB)
- **AI Generation**: Type a text prompt (or use voice) to generate a design in 4 styles
- **Template Library**: Choose from pre-built templates (Geometric Wolf, Mandala, Celtic Knot, etc.)
- **Voice Input**: Hold the microphone button to dictate a prompt, transcribed by Gemini

### Canvas Transforms
- **Rotate**: 90° clockwise increments
- **Flip Horizontal / Vertical**: Mirror the image

### Export Options
- **PNG Export**: Raster image download
- **SVG Export**: Vector wrapper for compatibility with LaserGRBL/LightBurn

---

## 3. AI Prototyping Advisor

A chat-based AI expert covering the full spectrum of rapid prototyping — materials science, mechanical engineering, electronics, fabrication techniques, design principles, and more.

![AI Prototyping Advisor — Expert chat interface with voice TTS responses](/docs/screenshots/03-advisor-tab.png)

### Capabilities
- **Full-spectrum prototyping advice**: Materials, design, fabrication, electronics, mechanical engineering, sourcing
- **Laser engraving expertise**: Material-specific settings, safety, troubleshooting for the ACMER S1
- **Design critique**: Describe your concept and get engineering feedback
- **Deep Thinking Mode**: Toggle for complex queries (uses Gemini Pro with HIGH thinking level)
- **Voice I/O**: Voice prompts (mic) and TTS responses (Kore voice, 5 options)
- **Tool Use**: Can save material presets directly from conversation
- **Google Search Grounding**: Real-time information retrieval for up-to-date specs and pricing

### Example Questions
- "What's the best material for a waterproof electronics enclosure?"
- "How do I design snap-fit joints for 3D-printed parts?"
- "What power and speed should I use to engrave on bamboo?"
- "Compare FDM vs SLA for functional prototypes"
- "Help me design a living hinge in plywood"
- "What's the cheapest way to prototype a custom PCB enclosure?"

---

## 4. Advanced Editor (Design Synth)

A full-featured canvas editor powered by Konva and Gemini AI synthesis.

### Tools
- **Select**: Move and resize elements
- **Box Tool**: Draw rectangular selection areas for masking
- **Eraser**: Brush-based erasing (composited as destination-out)
- **Text**: Add text overlays with custom positioning

### AI Synthesis Modes
- **Inpaint Mask**: AI fills selected regions based on a text prompt
- **Outpaint Edge**: AI extends the image beyond its boundaries
- **Style Transfer**: AI redraws the entire image in a specified style

---

## 5. Laser Fabrication

Laser engraving and cutting is the **finishing step** in the prototyping pipeline — used for marking, labeling, decorating, or cutting flat parts.

### Laser Parameters
- **Power Output**: 0-100% (default 80%)
- **Speed**: 0-5000 mm/min (default 2000)
- **Passes**: 1-10 (default 1)
- **Smart Presets**: Pre-configured for 9 materials

### Material Presets

| Material | Power | Speed | Passes | Mode |
|----------|-------|-------|--------|------|
| Kraft paper | 80% | 3000 mm/min | 1 | M4 |
| Plywood | 90% | 1500 mm/min | 1 | M4 |
| Solid wood | 90% | 1000 mm/min | 1 | M4 |
| Bamboo | 90% | 1000 mm/min | 1 | M4 |
| Cork | 90% | 1000 mm/min | 1 | M4 |
| Leather | 60% | 1500 mm/min | 1 | M4 |
| Silica gel | 80% | 1000 mm/min | 1 | M4 |
| Dark Felt | 60% | 1500 mm/min | 1 | M4 |
| Tin plate | 80% | 2500 mm/min | 1 | M4 |

---

## 6. Maintenance Dashboard

Machine health monitoring and troubleshooting.

![Maintenance Dashboard — Safety checks, machine stats, and troubleshooting guides](/docs/screenshots/04-maintenance-tab.png)

### Status Cards
- **Safety**: Goggles verification, exhaust system status
- **Maintenance**: Lens cleanliness percentage, next maintenance due
- **Statistics**: Total operational hours, safety compliance rate, cut count

### Troubleshooting Guides
- **Link / Discovery** (Low difficulty): USB driver setup, cable management
- **Burn Quality** (Medium difficulty): Focal point adjustment, speed/power ratios, air assist
- **GRBL Alarm 2** (Expert difficulty): Soft limit resolution, coordinate homing

---

## 7. Project Library

Cloud-backed project management with Google authentication.

![Project Library — Cloud-synced project gallery with templates](/docs/screenshots/05-library-tab.png)

### Features
- **New Project**: Start fresh
- **Saved Projects**: Auto-synced to Firestore with thumbnails
- **Project Actions**: Open, Rename, Duplicate, Share (clipboard), Delete
- **Stock Templates**: Curated templates across categories (Animal, Decor, Home, Gift, Nature, Fantasy, Mechanical, Nautical)
- **Batch Import**: Add all templates to your library in one click
`
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: 'Code',
    content: `
# API Reference

## geminiService.ts

### \`generateDesign(prompt, style?, aspectRatio?)\`
Generates a design image using Gemini 3.1 Flash Image Preview.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| prompt | string | — | Design description |
| style | string | "minimalist" | One of: minimalist, deconstructivist, classical, organic |
| aspectRatio | string | "1:1" | Output aspect ratio |

**Returns**: \`Promise<string | null>\` — Base64 data URL of the generated PNG

---

### \`analyzeMaterial(imageBase64)\`
Analyzes a material image and suggests optimal fabrication approach and settings.

| Parameter | Type | Description |
|-----------|------|-------------|
| imageBase64 | string | Base64-encoded image (data URL) |

**Returns**: \`Promise<string>\` — Text analysis with material identification and recommended settings

**Model**: Gemini 3.1 Pro Preview

---

### \`consultAdvisor(query, history?, useThinking?)\`
Chat with the AI prototyping advisor.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| query | string | — | User message |
| history | Array | [] | Previous conversation messages |
| useThinking | boolean | false | Enable deep thinking (Gemini Pro + HIGH thinking level) |

**Returns**: \`Promise<{ text: string, calls: FunctionCall[] }>\`

**Tools Available**:
- \`save_material_preset\` — Saves power/speed/passes settings for a named material

---

### \`synthesizeImageEdition(mode, prompt, imageBase64?, maskBase64?)\`
AI-powered image editing for the Advanced Editor.

| Parameter | Type | Description |
|-----------|------|-------------|
| mode | \`'inpaint' \\| 'outpaint' \\| 'generate' \\| 'style'\` | Editing mode |
| prompt | string | What to generate/modify |
| imageBase64 | string? | Source image |
| maskBase64 | string? | Mask image for inpainting |

**Returns**: \`Promise<string | null>\` — Modified image as data URL

---

### \`transcribeSpokenPrompt(audioBase64)\`
Transcribes audio to text for voice-driven design prompts.

| Parameter | Type | Description |
|-----------|------|-------------|
| audioBase64 | string | Base64-encoded WAV audio |

**Returns**: \`Promise<string>\` — Transcribed text

---

## ttsService.ts

### \`speakText(text, voice?)\`
Converts text to speech using Gemini Flash TTS.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| text | string | — | Text to speak |
| voice | string | "Kore" | One of: Puck, Charon, Kore, Fenrir, Zephyr |

**Returns**: \`Promise<void>\` — Plays audio via Web Audio API (24kHz, Int16 → Float32)

### \`cancelSpeech()\`
Stops any currently playing TTS audio.

---

## projectService.ts

### \`saveProject(project)\`
Creates or updates a project in Firestore.

| Parameter | Type | Description |
|-----------|------|-------------|
| project | Partial\\<Project\\> | Project data (id, name, images, settings) |

**Path**: \`users/{uid}/projects/{projectId}\`

### \`getProjects()\`
Fetches all projects for the authenticated user, ordered by \`updatedAt\` descending.

**Returns**: \`Promise<Project[]>\`

### \`renameProject(projectId, newName)\`
Updates only the project name and \`updatedAt\` timestamp.

### \`deleteProject(projectId)\`
Permanently removes a project document.

---

## imageProcessor.ts

### \`processImage(imageSource, options)\`
Full image processing pipeline.

| Parameter | Type | Description |
|-----------|------|-------------|
| imageSource | string \\| HTMLImageElement | Image source (URL or element) |
| options | ImageProcessOptions | Processing configuration |

**ImageProcessOptions**:
\`\`\`typescript
interface ImageProcessOptions {
  brightness: number;    // -1 to 1
  contrast: number;      // -1 to 1
  threshold: number;     // 0 to 255
  dither: boolean;       // Floyd-Steinberg dithering
  invert: boolean;       // Invert palette
  edgeDetection: boolean; // Sobel edge detection
  rotate: number;        // 0, 90, 180, 270
  flipH: boolean;        // Horizontal flip
  flipV: boolean;        // Vertical flip
}
\`\`\`

**Returns**: \`Promise<string>\` — Processed image as PNG data URL

**Processing Pipeline**:
1. Load image onto Canvas
2. Apply rotation + flip transforms
3. Convert to grayscale (luma-weighted)
4. Apply brightness offset
5. Apply contrast factor
6. Optional inversion
7. Apply filter: Floyd-Steinberg dithering, Sobel edge detection, or simple threshold
`
  },
  {
    id: 'security',
    title: 'Security',
    icon: 'Shield',
    content: `
# Security Architecture

## Authentication
- **Provider**: Firebase Authentication with Google Sign-In
- **Requirement**: Email must be verified (\`email_verified == true\`)
- **Session**: Managed by Firebase SDK (automatic token refresh)

## Data Isolation
All user data is strictly sandboxed under \`/users/{auth.uid}/\`. Cross-user access is impossible at the database level.

## Firestore Security Rules

### Access Control Matrix

| Operation | Path | Rule |
|-----------|------|------|
| Read Profile | \`/users/{uid}/profile\` | Owner only |
| Create Profile | \`/users/{uid}/profile\` | Owner + valid schema + server timestamp |
| Update Profile | \`/users/{uid}/profile\` | Owner + only displayName/photoURL mutable |
| List Projects | \`/users/{uid}/projects\` | Owner only |
| Get Project | \`/users/{uid}/projects/{pid}\` | Owner only |
| Create Project | \`/users/{uid}/projects/{pid}\` | Owner + valid ID + valid schema |
| Update Project | \`/users/{uid}/projects/{pid}\` | Owner + immutable: id, userId, createdAt |
| Delete Project | \`/users/{uid}/projects/{pid}\` | Owner only |

### Validation Rules
- **ID Format**: \`^[a-zA-Z0-9_\\-]+$\`, max 128 characters
- **Project Schema**: Required fields: id, name, userId, createdAt, updatedAt. Max 10 fields.
- **Image Size Limit**: 1MB per image field (originalImage, processedImage)
- **Name Length**: Max 128 characters
- **Timestamp Integrity**: createdAt set once on creation, updatedAt must equal server time

### Security Test Vectors ("Dirty Dozen")
12 attack vectors tested and verified:

1. Identity Spoofing → DENIED
2. Omission Attack → DENIED  
3. Immutability Breach → DENIED
4. Cross-User Read → DENIED
5. Cross-User Delete → DENIED
6. Ghost Field Injection → DENIED
7. Temporal Spoofing → DENIED
8. Resource Poisoning → DENIED
9. Unauthenticated Write → DENIED
10. Profile Hijacking → DENIED
11. Malformed ID → DENIED
12. State Shortcutting → DENIED

## API Key Management
- Gemini API key is injected at build time via Vite's \`define\` plugin
- All keys loaded from \`.env\` file (not committed to version control)
- Firebase config loaded from environment variables

## Global Safety Net
A catch-all rule denies all reads and writes by default:
\`\`\`
match /{document=**} {
  allow read, write: if false;
}
\`\`\`
Specific paths are then explicitly opened with validation.
`
  },
  {
    id: 'setup',
    title: 'Setup & Deployment',
    icon: 'Wrench',
    content: `
# Setup & Deployment

## Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API Key
- Firebase Project with Firestore + Auth enabled

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/danieljtrujillo/substrata-by-gantasmo.git
cd substrata-by-gantasmo

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your API keys and Firebase config

# Start development server
npm run dev
\`\`\`

The app will be available at \`http://localhost:3000\`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`GEMINI_API_KEY\` | Yes | Google Gemini API key for AI features |
| \`VITE_FIREBASE_API_KEY\` | Yes | Firebase web API key |
| \`VITE_FIREBASE_AUTH_DOMAIN\` | Yes | Firebase auth domain |
| \`VITE_FIREBASE_PROJECT_ID\` | Yes | Firebase project ID |
| \`VITE_FIREBASE_STORAGE_BUCKET\` | Yes | Firebase storage bucket |
| \`VITE_FIREBASE_MESSAGING_SENDER_ID\` | Yes | Firebase messaging sender ID |
| \`VITE_FIREBASE_APP_ID\` | Yes | Firebase app ID |
| \`VITE_FIREBASE_FIRESTORE_DB_ID\` | Yes | Firestore database ID |
| \`VITE_FIREBASE_MEASUREMENT_ID\` | No | Firebase analytics measurement ID |

## Build Commands

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start dev server on port 3000 |
| \`npm run build\` | Production build to \`dist/\` |
| \`npm run preview\` | Preview production build |
| \`npm run clean\` | Remove \`dist/\` directory |
| \`npm run lint\` | TypeScript type checking |

## Deploying Firestore Rules

\`\`\`bash
firebase deploy --only firestore:rules
\`\`\`

## Project Structure Quick Reference

\`\`\`
substrata-by-gantasmo/
├── src/
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # React entry point
│   ├── index.css               # Global styles + glassmorphism theme
│   ├── constants.ts            # Material presets & templates
│   ├── components/
│   │   ├── PrototypingStudio.tsx   # 3D AI prototyping
│   │   ├── AdvancedEditor.tsx      # Konva image editor
│   │   └── DocumentationViewer.tsx # In-app documentation
│   ├── docs/
│   │   └── documentationContent.ts # Documentation data
│   ├── services/
│   │   ├── geminiService.ts    # Gemini API wrapper
│   │   ├── ttsService.ts       # Text-to-speech
│   │   └── projectService.ts   # Firestore CRUD
│   └── lib/
│       ├── firebase.ts         # Firebase init + auth
│       └── imageProcessor.ts   # Image processing pipeline
├── components/ui/              # shadcn/ui components
├── public/docs/screenshots/    # App feature screenshots
├── firestore.rules             # Security rules
├── security_spec.md            # Security test spec
├── vite.config.ts              # Vite + Tailwind config
└── package.json                # Dependencies
\`\`\`
`
  },
  {
    id: 'diagrams',
    title: 'Architecture Diagrams',
    icon: 'GitBranch',
    content: `
# Architecture Diagrams

## System Architecture

\`\`\`mermaid
graph TB
    subgraph Client["Browser Client - React + Vite"]
        App["App.tsx — Main Orchestrator"]
        PS["PrototypingStudio.tsx — 3D Hardware Engine"]
        AE["AdvancedEditor.tsx — Canvas Editor"]
        subgraph Services["Service Layer"]
            GS["geminiService.ts — AI Generation"]
            TTS["ttsService.ts — Text-to-Speech"]
            ProjS["projectService.ts — CRUD"]
        end
        subgraph Libs["Core Libraries"]
            IP["imageProcessor.ts — Dithering / Edge Detect"]
            FB["firebase.ts — Auth + Firestore"]
            CONST["constants.ts — Material Presets"]
        end
    end
    subgraph External["External Services"]
        Gemini["Google Gemini API"]
        Firebase["Firebase Auth + Firestore"]
        ThreeJS["Three.js / R3F"]
    end
    subgraph Community["Community Sources"]
        GH["GitHub — Open Source Hardware"]
        TV["Thingiverse — 3D Models"]
        INS["Instructables — Build Guides"]
        HD["Hackaday — Engineering Projects"]
    end
    App --> PS
    App --> AE
    App --> GS
    App --> TTS
    App --> ProjS
    PS --> GS
    PS --> ThreeJS
    AE --> GS
    GS --> Gemini
    TTS --> Gemini
    ProjS --> Firebase
    FB --> Firebase
    App -.->|Inspiration| Community
\`\`\`

## Prototyping Pipeline

\`\`\`mermaid
flowchart LR
    subgraph Ideate["1. Ideate"]
        Advisor["AI Advisor"]
        Browse["Community Sources"]
    end
    subgraph Design["2. Design"]
        TextPrompt["Text/Voice Prompt"]
        Upload["Image Upload"]
        Template["Template"]
        Blueprint["3D Blueprint"]
    end
    subgraph Process["3. Process"]
        ImgProc["Image Processing"]
        Dither["Dithering"]
        Edge["Edge Detection"]
        CanvasEdit["Canvas Editor"]
    end
    subgraph Fabricate["4. Fabricate"]
        Print3D["3D Print (STL)"]
        BOM["Bill of Materials"]
        Code["Control Code"]
    end
    subgraph Finish["5. Finish"]
        LaserEng["Laser Engrave"]
        LaserCut["Laser Cut"]
        ExportPNG["PNG Export"]
        ExportSVG["SVG Export"]
    end
    Ideate --> Design
    Design --> Process
    Process --> Fabricate
    Fabricate --> Finish
    TextPrompt --> ImgProc
    TextPrompt --> Blueprint
    Upload --> ImgProc
    Template --> ImgProc
    ImgProc --> Dither
    ImgProc --> Edge
    ImgProc --> CanvasEdit
    Blueprint --> Print3D
    Blueprint --> BOM
    Blueprint --> Code
    Dither --> ExportPNG
    Edge --> ExportSVG
    ExportPNG --> LaserEng
    ExportSVG --> LaserCut
\`\`\`

## User Workflow Sequence

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant App as App.tsx
    participant GS as geminiService
    participant IP as imageProcessor
    participant AE as AdvancedEditor
    participant PS as PrototypingStudio
    participant FB as Firebase
    U->>App: Describe project idea
    alt 3D Prototyping Path
        App->>PS: Design objectives + printer selection
        PS->>GS: Generate blueprint (Gemini Pro)
        GS-->>PS: 3D model + BOM + STL + Code
        PS-->>App: Display interactive results
    end
    alt 2D Design Path
        App->>GS: generateDesign(prompt, style)
        GS-->>App: Base64 PNG Image
        App->>IP: processImage(image, options)
        IP-->>App: Processed DataURL
    end
    U->>App: Open Advanced Editor
    App->>AE: Pass image
    U->>AE: AI Synthesis (inpaint/outpaint/style)
    AE->>GS: synthesizeImageEdition(mode, prompt)
    GS-->>AE: AI-modified image
    AE-->>App: Commit changes
    U->>App: Export (PNG/SVG) or Save
    App->>FB: saveProject(data)
    FB-->>App: Success
\`\`\`

## Data Model

\`\`\`mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    USER {
        string uid PK
        string email
        string displayName
        string photoURL
        timestamp createdAt
    }
    PROJECT {
        string id PK
        string name
        string userId FK
        string originalImage
        string processedImage
        json fabricationSettings
        json procOptions
        timestamp createdAt
        timestamp updatedAt
    }
    FABRICATION_SETTINGS {
        number power
        number speed
        number passes
        string mode
        number quality
    }
    IMAGE_OPTIONS {
        number brightness
        number contrast
        number threshold
        boolean dither
        boolean invert
        boolean edgeDetection
        number rotate
        boolean flipH
        boolean flipV
    }
    PROJECT ||--|| FABRICATION_SETTINGS : contains
    PROJECT ||--|| IMAGE_OPTIONS : contains
\`\`\`
`
  }
];

export const MERMAID_DIAGRAMS = {
  architecture: `graph TB
    subgraph Client["Browser Client - React + Vite"]
        App["App.tsx — Main Orchestrator"]
        PS["PrototypingStudio.tsx — 3D Hardware Engine"]
        AE["AdvancedEditor.tsx — Canvas Editor"]
        subgraph Services["Service Layer"]
            GS["geminiService.ts — AI Generation"]
            TTS["ttsService.ts — Text-to-Speech"]
            ProjS["projectService.ts — CRUD"]
        end
        subgraph Libs["Core Libraries"]
            IP["imageProcessor.ts — Dithering / Edge Detect"]
            FB["firebase.ts — Auth + Firestore"]
            CONST["constants.ts — Material Presets"]
        end
    end
    subgraph External["External Services"]
        Gemini["Google Gemini API"]
        Firebase["Firebase Auth + Firestore"]
        ThreeJS["Three.js / R3F"]
    end
    App --> PS
    App --> AE
    App --> GS
    App --> TTS
    App --> ProjS
    PS --> GS
    PS --> ThreeJS
    AE --> GS
    GS --> Gemini
    TTS --> Gemini
    ProjS --> Firebase
    FB --> Firebase`,
  pipeline: `flowchart LR
    subgraph Ideate["1. Ideate"]
        Advisor["AI Advisor"]
        Browse["Community Sources"]
    end
    subgraph Design["2. Design"]
        TextPrompt["Text/Voice Prompt"]
        Upload["Image Upload"]
        Blueprint["3D Blueprint"]
    end
    subgraph Process["3. Process"]
        ImgProc["Image Processing"]
        CanvasEdit["Canvas Editor"]
    end
    subgraph Fabricate["4. Fabricate"]
        Print3D["3D Print"]
        BOM["Bill of Materials"]
    end
    subgraph Finish["5. Finish"]
        Laser["Laser Engrave/Cut"]
        Export["PNG/SVG Export"]
    end
    Ideate --> Design --> Process --> Fabricate --> Finish`,
  sequence: `sequenceDiagram
    participant U as User
    participant App as App.tsx
    participant GS as geminiService
    participant IP as imageProcessor
    participant AE as AdvancedEditor
    participant PS as PrototypingStudio
    participant FB as Firebase
    U->>App: Describe project idea
    alt 3D Path
        App->>PS: Generate blueprint
        PS->>GS: Gemini Pro
        GS-->>PS: 3D + BOM + STL + Code
    end
    alt 2D Path
        App->>GS: generateDesign(prompt)
        GS-->>App: PNG Image
        App->>IP: processImage(options)
        IP-->>App: Processed Image
    end
    U->>App: Save Project
    App->>FB: saveProject(data)
    FB-->>App: Success`,
  dataModel: `erDiagram
    USER ||--o{ PROJECT : owns
    USER {
        string uid PK
        string email
        string displayName
        timestamp createdAt
    }
    PROJECT {
        string id PK
        string name
        string userId FK
        string originalImage
        string processedImage
        json fabricationSettings
        json procOptions
        timestamp createdAt
        timestamp updatedAt
    }`
};
