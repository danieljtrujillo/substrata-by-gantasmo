<div align="center">

# SUBSTRATA *by* GANTASMO

**Premium Industrial Design & Laser Precision Suite**

*AI-powered image generation · Advanced image processing · 3D prototyping · Laser engraving optimization*

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini_AI-3.1-4285F4?logo=google&logoColor=white)

</div>

---

## Overview

SUBSTRATA is a comprehensive desktop-grade web application for laser engraving design and hardware prototyping. It combines Google Gemini AI, real-time image processing, 3D visualization, and Firebase cloud storage into a single cohesive workflow optimized for the **ACMER S1 2.5W** diode laser engraver.

### Screenshots

| Prototyping Studio | Laser Studio | AI Advisor |
|---|---|---|
| ![3D Prototyping](docs/screenshots/01-prototyping-studio.png) | ![Laser Studio](docs/screenshots/02-laser-studio.png) | ![Advisor](docs/screenshots/03-advisor-tab.png) |

| Maintenance Dashboard | Template Library |
|---|---|
| ![Maintenance](docs/screenshots/04-maintenance-tab.png) | ![Library](docs/screenshots/05-library-tab.png) |

---

## Features

### 🔧 Laser Studio
- **Image Upload**: PNG, JPEG, SVG support with drag-and-drop
- **AI Design Generation**: Text and voice prompts via Gemini 3.1 Flash Image Preview
- **Real-time Processing Pipeline**: Grayscale → Brightness/Contrast → Floyd-Steinberg dithering or Sobel edge detection
- **Smart Material Presets**: 9 pre-configured profiles for Kraft paper, Plywood, Wood, Bamboo, Cork, Leather, and more
- **Canvas Transforms**: Rotate (90° increments), flip horizontal/vertical
- **Export**: PNG raster and SVG vector formats

### 🧊 3D Prototyping Studio
- **AI Blueprint Generation**: Describe a hardware project and Gemini Pro generates a complete blueprint
- **Interactive 3D Viewer**: Three.js viewport with orbit controls
- **Bill of Materials**: Auto-generated parts list with pricing and sourcing links
- **Fabrication Files**: STL manifest with SLA/FDM print parameters
- **Control Code**: Python/Arduino code generation

### 🤖 AI Advisor
- **Expert Chat**: ACMER S1 specialist with material recommendations and safety guidance
- **Deep Thinking Mode**: Complex query analysis via Gemini Pro with high thinking level
- **Voice Output**: Text-to-speech responses (5 voice options)
- **Tool Use**: Can save material presets directly from conversation
- **Google Search Grounding**: Real-time information retrieval

### 🎨 Advanced Editor (Design Synth)
- **Konva Canvas**: Selection, box draw, eraser brush, text overlay tools
- **AI Inpainting**: Fill masked regions with AI-generated content
- **AI Outpainting**: Extend images beyond their boundaries
- **Style Transfer**: Restyle entire images with a text prompt

### 🔒 Maintenance Dashboard
- Safety status monitoring (goggles, exhaust)
- Lens cleanliness tracking and maintenance scheduling
- Operational statistics (hours, safety compliance, cut count)
- Troubleshooting guides (Link/Discovery, Burn Quality, GRBL Alarm 2)

### 📁 Project Library
- Google Auth with cloud storage via Firestore
- Save/Load/Rename/Duplicate/Share/Delete projects
- 10 curated stock templates across categories

### 📖 In-App Documentation
- Full documentation accessible from the **Docs** tab
- Searchable sections with sidebar navigation
- **Export as HTML** for interactive offline reference
- **Export as PDF** via browser print dialog

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Browser Client (React)              │
│                                                  │
│   App.tsx ─── PrototypingStudio ─── AdvancedEditor
│      │                                           │
│   ┌──┴──────────────────────────────────────┐    │
│   │           Service Layer                  │    │
│   │  geminiService · ttsService · projService│    │
│   └──┬──────────────────────────────────────┘    │
│      │                                           │
│   ┌──┴──────────────────────────────────────┐    │
│   │           Library Layer                  │    │
│   │  imageProcessor · firebase · constants   │    │
│   └─────────────────────────────────────────┘    │
└──────────────┬──────────────┬──────────────┬─────┘
               │              │              │
          Gemini API    Firebase       Three.js
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
| `gemini-3.1-flash-image-preview` | Image generation, AI synthesis (inpaint/outpaint/style) |
| `gemini-3.1-pro-preview` | Material analysis, expert advisor (deep thinking), blueprint generation |
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
git clone <repo-url>
cd substrata-by-gantasmo

# Install dependencies
npm install

# Configure environment
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`.

### Firebase Configuration

Update `firebase-applet-config.json` with your Firebase project credentials:

```json
{
  "apiKey": "...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "...",
  "appId": "..."
}
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
├── constants.ts                 # ACMER S1 presets & templates
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

- **Authentication**: Firebase Google Sign-In with email verification required
- **Data Isolation**: All data sandboxed under `/users/{uid}/`
- **Firestore Rules**: Hardened with schema validation, immutability constraints, 1MB image limits
- **Global Deny**: Catch-all rule blocks all access by default; specific paths whitelisted
- **Security Testing**: 12 attack vectors ("Dirty Dozen") verified — see [security_spec.md](security_spec.md)
- **API Keys**: Injected at build time via Vite, never committed to source

---

## Data Model

```
USER (Firebase Auth)
├── uid, email, displayName, photoURL
└── projects/ (Firestore collection)
    └── {projectId}
        ├── name: string
        ├── originalImage: string (base64, ≤1MB)
        ├── processedImage: string (base64, ≤1MB)
        ├── laserSettings: { power, speed, passes, mode, quality }
        ├── procOptions: { brightness, contrast, threshold, dither, invert, edgeDetection, rotate, flipH, flipV }
        ├── createdAt: timestamp (immutable)
        └── updatedAt: timestamp (server-enforced)
```

---

## Documentation

Full documentation is available in three ways:

1. **In-App**: Click the **Docs** tab in the navigation bar
2. **HTML Export**: From the Docs tab, click **HTML** to download an interactive offline reference
3. **PDF Export**: From the Docs tab, click **PDF** to generate a print-ready document

Documentation covers: Overview, Architecture, Features Guide, API Reference, Security, Setup & Deployment, and Architecture Diagrams.

---

## License

SPDX-License-Identifier: Apache-2.0
