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

**SUBSTRATA** is a premium industrial design & laser precision suite that combines AI-powered image generation, advanced image processing, 3D prototyping, and laser engraving parameter management into a single cohesive application.

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **AI Image Generation** | Generate laser-ready stencils from text or voice prompts using Google Gemini |
| **Image Processing Pipeline** | Floyd-Steinberg dithering, Sobel edge detection, brightness/contrast/threshold |
| **3D Prototyping Studio** | AI-generated hardware blueprints with BOM, fabrication files, and control code |
| **Advanced Canvas Editor** | Konva-powered editor with AI inpainting, outpainting, and style transfer |
| **Material Advisor** | AI chat expert for ACMER S1 laser settings with TTS voice responses |
| **Project Management** | Firebase-backed save/load/rename/duplicate with Google Auth |
| **Machine Maintenance** | Dashboard for safety checks, troubleshooting, and firmware updates |

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

![Laser Studio — Image processing and engraving preparation](/docs/screenshots/02-laser-studio.png)

![AI Material Advisor — Expert chat with TTS voice responses](/docs/screenshots/03-advisor-tab.png)

![Maintenance Dashboard — Safety checks, stats, and troubleshooting](/docs/screenshots/04-maintenance-tab.png)

![Template Library — Project gallery with pre-built designs](/docs/screenshots/05-library-tab.png)
`
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: 'Network',
    content: `
# System Architecture

## High-Level Overview

SUBSTRATA is a **single-page application (SPA)** built with React and Vite. All AI processing happens client-side via the Google Gemini API, while Firebase handles authentication and data persistence.

