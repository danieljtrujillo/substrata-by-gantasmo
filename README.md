<div align="center">

# SUBSTRATA
### *by*
# GANTASMO

**The open-source command center for rogue engineers, garage-lab inventors, and anyone who thinks "buy it off the shelf" is a moral failing.**

*Ideate · Design · Fabricate · Engrave · Ship*

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini_AI-3.1-4285F4?logo=google&logoColor=white)

</div>

---

## Overview

SUBSTRATA is the full-stack prototyping war room you build when you're sick of duct-taping twelve browser tabs together. AI image generation, parametric 3D modeling, laser G-code pipelines, real-time material analysis, wiring diagrams, and firmware scaffolding all live in one dark-mode glassmorphism cockpit that runs on caffeine and Gemini 3.1.

Point it at a napkin sketch or scream "hexapod robot" into your mic. The AI advisor decomposes it into subsystems, pulls from a built-in database of 30+ real components and 12 battle-tested design templates, applies DFM rules for your printer and laser, and (when you give the word) generates OpenSCAD, SVG cut files, and pin-by-pin wiring in one shot. Then you hit print.

The **persistent AI Design Advisor** sits in the corner of every screen. Co-pilot, enabler, mad-scientist hype man. It knows your components, your constraints, and community projects across GitHub, Thingiverse, Hackaday, and Instructables. Give it an idea and it starts building.

### Screenshots

| Prototyping Studio | Design Studio | AI Advisor |
|---|---|---|
| ![3D Prototyping](public/docs/screenshots/01-prototyping-studio.png) | ![Design Studio](public/docs/screenshots/02-laser-studio.png) | ![Advisor](public/docs/screenshots/03-advisor-tab.png) |

| Maintenance Dashboard | Project Library |
|---|---|
| ![Maintenance](public/docs/screenshots/04-maintenance-tab.png) | ![Library](public/docs/screenshots/05-library-tab.png) |

---

## The Prototyping Pipeline

SUBSTRATA structures every project as a pipeline with these stages:

```
 IDEATE ──→ DESIGN ──→ PROCESS ──→ FABRICATE ──→ FINISH
   │           │          │            │            │
   │   AI Design     Image proc   3D print    Laser engrave
   │   Advisor        dithering    SLA/FDM     marking/cutting
   │   (persistent)   edge detect  OpenSCAD    material presets
   │   Component DB   filters      SVG parts   export to G-code
   │   Template DB    canvas edit  Wiring      PNG/SVG output
   │   Design         AI inpaint   Assembly    Community refs
   │   Practices      outpaint     steps
   └── Browse GitHub, Thingiverse, Instructables, Hackaday, GrabCAD
```

---

## Features

### 🧊 3D Prototyping Studio
- Describe any hardware project and Gemini Pro generates a complete blueprint with design files, BOM, assembly instructions, and control code
- Parametric OpenSCAD 3D part definitions: `.scad` files you can render, modify, and print
- SVG laser-cut layouts with vector paths for flat parts, mounting plates, and structural members, ready for LaserGRBL/LightBurn
- Pin-by-pin wiring diagrams for microcontrollers, sensors, and actuators
- Numbered build instructions generated from the design
- Three.js viewport with orbit controls and multi-light staging
- Auto-generated parts list with pricing from Amazon, McMaster-Carr, Pololu, Adafruit, and Grainger, sortable by price or shipping speed
- Design rationale and links to relevant open-source projects included with every blueprint
- 30+ real components (servos, MCUs, sensors, LEDs, power supplies) with specs and prices injected into AI context
- 12 project archetypes (hexapod, quadruped, robotic arm, wheeled rover, LED doorknob, weather station, macro keypad, kinetic sculpture, voronoi lamp, gear clock, drone frame, plant monitor) with subsystem breakdowns

### 🎨 Design Studio
- Text and voice prompts via Gemini Flash Image with 4 design styles (minimalist, deconstructivist, classical, organic)
- Image processing pipeline: grayscale conversion, Floyd-Steinberg dithering, Sobel edge detection, brightness/contrast/threshold
- Pre-built design templates across categories
- Canvas transforms: rotate (90° increments), flip horizontal/vertical
- Export to PNG raster and SVG vector formats

### 🖌️ Advanced Editor (Design Synth)
- Konva canvas with selection, box draw, eraser brush, and text overlay tools
- AI inpainting fills masked regions with generated content
- AI outpainting extends images beyond their boundaries
- Style transfer restyles entire images with a text prompt

### 🔧 Laser Fabrication
- 9 pre-configured material profiles (Kraft paper, Plywood, Wood, Bamboo, Cork, Leather, Silica gel, Felt, Tin plate)
- Power/speed/passes control fine-tuned for the ACMER S1 diode laser
- SVG vector output for LaserGRBL and LightBurn

### 🤖 AI Design Advisor (Persistent)
- Floating panel in the bottom-right corner of every screen, accessible from any view
- Breaks your idea into subsystems, identifies components, and suggests fabrication methods
- References 30+ real components (SG90 servos, ESP32, Arduino Nano, MPU6050, WS2812B LEDs, etc.) with specs and prices
- Built-in DFM rules for 3D printing, laser cutting, electronics layout, and mechanical design
- When your idea is ready, the advisor calls `generate_blueprint` to switch to the Prototyping Studio and start generation
- "Build Blueprint from Discussion" button compiles your conversation into a blueprint prompt
- Deep thinking mode via Gemini Pro with high-level reasoning
- Voice prompts and TTS responses (5 voice options)
- Can save material presets and trigger blueprint generation directly from conversation
- Google Search grounding for real-time information retrieval

