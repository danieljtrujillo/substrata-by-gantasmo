<div align="center">

# SUBSTRATA *by* GANTASMO

**AI-Powered Rapid Prototyping Suite**

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

SUBSTRATA is a full-stack rapid prototyping suite that takes your idea from concept to physical object. It combines AI-powered design generation, 2D/3D modeling, image processing, fabrication planning, laser engraving, and cloud project management into one end-to-end pipeline.

Whether you're designing a robot chassis, a custom PCB enclosure, a laser-cut coaster, or a 3D-printed mount, SUBSTRATA handles every stage — from brainstorming and sourcing parts to generating fabrication-ready files.

### Screenshots

| Prototyping Studio | Design Studio | AI Advisor |
|---|---|---|
| ![3D Prototyping](docs/screenshots/01-prototyping-studio.png) | ![Design Studio](docs/screenshots/02-laser-studio.png) | ![Advisor](docs/screenshots/03-advisor-tab.png) |

| Maintenance Dashboard | Project Library |
|---|---|
| ![Maintenance](docs/screenshots/04-maintenance-tab.png) | ![Library](docs/screenshots/05-library-tab.png) |

---

## The Prototyping Pipeline

SUBSTRATA structures every project as a pipeline with these stages:

```
 IDEATE ──→ DESIGN ──→ PROCESS ──→ FABRICATE ──→ FINISH
   │           │          │            │            │
   │   AI text/voice  Image proc   3D print    Laser engrave
   │   prompts        dithering    SLA/FDM     marking/cutting
   │   community      edge detect  BOM/parts   material presets
   │   inspiration    filters      STL files   export to G-code
   │                  canvas edit  code gen     PNG/SVG output
   └── Browse GitHub, Thingiverse, Instructables, Hackaday
```

---

## Features

### 🧊 3D Prototyping Studio
- **AI Blueprint Generation**: Describe any hardware project — Gemini Pro generates a complete blueprint with 3D model, BOM, fabrication files, and control code
- **Interactive 3D Viewer**: Three.js viewport with orbit controls, multi-light staging
- **Bill of Materials**: Auto-generated parts list with pricing from Amazon, McMaster-Carr, Pololu, Adafruit, Grainger — sortable by price or shipping speed
- **Fabrication Files**: STL manifest with SLA/FDM print parameters for Saturn 3 Ultra, Formbot T-Rex 2, or custom printers
- **Control Code**: Python/Arduino code generation for robotics, actuators, and sensors

### 🎨 Design Studio
- **AI Design Generation**: Text and voice prompts via Gemini Flash Image — supports 4 design styles (minimalist, deconstructivist, classical, organic)
- **Image Processing Pipeline**: Grayscale conversion, Floyd-Steinberg dithering, Sobel edge detection, brightness/contrast/threshold
- **Template Library**: Pre-built design templates across categories
- **Canvas Transforms**: Rotate (90° increments), flip horizontal/vertical
- **Export**: PNG raster and SVG vector formats

### 🖌️ Advanced Editor (Design Synth)
- **Konva Canvas**: Selection, box draw, eraser brush, text overlay tools
- **AI Inpainting**: Fill masked regions with AI-generated content
- **AI Outpainting**: Extend images beyond their boundaries
- **Style Transfer**: Restyle entire images with a text prompt

### 🔧 Laser Fabrication
- **Smart Material Presets**: 9 pre-configured profiles (Kraft paper, Plywood, Wood, Bamboo, Cork, Leather, Silica gel, Felt, Tin plate)
- **Power/Speed/Passes Control**: Fine-tuned parameters for the ACMER S1 diode laser
- **LaserGRBL/LightBurn Export**: SVG vector output for CNC laser software