\`\`\`
┌─────────────────────────────────────────────────────┐
│                  Browser Client                      │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ App.tsx   │  │ Prototyping  │  │  Advanced     │  │
│  │ (Router)  │──│ Studio       │  │  Editor       │  │
│  └─────┬────┘  └──────┬───────┘  └──────┬────────┘  │
│        │               │                 │           │
│  ┌─────┴───────────────┴─────────────────┴────────┐  │
│  │              Service Layer                      │  │
│  │  geminiService │ ttsService │ projectService    │  │
│  └─────────────────────┬──────────────────────────┘  │
│                        │                              │
│  ┌─────────────────────┴──────────────────────────┐  │
│  │              Library Layer                      │  │
│  │  imageProcessor │ firebase │ constants          │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Gemini  │  │ Firebase │  │ Three.js │
   │  API     │  │ Auth+DB  │  │ Runtime  │
   └──────────┘  └──────────┘  └──────────┘
\`\`\`

## File Structure

| Path | Purpose |
|------|---------|
| \`src/App.tsx\` | Main application component, routing, state management |
| \`src/components/PrototypingStudio.tsx\` | 3D prototyping workspace with AI blueprint generation |
| \`src/components/AdvancedEditor.tsx\` | Konva-based image editor with AI synthesis |
| \`src/services/geminiService.ts\` | All Gemini API interactions (generation, analysis, chat, synthesis) |
| \`src/services/ttsService.ts\` | Text-to-speech via Gemini Flash TTS |
| \`src/services/projectService.ts\` | Firestore CRUD for laser projects |
| \`src/lib/imageProcessor.ts\` | Canvas-based image processing pipeline |
| \`src/lib/firebase.ts\` | Firebase initialization and auth helpers |
| \`src/constants.ts\` | ACMER S1 material presets and project templates |
| \`components/ui/\` | shadcn/ui components (Button, Card, Tabs, etc.) |
| \`firestore.rules\` | Security rules with hardened validation |
| \`security_spec.md\` | Security test specification ("Dirty Dozen" payloads) |

## Component Hierarchy

\`\`\`
App
├── Header (Auth + Save)
├── Main Content Area
│   ├── TabsList (Engineering | Advisor | Maintenance | Library)
│   ├── Engineering Tab
│   │   ├── Mode Switch (3D Prototype | Laser Studio)
│   │   ├── Design Style Selector (minimalist | deconstructivist | classical | organic)
│   │   ├── PrototypingStudio (3D mode)
│   │   │   ├── Canvas (Three.js + R3F)
│   │   │   ├── BOM Tab
│   │   │   ├── Fabrication Tab
│   │   │   └── Code Tab
│   │   └── Laser Studio (laser mode)
│   │       ├── Image Canvas / Upload
│   │       ├── AI Generation Input (text + voice)
│   │       └── Quick Presets
│   ├── ConsultantInterface (Advisor Tab)
│   ├── MaintenanceDashboard (Maintenance Tab)
│   └── Library (Project Gallery + Templates)
├── Sidebar Controls
│   ├── Laser Parameters (power, speed, passes)
│   ├── Canvas Editing (rotate, flip)
│   └── Image Filters (brightness, contrast, dither, edge)
└── AdvancedEditor (Modal Overlay)
    ├── Konva Stage (select, erase, box, text tools)
    └── Generative Synthesis (inpaint, outpaint, style transfer)
\`\`\`
`
  },
  {
    id: 'features',
    title: 'Features Guide',
    icon: 'Sparkles',
    content: `
# Feature Guide

## 1. Laser Studio

The Laser Studio is the core design workspace for preparing images for laser engraving on the ACMER S1.

![Laser Studio workspace with image upload and AI generation](/docs/screenshots/02-laser-studio.png)

### Image Input Methods
- **File Upload**: Drag or click to upload PNG, JPEG, or SVG files (up to 10MB)
- **AI Generation**: Type a text prompt (or use voice) to generate a laser-ready design
- **Template Library**: Choose from 10 pre-built templates (Geometric Wolf, Mandala, Celtic Knot, etc.)
- **Voice Input**: Hold the microphone button to dictate a prompt, transcribed by Gemini

### Image Processing Pipeline
All uploaded/generated images pass through a real-time processing pipeline:

1. **Grayscale Conversion** — Luma-weighted (0.299R + 0.587G + 0.114B)
2. **Brightness Adjustment** — Range: -100% to +100%
3. **Contrast Enhancement** — Factor-based contrast with clamping
4. **Palette Inversion** — Optional color inversion
5. **Binarization** — Choose between:
   - **Floyd-Steinberg Dithering** — Distributes quantization error to neighboring pixels for smooth gradients
   - **Sobel Edge Detection** — Extracts edges for cutting paths
   - **Simple Threshold** — Hard black/white split at configurable threshold (0-255)

### Filter Presets
| Preset | Brightness | Contrast | Threshold | Dither | Edge |
|--------|-----------|----------|-----------|--------|------|
| Draft | 0% | 20% | 128 | Off | Off |
| Fine Fine | -10% | 30% | 120 | On | Off |
| Contrast Hi | 0% | 80% | 128 | On | Off |
| Stencil | 0% | 50% | 150 | Off | On |

### Canvas Transforms
- **Rotate**: 90° clockwise increments
- **Flip Horizontal / Vertical**: Mirror the image

### Laser Parameters
- **Power Output**: 0-100% (default 80%)
- **Speed**: 0-5000 mm/min (default 2000)
- **Passes**: 1-10 (default 1)
- **Smart Presets**: Pre-configured for 9 materials (Kraft paper, Plywood, Solid wood, Bamboo, Cork, Leather, Silica gel, Dark Felt, Tin plate)

### Export Options
- **PNG Export**: Raster image download
- **SVG Export**: Vector wrapper for compatibility with LaserGRBL/LightBurn

---

## 2. 3D Prototyping Studio

The Prototyping Studio is an AI-powered hardware design engine that generates complete prototyping blueprints.

![3D Prototyping Studio — Generate complete hardware blueprints from text descriptions](/docs/screenshots/01-prototyping-studio.png)

### Workflow
1. Describe your hardware project in the Design Objectives textarea
2. Select your target 3D printer (Saturn 3 Ultra Resin, Formbot T-Rex 2 FDM, or Custom)
3. Click **GENERATE BLUEPRINT** — Gemini Pro generates a complete project

### Generated Outputs
- **3D Workspace**: Interactive Three.js viewport with orbit controls
- **Bill of Materials**: Parts list with pricing, sourcing (Amazon, McMaster-Carr, Pololu, Adafruit), and shipping speed
- **Fabrication Files**: STL file manifest with SLA/FDM print parameters
- **Control Code**: Python/Arduino code for the prototype

### BOM Features
- Sort by **Fastest Ship** or **Cheapest** price
- Each part shows: name, source, specs, price, delivery estimate
- External links to suppliers

---

## 3. AI Advisor (Consultant)

A chat-based AI expert specialized in the ACMER S1 laser engraver.

![AI Advisor — Expert chat interface with voice TTS responses](/docs/screenshots/03-advisor-tab.png)

### Capabilities
- Material-specific engraving recommendations
- Safety protocol guidance
- Troubleshooting assistance
- **Deep Thinking Mode**: Toggle for complex queries (uses Gemini Pro with HIGH thinking level)
- **Voice Output**: TTS responses via Gemini Flash TTS (Kore voice)
- **Tool Use**: Can save material presets directly from conversation

### System Behavior
- Concise, high-density technical responses
- Always ends with "Would you like to know more?"
- Uses Google Search grounding for up-to-date information

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

## 5. Maintenance Dashboard

Machine health monitoring and troubleshooting for the ACMER S1.

![Maintenance Dashboard — Safety checks, machine stats, and troubleshooting guides](/docs/screenshots/04-maintenance-tab.png)

### Status Cards
- **Safety**: Goggles verification, exhaust system status
- **Maintenance**: Lens cleanliness percentage, next maintenance due
- **Statistics**: Total operational hours, safety compliance rate, cut count

### Troubleshooting Guides
- **Link / Discovery** (Low difficulty): USB driver setup, cable management
- **Burn Quality** (Medium difficulty): Focal point adjustment, speed/power ratios, air assist
- **GRBL Alarm 2** (Expert difficulty): Soft limit resolution, coordinate homing

### Maintenance Procedures
- Fan intake cleaning
- Belt tension checks
- Firmware update notifications

---

## 6. Project Library

Cloud-backed project management with Google authentication.

![Template Library — Project gallery with pre-built laser designs](/docs/screenshots/05-library-tab.png)

### Features
- **New Project**: Start fresh
- **Saved Projects**: Auto-synced to Firestore with thumbnails
- **Project Actions**: Open, Rename, Duplicate, Share (clipboard), Delete
- **Stock Templates**: 10 curated templates across categories (Animal, Decor, Home, Gift, Nature, Fantasy, Mechanical, Nautical)
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

### \`generateLaserDesign(prompt, style?, aspectRatio?)\`
Generates a laser-ready stencil image using Gemini 3.1 Flash Image Preview.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| prompt | string | — | Design description |
| style | string | "minimalist" | One of: minimalist, deconstructivist, classical, organic |
| aspectRatio | string | "1:1" | Output aspect ratio |

**Returns**: \`Promise<string | null>\` — Base64 data URL of the generated PNG

---

### \`analyzeLaserMaterial(imageBase64)\`
Analyzes a material image and suggests optimal ACMER S1 laser settings.

| Parameter | Type | Description |
|-----------|------|-------------|
| imageBase64 | string | Base64-encoded image (data URL) |

**Returns**: \`Promise<string>\` — Text analysis with power/speed recommendations

**Model**: Gemini 3.1 Pro Preview

---

### \`consultLaserExpert(query, history?, useThinking?)\`
Chat with the AI laser expert advisor.

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
| project | Partial\<LaserProject\> | Project data (id, name, images, settings) |

**Path**: \`users/{uid}/projects/{projectId}\`

### \`getProjects()\`
Fetches all projects for the authenticated user, ordered by \`updatedAt\` descending.

**Returns**: \`Promise<LaserProject[]>\`

### \`renameProject(projectId, newName)\`
Updates only the project name and \`updatedAt\` timestamp.

### \`deleteProject(projectId)\`
Permanently removes a project document.

---

## imageProcessor.ts

### \`processImageForLaser(imageSource, options)\`
Full image processing pipeline for laser engraving preparation.

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

---

## Constants

### LaserSettings Interface
\`\`\`typescript
interface LaserSettings {
  engraved: boolean;
  power: number;    // 0-100 (percentage)
  speed: number;    // mm/min
  passes: number;   // 1-10
  mode: 'M3' | 'M4'; // M3=Constant Power, M4=Dynamic Power
  quality: number;  // lines/mm
}
\`\`\`

### ACMER S1 Default Presets

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
The security specification includes 12 attack vectors that are tested:

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
- Key is loaded from \`.env\` file (not committed to version control)
- Firebase config is in \`firebase-applet-config.json\` (excluded from repomix output for security)

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
git clone <repo-url>
cd substrata-by-gantasmo

# Install dependencies
npm install

# Create environment file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start development server
npm run dev
\`\`\`

The app will be available at \`http://localhost:3000\`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`GEMINI_API_KEY\` | Yes | Google Gemini API key for AI features |

## Firebase Configuration

The Firebase config is stored in \`firebase-applet-config.json\`. Update it with your project's credentials:

\`\`\`json
{
  "apiKey": "your-firebase-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "your-app-id",
  "firestoreDatabaseId": "your-db-id"
}
\`\`\`

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
│   ├── constants.ts            # ACMER S1 presets & templates
│   ├── components/
│   │   ├── PrototypingStudio.tsx   # 3D AI prototyping
│   │   ├── AdvancedEditor.tsx      # Konva image editor
│   │   └── DocumentationViewer.tsx # In-app documentation
│   ├── services/
│   │   ├── geminiService.ts    # Gemini API wrapper
│   │   ├── ttsService.ts       # Text-to-speech
│   │   └── projectService.ts   # Firestore CRUD
│   └── lib/
│       ├── firebase.ts         # Firebase init + auth
│       └── imageProcessor.ts   # Image processing pipeline
├── components/ui/              # shadcn/ui components
├── docs/
│   └── screenshots/            # App feature screenshots
├── firestore.rules             # Security rules
├── security_spec.md            # Security test spec
├── firebase-applet-config.json # Firebase config
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
        AE["AdvancedEditor.tsx — Konva Canvas Editor"]
        subgraph Services["Service Layer"]
            GS["geminiService.ts — AI Generation"]
            TTS["ttsService.ts — Text-to-Speech"]
            ProjS["projectService.ts — CRUD"]
        end
        subgraph Libs["Core Libraries"]
            IP["imageProcessor.ts — Floyd-Steinberg / Sobel"]
            FB["firebase.ts — Auth + Firestore"]
            CONST["constants.ts — ACMER S1 Presets"]
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
    FB --> Firebase
\`\`\`

## Data Flow — Laser Engraving Pipeline

\`\`\`mermaid
flowchart LR
    subgraph Input["User Input"]
        Upload["Image Upload"]
        Voice["Voice Prompt"]
        Text["Text Prompt"]
        Template["Template"]
    end
    subgraph Processing["AI + Image Pipeline"]
        Transcribe["Transcribe Audio"]
        Generate["Generate Design"]
        Analyze["Analyze Material"]
        ImgProc["Image Processing"]
    end
    subgraph Filters["Filter Pipeline"]
        Bright["Brightness/Contrast"]
        Thresh["Threshold"]
        Dither["Floyd-Steinberg Dither"]
        Edge["Sobel Edge Detection"]
    end
    subgraph Output["Export"]
        PNG["PNG Export"]
        SVG["SVG Export"]
        Save["Firestore Save"]
        Studio["Advanced Editor"]
    end
    Upload --> ImgProc
    Voice --> Transcribe --> Text
    Text --> Generate --> ImgProc
    Template --> ImgProc
    ImgProc --> Bright --> Thresh
    Thresh --> Dither --> PNG
    Thresh --> Edge --> SVG
    ImgProc --> Studio --> Save
\`\`\`

## User Workflow Sequence

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant App as App.tsx
    participant GS as geminiService
    participant IP as imageProcessor
    participant AE as AdvancedEditor
    participant FB as Firebase
    U->>App: Upload Image / AI Prompt
    alt AI Generation
        App->>GS: generateLaserDesign(prompt, style)
        GS-->>App: Base64 PNG Image
    end
    App->>IP: processImageForLaser(image, options)
    IP-->>App: Processed Canvas DataURL
    U->>App: Open Advanced Editor
    App->>AE: Pass processed image
    U->>AE: AI Synthesis (inpaint/outpaint/style)
    AE->>GS: synthesizeImageEdition(mode, prompt)
    GS-->>AE: AI-modified image
    AE-->>App: Commit changes
    U->>App: Save Project
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
        json laserSettings
        json procOptions
        timestamp createdAt
        timestamp updatedAt
    }
    LASER_SETTINGS {
        boolean engraved
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
    PROJECT ||--|| LASER_SETTINGS : contains
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
        AE["AdvancedEditor.tsx — Konva Canvas Editor"]
        subgraph Services["Service Layer"]
            GS["geminiService.ts — AI Generation"]
            TTS["ttsService.ts — Text-to-Speech"]
            ProjS["projectService.ts — CRUD"]
        end
        subgraph Libs["Core Libraries"]
            IP["imageProcessor.ts — Floyd-Steinberg / Sobel"]
            FB["firebase.ts — Auth + Firestore"]
            CONST["constants.ts — ACMER S1 Presets"]
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
  dataFlow: `flowchart LR
    subgraph Input["User Input"]
        Upload["Image Upload"]
        Voice["Voice Prompt"]
        Text["Text Prompt"]
        Template["Template"]
    end
    subgraph Processing["AI + Image Pipeline"]
        Transcribe["Transcribe Audio"]
        Generate["Generate Design"]
        ImgProc["Image Processing"]
    end
    subgraph Filters["Filter Pipeline"]
        Bright["Brightness/Contrast"]
        Thresh["Threshold"]
        Dither["Floyd-Steinberg Dither"]
        Edge["Sobel Edge Detection"]
    end
    subgraph Output["Export"]
        PNG["PNG Export"]
        SVG["SVG Export"]
        Save["Firestore Save"]
    end
    Upload --> ImgProc
    Voice --> Transcribe --> Text
    Text --> Generate --> ImgProc
    Template --> ImgProc
    ImgProc --> Bright --> Thresh
    Thresh --> Dither --> PNG
    Thresh --> Edge --> SVG`,
  sequence: `sequenceDiagram
    participant U as User
    participant App as App.tsx
    participant GS as geminiService
    participant IP as imageProcessor
    participant AE as AdvancedEditor
    participant FB as Firebase
    U->>App: Upload Image / AI Prompt
    alt AI Generation
        App->>GS: generateLaserDesign(prompt, style)
        GS-->>App: Base64 PNG Image
    end
    App->>IP: processImageForLaser(image, options)
    IP-->>App: Processed Canvas DataURL
    U->>App: Open Advanced Editor
    App->>AE: Pass processed image
    U->>AE: AI Synthesis
    AE->>GS: synthesizeImageEdition(mode, prompt)
    GS-->>AE: AI-modified image
    AE-->>App: Commit changes
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
        json laserSettings
        json procOptions
        timestamp createdAt
        timestamp updatedAt
    }`
};