### 🌐 Community Inspiration and Reference Databases
- GitHub: open-source hardware projects, reference designs, and firmware
- Thingiverse: 3D-printable models and remixable designs
- Instructables: step-by-step project guides and build tutorials
- Hackaday: hardware hacking projects, teardowns, and engineering write-ups
- GrabCAD: professional CAD models and engineering references
- Adafruit Learn: electronics tutorials and component guides
- Community sources are automatically referenced in AI advisor and blueprint generation prompts

### 🔒 Machine Maintenance
- Safety status monitoring (goggles, exhaust)
- Lens cleanliness tracking and maintenance scheduling
- Operational statistics and troubleshooting guides

### 📁 Project Library
- Google Auth with cloud storage via Firestore
- Save/Load/Rename/Duplicate/Share/Delete projects
- Curated stock templates across categories

### 📖 In-App Documentation
- Searchable documentation accessible from the **Docs** tab
- Design guides, best practices, and material reference tables
- Export as HTML or PDF

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Browser Client (React)                    │
│                                                          │
│   App.tsx ─── PrototypingStudio ─── AdvancedEditor       │
│      │              │                                    │
│      │        designDatabase.ts                          │
│      │        (templates · components · practices)        │
│      │                                                   │
│   ┌──┴────────────────────────────────────────────────┐  │
│   │              Service Layer                         │  │
│   │  geminiService · ttsService · projectService       │  │
│   │  (blueprint gen · advisor · design file output)    │  │
│   └──┬────────────────────────────────────────────────┘  │
│      │                                                   │
│   ┌──┴────────────────────────────────────────────────┐  │
│   │              Library Layer                         │  │
│   │  imageProcessor · firebase · constants             │  │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
│   ┌─────────────────────────────────────────────────┐    │
│   │  Persistent Advisor Panel (floating, bottom-right)│   │
│   │  → triggers blueprint gen via tool call           │   │
│   └─────────────────────────────────────────────────┘    │
└──────────────┬──────────────┬──────────────┬─────────────┘
               │              │              │
          Gemini API    Firebase       Three.js
               │
    ┌──────────┴──────────────┐
    │  Community APIs          │
    │  GitHub · Thingiverse    │
    │  Instructables · Hackaday│
    │  GrabCAD · Adafruit Learn│
    └─────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6.2 |
| Styling | Tailwind CSS 4.1 (glassmorphism theme) |
| UI Components | shadcn/ui (Radix + CVA) |
| 3D Engine | Three.js (React Three Fiber + Drei) |
| Canvas Editor | Konva + react-konva |
| AI | Google Gemini API (Pro, Flash, Flash Image, Flash TTS) |
| Auth and DB | Firebase (Google Auth + Firestore) |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |

### Key AI Models

| Model | Usage |
|-------|-------|
| `gemini-3.1-flash-image-preview` | Design generation, AI canvas synthesis (inpaint/outpaint/style) |
| `gemini-3.1-pro-preview` | Blueprint generation, material analysis, expert advisor (deep thinking) |
| `gemini-3-flash-preview` | Chat advisor, audio transcription |
| `gemini-3.1-flash-tts-preview` | Text-to-speech |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Google Gemini API Key
- Firebase project with Auth + Firestore enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/danieljtrujillo/substrata-by-gantasmo.git
cd substrata-by-gantasmo

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and Firebase config

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_FIRESTORE_DB_ID=your-db-id
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run clean` | Remove dist/ |
| `npm run lint` | TypeScript type checking |

---

## Project Structure

```
src/
├── App.tsx                      # Main application + persistent advisor panel
├── main.tsx                     # React entry point
├── index.css                    # Global styles + glassmorphism theme
├── constants.ts                 # Material presets & project templates
├── designDatabase.ts            # Component DB, design templates, DFM practices
├── components/
│   ├── PrototypingStudio.tsx    # 3D AI prototyping engine (OpenSCAD/SVG/wiring)
│   ├── AdvancedEditor.tsx       # Konva canvas editor
│   └── DocumentationViewer.tsx  # In-app docs with export
├── docs/
│   └── documentationContent.ts  # Documentation data
├── services/
│   ├── geminiService.ts         # Gemini API wrapper + blueprint generation
│   ├── ttsService.ts            # Text-to-speech
│   └── projectService.ts       # Firestore CRUD
└── lib/
    ├── firebase.ts              # Firebase init + auth
    └── imageProcessor.ts        # Image processing pipeline
```

---

## Security

- Firebase Google Sign-In authentication with email verification
- All data sandboxed under `/users/{uid}/`
- Firestore rules hardened with schema validation, immutability constraints, and 1MB image limits
- Catch-all rule blocks all access by default; specific paths whitelisted
- 12 attack vectors ("Dirty Dozen") verified, see [security_spec.md](security_spec.md)
- API keys injected at build time via Vite, never committed to source

---

## Documentation

Full documentation is available in three ways:

1. Click the **Docs** tab in the navigation bar for the in-app viewer
2. From the Docs tab, click **HTML** to download an interactive offline reference
3. From the Docs tab, click **PDF** to generate a print-ready document

Documentation covers Overview, Prototyping Pipeline, Design Guides and Best Practices, Feature Reference, API Reference, Community Sources, Security, and Setup.

---

## License

SPDX-License-Identifier: Apache-2.0