### 🤖 AI Prototyping Advisor
- **Expert Chat**: Full-spectrum prototyping consultant — materials science, design principles, fabrication techniques, electronics, mechanical engineering
- **Deep Thinking Mode**: Complex query analysis via Gemini Pro with high-level reasoning
- **Voice I/O**: Voice prompts and TTS responses (5 voice options)
- **Tool Use**: Can save material presets and configurations directly from conversation
- **Google Search Grounding**: Real-time information retrieval

### 🌐 Community Inspiration
- **GitHub**: Search and browse open-source hardware projects, reference designs, and firmware
- **Thingiverse**: Discover 3D-printable models and remixable designs
- **Instructables**: Step-by-step project guides and build tutorials
- **Hackaday**: Hardware hacking projects, teardowns, and engineering write-ups

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
┌──────────────────────────────────────────────────────┐
│               Browser Client (React)                  │
│                                                       │
│   App.tsx ─── PrototypingStudio ─── AdvancedEditor    │
│      │                                                │
│   ┌──┴───────────────────────────────────────────┐    │
│   │              Service Layer                    │    │
│   │  geminiService · ttsService · projectService  │    │
│   └──┬───────────────────────────────────────────┘    │
│      │                                                │
│   ┌──┴───────────────────────────────────────────┐    │
│   │              Library Layer                    │    │
│   │  imageProcessor · firebase · constants        │    │
│   └──────────────────────────────────────────────┘    │
└──────────────┬──────────────┬──────────────┬──────────┘
               │              │              │
          Gemini API    Firebase       Three.js
               │
    ┌──────────┴──────────┐
    │  Community APIs     │
    │  GitHub · Thingiverse│
    │  Instructables       │
    │  Hackaday            │
    └─────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build** | Vite 6.2 |
| **Styling** | Tailwind CSS 4.1 (glassmorphism theme) |
| **UI Components** | shadcn/ui (Radix + CVA) |
| **3D Engine** | Three.js (React Three Fiber + Drei) |
| **Canvas Editor** | Konva + react-konva |
| **AI** | Google Gemini API (Pro, Flash, Flash Image, Flash TTS) |
| **Auth & DB** | Firebase (Google Auth + Firestore) |
| **Animation** | Motion (Framer Motion) |
| **Icons** | Lucide React |

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
├── App.tsx                      # Main application (1700+ lines)
├── main.tsx                     # React entry point
├── index.css                    # Global styles + glassmorphism theme
├── constants.ts                 # Material presets & project templates
├── components/
│   ├── PrototypingStudio.tsx    # 3D AI prototyping engine
│   ├── AdvancedEditor.tsx       # Konva canvas editor
│   └── DocumentationViewer.tsx  # In-app docs with export
├── docs/
│   └── documentationContent.ts  # Documentation data
├── services/
│   ├── geminiService.ts         # Gemini API wrapper
│   ├── ttsService.ts            # Text-to-speech
│   └── projectService.ts       # Firestore CRUD
└── lib/
    ├── firebase.ts              # Firebase init + auth
    └── imageProcessor.ts        # Image processing pipeline
```

---

## Security

- **Authentication**: Firebase Google Sign-In with email verification
- **Data Isolation**: All data sandboxed under `/users/{uid}/`
- **Firestore Rules**: Hardened with schema validation, immutability constraints, 1MB image limits
- **Global Deny**: Catch-all rule blocks all access by default; specific paths whitelisted
- **Security Testing**: 12 attack vectors ("Dirty Dozen") verified — see [security_spec.md](security_spec.md)
- **API Keys**: Injected at build time via Vite, never committed to source

---

## Documentation

Full documentation is available in three ways:

1. **In-App**: Click the **Docs** tab in the navigation bar
2. **HTML Export**: From the Docs tab, click **HTML** to download an interactive offline reference
3. **PDF Export**: From the Docs tab, click **PDF** to generate a print-ready document

Documentation covers: Overview, Prototyping Pipeline, Design Guides & Best Practices, Feature Reference, API Reference, Community Sources, Security, and Setup.

---

## License

SPDX-License-Identifier: Apache-2.0
