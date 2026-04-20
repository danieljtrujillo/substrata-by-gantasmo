/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { 
  Plus, 
  Box,
  Settings, 
  Settings2,
  Library, 
  MessageSquare, 
  Download, 
  Upload, 
  Sparkles, 
  Image as ImageIcon,
  Zap,
  Check,
  ChevronRight,
  RefreshCw,
  Trash2,
  Save,
  Cpu,
  HelpCircle,
  Search,
  Mic,
  MicOff,
  Volume2,
  Wrench,
  History,
  ShieldAlert,
  Fan,
  Wind,
  Activity,
  LogOut,
  User as UserIcon,
  Edit2,
  FileCode,
  FileImage,
  Layers,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  MoreVertical,
  Copy,
  ExternalLink,
  Printer,
  BookOpen,
  PanelLeft,
  PanelRight,
  X,
  Package,
  ListTodo,
  Terminal,
  Cable,
  ClipboardList,
  ShoppingCart,
  Wand2,
  Tag,
  StickyNote,
  CircleDot,
  Type,
  Square,
  Circle,
  Maximize,
  PenTool,
  LayoutGrid,
  Menu,
  FileDown,
  Database,
  CornerUpLeft,
  Archive,
  Smartphone,
  Info,
  ChevronDown,
  Play,
  Pause,
  Paperclip,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, CloudflareUser } from './lib/auth';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Environment, Grid, Html, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import mermaid from 'mermaid';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { processImageForLaser, ImageProcessOptions, generateEdgeSilhouette, extractProfileForExtrusion } from './lib/imageProcessor';
import { 
  generateLaserDesign, 
  consultLaserExpert, 
  analyzeLaserMaterial,
  getSmartSettings,
  transcribeSpokenPrompt,
  generateProjectBlueprint,
  generateConceptSketch,
  generateConceptSheet,
  searchCommunityModels,
  generateParametricVariant,
  type SketchMode
} from './services/geminiService';
import { speakText, cancelSpeech, generateAudioBuffer, playBuffer } from './services/ttsService';
import { ACMER_S1_PARAMETERS, ACMER_S1_MANUAL_SUMMARY, PROJECT_TEMPLATES, LaserSettings, LabelSettings, LABEL_SIZE_PRESETS, MUNBYN_ITPP130B, PRINTER_DATABASE, LASER_DATABASE } from './constants';
import { STYLE_GUIDES } from './styleGuides';
import { loginWithGoogle, logout, AUTH_AVAILABLE } from './lib/auth';
import { AdvancedEditor } from './components/AdvancedEditor';
import { DocumentationViewer } from './components/DocumentationViewer';
import { saveProject, getProjects, deleteProject, renameProject, LaserProject } from './services/projectService';

// ── SVG Sanitizer ──────────────────────────────────────────────
// Strips scripts, event handlers, and external references from SVG
function sanitizeSvg(raw: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return '<svg viewBox="0 0 100 100"><text x="10" y="50" fill="#999" font-size="8">Invalid SVG</text></svg>';

  // Remove dangerous elements
  const dangerous = svg.querySelectorAll('script, foreignObject, iframe, object, embed, use[href^="http"], use[xlink\\:href^="http"]');
  dangerous.forEach(el => el.remove());

  // Remove event handlers and external hrefs from all elements
  const all = svg.querySelectorAll('*');
  all.forEach(el => {
    const attrs = [...el.attributes];
    for (const attr of attrs) {
      if (attr.name.startsWith('on') || attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // Ensure viewBox exists and set responsive sizing
  if (!svg.getAttribute('viewBox')) {
    const w = svg.getAttribute('width') || '200';
    const h = svg.getAttribute('height') || '200';
    svg.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
  }
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.maxHeight = '300px';

  return svg.outerHTML;
}

// ── Tooltip Component ──────────────────────────────────────────
function Tip({ text, children, side = 'top' }: { text: string; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  const [show, setShow] = useState(false);
  const posClass = side === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
    : side === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-1.5'
    : side === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-1.5'
    : 'left-full top-1/2 -translate-y-1/2 ml-1.5';
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className={`absolute z-[200] pointer-events-none ${posClass} px-2 py-1 rounded-md bg-black/90 border border-white/10 text-[9px] text-white/80 font-medium whitespace-nowrap shadow-xl backdrop-blur-sm max-w-[200px] text-center leading-tight`}>
          {text}
        </span>
      )}
    </span>
  );
}

// ── OpenSCAD Parser & 3D Renderer ──────────────────────────────
// Parses the generated OpenSCAD code and renders real Three.js geometry

interface ParsedPrimitive {
  type: 'cube' | 'cylinder' | 'sphere' | 'hull';
  args: number[];
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  label: string;
}

const PART_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#22d3ee'
];

function parseOpenSCAD(code: string): ParsedPrimitive[] {
  const primitives: ParsedPrimitive[] = [];
  if (!code || code.startsWith('//')) return primitives;

  // Better module extraction: match braces to handle nested blocks
  const extractModules = (src: string): { name: string, body: string }[] => {
    const modules: { name: string, body: string }[] = [];
    const moduleStartRegex = /module\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    while ((match = moduleStartRegex.exec(src)) !== null) {
      const name = match[1];
      let depth = 1;
      let pos = match.index + match[0].length;
      const start = pos;
      while (pos < src.length && depth > 0) {
        if (src[pos] === '{') depth++;
        else if (src[pos] === '}') depth--;
        pos++;
      }
      modules.push({ name, body: src.slice(start, pos - 1) });
    }
    return modules;
  };

  const modules = extractModules(code);
  let colorIdx = 0;

  for (const mod of modules) {
    if (mod.name === 'assembly') continue; // parse assembly last to avoid duplication
    const color = PART_COLORS[colorIdx++ % PART_COLORS.length];
    extractPrimitives(mod.body, mod.name, color, primitives, colorIdx);
  }

  // Parse assembly module if present (it may call other modules, but also has inline geometry)
  const assemblyMod = modules.find(m => m.name === 'assembly');
  if (assemblyMod) {
    extractPrimitives(assemblyMod.body, 'assembly', PART_COLORS[colorIdx % PART_COLORS.length], primitives, colorIdx);
  }

  // Also parse top-level primitives outside modules
  let outsideStr = code;
  for (const mod of modules) {
    outsideStr = outsideStr.replace(new RegExp(`module\\s+${mod.name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\}`, ''), '');
  }
  if (outsideStr.match(/cube|cylinder|sphere/)) {
    extractPrimitives(outsideStr, 'part', PART_COLORS[colorIdx % PART_COLORS.length], primitives, colorIdx);
  }

  // If nothing was parsed, generate geometry from the parts list structure
  if (primitives.length === 0) {
    primitives.push(
      { type: 'cube', args: [2, 0.3, 3], position: [0, 0, 0], rotation: [0, 0, 0], color: '#3b82f6', label: 'base' },
      { type: 'cylinder', args: [0.15, 0.15, 1.5, 16], position: [-0.7, 0.9, -1], rotation: [0, 0, 0], color: '#8b5cf6', label: 'pillar' },
      { type: 'cylinder', args: [0.15, 0.15, 1.5, 16], position: [0.7, 0.9, -1], rotation: [0, 0, 0], color: '#8b5cf6', label: 'pillar' },
      { type: 'cylinder', args: [0.15, 0.15, 1.5, 16], position: [-0.7, 0.9, 1], rotation: [0, 0, 0], color: '#8b5cf6', label: 'pillar' },
      { type: 'cylinder', args: [0.15, 0.15, 1.5, 16], position: [0.7, 0.9, 1], rotation: [0, 0, 0], color: '#8b5cf6', label: 'pillar' },
      { type: 'cube', args: [1.8, 0.2, 2.6], position: [0, 1.7, 0], rotation: [0, 0, 0], color: '#06b6d4', label: 'top_plate' },
      { type: 'cylinder', args: [0.3, 0.2, 0.4, 24], position: [0, 2.1, 0], rotation: [0, 0, 0], color: '#10b981', label: 'sensor_mount' },
      { type: 'sphere', args: [0.15, 16, 16], position: [0, 2.5, 0], rotation: [0, 0, 0], color: '#ef4444', label: 'indicator' },
    );
    return primitives; // fallback geometry is already viewport-scaled
  }

  // Apply UNIFORM scaling — single bounding-box-based scale for the entire scene
  // This ensures all parts maintain correct proportions relative to each other
  return normalizeScene(primitives);
}

function extractPrimitives(body: string, moduleName: string, color: string, out: ParsedPrimitive[], _seedOffset: number) {
  const lines = body.split('\n');
  let currentTranslate: [number, number, number] = [0, 0, 0];
  let currentRotation: [number, number, number] = [0, 0, 0];
  let currentColor = color;

  const namedColors: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
    orange: '#f97316', purple: '#a855f7', cyan: '#06b6d4', pink: '#ec4899',
    white: '#f8fafc', gray: '#6b7280', black: '#1e293b', silver: '#94a3b8'
  };

  // Track CSG context: if inside difference(), first child is additive, rest are subtractive (marked as hidden)
  // We parse them all as regular primitives but tag subtractive ones with a dim color and transparency
  let csgMode: 'none' | 'difference' | 'union' | 'intersection' = 'none';
  let csgChildIndex = 0;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Detect CSG block starts
    if (/^difference\s*\(\s*\)\s*\{/.test(trimmed)) {
      csgMode = 'difference';
      csgChildIndex = 0;
      braceDepth = 1;
      continue;
    }
    if (/^union\s*\(\s*\)\s*\{/.test(trimmed)) {
      csgMode = 'union';
      csgChildIndex = 0;
      braceDepth = 1;
      continue;
    }
    if (/^intersection\s*\(\s*\)\s*\{/.test(trimmed)) {
      csgMode = 'intersection';
      csgChildIndex = 0;
      braceDepth = 1;
      continue;
    }

    // Track braces inside CSG blocks
    if (csgMode !== 'none') {
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (braceDepth <= 0) {
        csgMode = 'none';
        csgChildIndex = 0;
        continue;
      }
    }

    // Parse color
    const colorMatch = trimmed.match(/color\(\s*"(\w+)"\s*\)/) || trimmed.match(/color\(\s*\[([\d.,\s]+)\]\s*\)/);
    if (colorMatch) {
      if (colorMatch[1] && namedColors[colorMatch[1].toLowerCase()]) {
        currentColor = namedColors[colorMatch[1].toLowerCase()];
      } else if (colorMatch[1] && colorMatch[1].startsWith('#')) {
        currentColor = colorMatch[1];
      }
    }

    // Parse translate — store RAW mm values, swap Y/Z for OpenSCAD→Three.js
    const translateMatch = trimmed.match(/translate\(\[([^\]]+)\]\)/);
    if (translateMatch) {
      const vals = translateMatch[1].split(',').map(v => parseFloat(v.trim()) || 0);
      currentTranslate = [vals[0] || 0, vals[2] || 0, vals[1] || 0];
    }

    // Parse rotate — degrees→radians, swap Y/Z
    const rotateMatch = trimmed.match(/rotate\(\[([^\]]+)\]\)/);
    if (rotateMatch) {
      const vals = rotateMatch[1].split(',').map(v => (parseFloat(v.trim()) || 0) * Math.PI / 180);
      currentRotation = [vals[0] || 0, vals[2] || 0, vals[1] || 0];
    }

    // Determine if this primitive is a CSG subtraction (should be rendered as dark/transparent "hole")
    const isSubtractive = csgMode === 'difference' && csgChildIndex > 0;
    const primColor = isSubtractive ? '#ff2222' : currentColor;

    // Parse cube — RAW dimensions
    const cubeMatch = trimmed.match(/cube\(\[([^\]]+)\]/) || trimmed.match(/cube\((\d[\d.]*)\)/);
    if (cubeMatch) {
      let dims: number[];
      if (cubeMatch[1].includes(',')) {
        dims = cubeMatch[1].split(',').map(v => parseFloat(v.trim()) || 1);
      } else {
        const s = parseFloat(cubeMatch[1]) || 1;
        dims = [s, s, s];
      }
      // OpenSCAD: cube([x,y,z]) → Three.js: box(x, z, y) to swap Y/Z
      out.push({
        type: 'cube',
        args: [dims[0] || 1, dims[2] || dims[0] || 1, dims[1] || dims[0] || 1],
        position: [...currentTranslate],
        rotation: [...currentRotation],
        color: primColor,
        label: isSubtractive ? `${moduleName}_hole` : moduleName
      });
      if (csgMode !== 'none') csgChildIndex++;
      currentTranslate = [0, 0, 0];
      currentRotation = [0, 0, 0];
      currentColor = color;
    }

    // Parse cylinder — RAW dimensions
    const cylMatch = trimmed.match(/cylinder\(([^)]+)\)/);
    if (cylMatch && !cubeMatch) {
      const args = cylMatch[1];
      let r = 0.5, r2 = 0.5, h = 1, segments = 24;

      const rMatch = args.match(/(?:^|,|\s)r\s*=\s*([\d.]+)/);
      const r1Match = args.match(/r1\s*=\s*([\d.]+)/);
      const r2Match = args.match(/r2\s*=\s*([\d.]+)/);
      const dMatch = args.match(/(?:^|,|\s)d\s*=\s*([\d.]+)/);
      const d1Match = args.match(/d1\s*=\s*([\d.]+)/);
      const d2Match = args.match(/d2\s*=\s*([\d.]+)/);
      const hMatch = args.match(/h\s*=\s*([\d.]+)/);
      const fnMatch = args.match(/\$fn\s*=\s*(\d+)/);

      if (rMatch) r = r2 = parseFloat(rMatch[1]);
      if (r1Match) r = parseFloat(r1Match[1]);
      if (r2Match) r2 = parseFloat(r2Match[1]);
      if (dMatch) r = r2 = parseFloat(dMatch[1]) / 2;
      if (d1Match) r = parseFloat(d1Match[1]) / 2;
      if (d2Match) r2 = parseFloat(d2Match[1]) / 2;
      if (hMatch) h = parseFloat(hMatch[1]);
      if (fnMatch) segments = parseInt(fnMatch[1]);

      if (!rMatch && !r1Match && !dMatch && !d1Match && !hMatch) {
        const positional = args.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (positional.length >= 2) { h = positional[0]; r = r2 = positional[1]; }
        if (positional.length >= 3) { r2 = positional[2]; }
      }

      out.push({
        type: 'cylinder',
        args: [r, r2, h, segments],
        position: [...currentTranslate],
        rotation: [...currentRotation],
        color: primColor,
        label: isSubtractive ? `${moduleName}_hole` : moduleName
      });
      if (csgMode !== 'none') csgChildIndex++;
      currentTranslate = [0, 0, 0];
      currentRotation = [0, 0, 0];
      currentColor = color;
    }

    // Parse sphere — RAW dimensions
    const sphereMatch = trimmed.match(/sphere\(([^)]+)\)/);
    if (sphereMatch && !cubeMatch && !cylMatch) {
      const args = sphereMatch[1];
      let r = 0.5, segs = 24;

      const rMatch = args.match(/(?:^|,|\s)r\s*=\s*([\d.]+)/);
      const dMatch = args.match(/(?:^|,|\s)d\s*=\s*([\d.]+)/);
      const fnMatch = args.match(/\$fn\s*=\s*(\d+)/);

      if (rMatch) r = parseFloat(rMatch[1]);
      else if (dMatch) r = parseFloat(dMatch[1]) / 2;
      else { const v = parseFloat(args); if (!isNaN(v)) r = v; }
      if (fnMatch) segs = parseInt(fnMatch[1]);

      out.push({
        type: 'sphere',
        args: [r, segs, segs],
        position: [...currentTranslate],
        rotation: [...currentRotation],
        color: primColor,
        label: isSubtractive ? `${moduleName}_hole` : moduleName
      });
      if (csgMode !== 'none') csgChildIndex++;
      currentTranslate = [0, 0, 0];
      currentRotation = [0, 0, 0];
      currentColor = color;
    }
  }
}

// Compute uniform scale factor so the entire scene fits in a ~10-unit viewport
function normalizeScene(primitives: ParsedPrimitive[]): ParsedPrimitive[] {
  if (primitives.length === 0) return primitives;

  // Compute axis-aligned bounding box of the whole scene
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const p of primitives) {
    // Estimate extents for each primitive at its position
    let extX = 0, extY = 0, extZ = 0;
    if (p.type === 'cube') { extX = p.args[0] / 2; extY = p.args[1] / 2; extZ = p.args[2] / 2; }
    else if (p.type === 'cylinder') { const r = Math.max(p.args[0], p.args[1]); extX = r; extZ = r; extY = p.args[2] / 2; }
    else if (p.type === 'sphere') { extX = extY = extZ = p.args[0]; }

    minX = Math.min(minX, p.position[0] - extX);
    maxX = Math.max(maxX, p.position[0] + extX);
    minY = Math.min(minY, p.position[1] - extY);
    maxY = Math.max(maxY, p.position[1] + extY);
    minZ = Math.min(minZ, p.position[2] - extZ);
    maxZ = Math.max(maxZ, p.position[2] + extZ);
  }

  const sizeX = maxX - minX || 1;
  const sizeY = maxY - minY || 1;
  const sizeZ = maxZ - minZ || 1;
  const maxSpan = Math.max(sizeX, sizeY, sizeZ);

  // Target: fit the scene into a ~8 unit box for comfortable viewport viewing
  const TARGET_SIZE = 8;
  const scale = maxSpan > 0.01 ? TARGET_SIZE / maxSpan : 1;

  // Center of bounding box
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  return primitives.map(p => ({
    ...p,
    args: p.type === 'cube'
      ? [p.args[0] * scale, p.args[1] * scale, p.args[2] * scale]
      : p.type === 'cylinder'
        ? [p.args[0] * scale, p.args[1] * scale, p.args[2] * scale, p.args[3]]
        : p.type === 'sphere'
          ? [p.args[0] * scale, p.args[1], p.args[2]]
          : p.args,
    position: [
      (p.position[0] - cx) * scale,
      (p.position[1] - cy) * scale,
      (p.position[2] - cz) * scale,
    ] as [number, number, number],
  }));
}

/* ── Mermaid wiring diagram renderer ─────────────── */
mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });

function WiringMermaid({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        const id = `wiring-mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) { setSvgHtml(svg); setError(''); }
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || 'Failed to render diagram'); setSvgHtml(''); }
      }
    };
    render();
    return () => { cancelled = true; };
  }, [code]);

  if (error) return <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{code}</pre>;
  return <div ref={containerRef} className="wiring-mermaid-container flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svgHtml }} />;
}

const PrototypePreview = ({ openscadCode, parts, selectedPartLabel, onPartClick }: { openscadCode: string; parts: Part[]; selectedPartLabel?: string | null; onPartClick?: (label: string) => void }) => {
  const primitives = useMemo(() => {
    const parsed = parseOpenSCAD(openscadCode);
    if (parsed.length > 0) return parsed;
    if (parts.length === 0) return [];
    const results: ParsedPrimitive[] = [];
    const categories = [...new Set(parts.map(p => p.category))];
    parts.forEach((part, i) => {
      const catIdx = categories.indexOf(part.category);
      const row = Math.floor(i / 4);
      const col = i % 4;
      const isFab = part.fabrication === '3d_print';
      const isLaser = part.fabrication === 'laser_cut';
      const isElec = part.category === 'Electronics' || part.category === 'Sensor';
      const isPower = part.category === 'Power';
      let type: ParsedPrimitive['type'] = 'cube';
      let args: number[];
      if (isFab) { type = 'cylinder'; args = [0.25 + (i % 3) * 0.1, 0.25 + (i % 3) * 0.1, 0.4 + (i % 4) * 0.15, 24]; }
      else if (isLaser) { type = 'cube'; args = [0.7 + (i % 2) * 0.3, 0.04, 0.7 + (i % 3) * 0.2]; }
      else if (isElec) { type = 'cube'; args = [0.3, 0.1, 0.4]; }
      else if (isPower) { type = 'cylinder'; args = [0.15, 0.15, 0.5, 12]; }
      else { type = 'sphere'; args = [0.2 + (i % 3) * 0.05, 16, 16]; }
      results.push({
        type, args,
        position: [(col - 1.5) * 1.2, catIdx * 0.8, (row - 1) * 1.2],
        rotation: [0, (i * 0.3), 0],
        color: PART_COLORS[i % PART_COLORS.length],
        label: part.name
      });
    });
    return results;
  }, [openscadCode, parts]);

  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  // Sync external selectedPartLabel with internal selected state
  useEffect(() => {
    if (selectedPartLabel) {
      const idx = primitives.findIndex(p => p.label === selectedPartLabel || p.label.includes(selectedPartLabel));
      if (idx >= 0) setSelected(idx);
    }
  }, [selectedPartLabel, primitives]);

  return (
    <group>
      {primitives.map((prim, i) => {
        const isHov = hovered === i;
        const isSel = selected === i;
        const isActive = isHov || isSel;
        const dimmed = selected !== null && !isSel && !isHov;
        const isHole = prim.label.endsWith('_hole');
        return (
          <group key={i} position={prim.position} rotation={prim.rotation}>
            <mesh
              castShadow={!isHole}
              receiveShadow={!isHole}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(i); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { setHovered(null); document.body.style.cursor = 'auto'; }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelected(isSel ? null : i);
                if (onPartClick && !isSel) onPartClick(prim.label);
              }}
              scale={isActive ? 1.05 : 1}
            >
              {prim.type === 'cube' && <boxGeometry args={prim.args as [number, number, number]} />}
              {prim.type === 'cylinder' && <cylinderGeometry args={prim.args as [number, number, number, number]} />}
              {prim.type === 'sphere' && <sphereGeometry args={prim.args as [number, number, number]} />}
              {isHole ? (
                <meshPhysicalMaterial
                  color="#ff2222"
                  metalness={0.1}
                  roughness={0.8}
                  transparent
                  opacity={0.15}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              ) : (
                <meshPhysicalMaterial
                  color={prim.color}
                  metalness={isActive ? 0.6 : 0.4}
                  roughness={isActive ? 0.2 : 0.35}
                  clearcoat={0.5}
                  clearcoatRoughness={0.15}
                  emissive={isActive ? prim.color : '#000000'}
                  emissiveIntensity={isHov ? 0.35 : isSel ? 0.5 : 0}
                  transparent
                  opacity={dimmed ? 0.3 : isActive ? 1 : 0.88}
                />
              )}
            </mesh>
            {/* Edge wireframe */}
            {!isHole && (
              <mesh>
                {prim.type === 'cube' && <boxGeometry args={prim.args as [number, number, number]} />}
                {prim.type === 'cylinder' && <cylinderGeometry args={prim.args as [number, number, number, number]} />}
                {prim.type === 'sphere' && <sphereGeometry args={prim.args as [number, number, number]} />}
                <meshBasicMaterial color={isActive ? '#ffffff' : prim.color} wireframe opacity={isActive ? 0.3 : 0.1} transparent />
              </mesh>
            )}
            {/* Selection ring glow */}
            {isSel && prim.type !== 'sphere' && !isHole && (
              <mesh scale={1.08}>
                {prim.type === 'cube' && <boxGeometry args={prim.args as [number, number, number]} />}
                {prim.type === 'cylinder' && <cylinderGeometry args={prim.args as [number, number, number, number]} />}
                <meshBasicMaterial color={prim.color} transparent opacity={0.12} side={THREE.BackSide} />
              </mesh>
            )}
            {/* Floating label on hover/select */}
            {isActive && !isHole && (
              <Html distanceFactor={8} position={[0, Math.max(...(prim.args.slice(0, 3).map(a => a / 2))) + 0.3, 0]} center
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <div className="px-2 py-1 rounded bg-black/90 border border-white/20 backdrop-blur-md whitespace-nowrap"
                  style={{ boxShadow: `0 0 12px ${prim.color}40` }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: prim.color }}>
                    {prim.label.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[8px] text-white/40 ml-2 uppercase">{prim.type}</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
      {/* Ground contact shadows */}
      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2} far={6} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}
        onClick={() => setSelected(null)}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0f1e" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

// Interfaces lifted from PrototypingStudio
interface Part {
  id: string;
  name: string;
  source: string;
  price: number;
  speed: string;
  category: string;
  specs: string;
  url: string;
  fabrication?: string;
}

interface PrototypeProject {
  id: string;
  name: string;
  description: string;
  designNotes: string;
  parts: Part[];
  openscadCode: string;
  svgDesign: string;
  wiringDiagram: string;
  assemblySteps: string[];
  code: string;
  printingFiles: string[];
  communityRefs: string[];
  status: 'ideation' | 'generating' | 'ready';
}

const GENERATION_STAGES = [
  'Analyzing design requirements...',
  'Decomposing subsystems...',
  'Generating 3D parts (OpenSCAD)...',
  'Creating laser-cut profiles (SVG)...',
  'Mapping wiring connections...',
  'Writing control code...',
  'Compiling bill of materials...',
  'Blueprint complete!'
];

export default function App() {
  // Layout state
  const [engineeringMode, setEngineeringMode] = useState<'laser' | 'prototype' | 'label'>('prototype');
  const [designStyle, setDesignStyle] = useState<'minimalist' | 'deconstructivist' | 'classical' | 'organic'>('minimalist');
  const [isAdvisorMuted, setIsAdvisorMuted] = useState(false);
  const [advisorCollapsed, setAdvisorCollapsed] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [isAdvancedEditorOpen, setIsAdvancedEditorOpen] = useState(false);

  // Lifted prototype generation state (persists across tab switches)
  const [protoProject, setProtoProject] = useState<PrototypeProject | null>(null);
  const [isProtoGenerating, setIsProtoGenerating] = useState(false);
  const [protoGenerationProgress, setProtoGenerationProgress] = useState(0);
  const [protoPrompt, setProtoPrompt] = useState('');
  const [activeOutputTab, setActiveOutputTab] = useState('3d');
  const [activeDesignFileTab, setActiveDesignFileTab] = useState<'openscad' | 'svg' | 'wiring'>('openscad');
  const [designFileViewMode, setDesignFileViewMode] = useState<'preview' | 'code'>('preview');
  const [selectedPartLabel, setSelectedPartLabel] = useState<string | null>(null);
  const [selectedPrinter, setSelectedPrinter] = useState('Saturn 3 Ultra');
  const [selectedLaser, setSelectedLaser] = useState('ACMER S1');
  const [bomSortMode, setBomSortMode] = useState<'fastest' | 'cheapest' | 'none'>('none');
  const [shoppingList, setShoppingList] = useState<Set<string>>(new Set());
  const [generationStage, setGenerationStage] = useState('');
  const [materialPresets, setMaterialPresets] = useState<Record<string, LaserSettings>>(ACMER_S1_PARAMETERS);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Image Processing Options
  const [procOptions, setProcOptions] = useState<ImageProcessOptions>({
    brightness: 0,
    contrast: 0,
    threshold: 128,
    dither: true,
    invert: false,
    edgeDetection: false,
    rotate: 0,
    flipH: false,
    flipV: false,
  });

  // Laser Settings
  const [laserSettings, setLaserSettings] = useState<LaserSettings>({
    engraved: true, power: 80, speed: 2000, passes: 1, mode: 'M4', quality: 10
  });

  const [designPrompt, setDesignPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ── Concept Sketch State ──
  const [sketchMode, setSketchMode] = useState<SketchMode>('refined');
  const [conceptSketchImage, setConceptSketchImage] = useState<string | null>(null);
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
  const [showConceptPanel, setShowConceptPanel] = useState(false);

  // ── Reference Image State ──
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [communityResults, setCommunityResults] = useState<string | null>(null);
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);
  const [variantPrompt, setVariantPrompt] = useState('');
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false);

  // ── Label/Sticker/Decal State ──
  const [labelSettings, setLabelSettings] = useState<LabelSettings>({
    printerModel: MUNBYN_ITPP130B.name,
    labelWidth: 101.6,
    labelHeight: 152.4,
    dpi: 203,
    orientation: 'portrait',
    copies: 1,
    showCutLine: false,
  });
  const [labelDesignImage, setLabelDesignImage] = useState<string | null>(null);
  const [labelSilhouetteSvg, setLabelSilhouetteSvg] = useState<string | null>(null);
  const [labelText, setLabelText] = useState('');
  const [labelTextSize, setLabelTextSize] = useState(24);
  const [labelPrompt, setLabelPrompt] = useState('');
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const labelCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Mobile Menu State ──
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Component Registry State ──
  const [showRegistry, setShowRegistry] = useState(false);
  const [componentRegistry, setComponentRegistry] = useState<{ id: string; name: string; category: string; specs: string; notes: string; addedAt: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('substrata_component_registry') || '[]'); } catch { return []; }
  });
  const [registryInput, setRegistryInput] = useState('');

  // ── AR Viewer State ──
  const [arGlbUrl, setArGlbUrl] = useState<string | null>(null);
  const [showArViewer, setShowArViewer] = useState(false);

  // Auth State
  const [user, setUser] = useState<CloudflareUser | null>(null);
  const [savedProjects, setSavedProjects] = useState<LaserProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      fetchProjects();
    });
    return () => unsubscribe();
  }, []);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const projects = await getProjects();
      setSavedProjects(projects);
    } catch (e) {
      toast.error("Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleSaveProject = async () => {
    if (!user) {
      toast.info("Please log in to save projects");
      return;
    }
    if (!originalImage) {
      toast.error("Nothing to save");
      return;
    }

    const projectId = `proj_${Date.now()}`;
    const name = designPrompt || `Project ${new Date().toLocaleDateString()}`;

    try {
      await saveProject({
        id: projectId,
        name: name,
        originalImage: originalImage,
        processedImage: processedImage,
        laserSettings: laserSettings,
        procOptions: procOptions
      });
      toast.success("Project saved successfully!");
      fetchProjects();
    } catch (e) {
      toast.error("Failed to save project");
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProject(id);
      toast.success("Project deleted");
      fetchProjects();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const loadProject = (project: LaserProject) => {
    setOriginalImage(project.originalImage);
    setProcessedImage(project.processedImage);
    setLaserSettings(project.laserSettings);
    setProcOptions(project.procOptions);
    setEngineeringMode('laser');
    toast.success(`Loaded ${project.name}`);
  };

  const handleRenameProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const project = savedProjects.find(p => p.id === id);
    const newName = window.prompt("Enter new name for your project:", project?.name || "");
    if (!newName) return;
    try {
      await renameProject(id, newName);
      toast.success("Project renamed");
      fetchProjects();
    } catch (e) {
      toast.error("Rename failed");
    }
  };

  const handleDuplicateProject = async (project: LaserProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const newId = `proj_${Date.now()}`;
      // Extract only the fields allowed by saveProject
      const { name, originalImage, processedImage, laserSettings, procOptions } = project;
      await saveProject({
        id: newId,
        name: `${name} (Copy)`,
        originalImage,
        processedImage,
        laserSettings,
        procOptions
      });
      toast.success("Project duplicated");
      fetchProjects();
    } catch (e) {
      toast.error("Duplicate failed");
    }
  };

  const handleShareProject = (project: LaserProject, e: React.MouseEvent) => {
    e.stopPropagation();
    // Simulate share - in a real app this might copy a link or open a share dialog
    navigator.clipboard.writeText(JSON.stringify(project));
    toast.success("Project data copied to clipboard!");
  };

  const handleExportRaster = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `beamcraft-export-${Date.now()}.png`;
    link.click();
    toast.success("Raster image (PNG) exported");
  };

  const handleExportVector = () => {
    if (!processedImage) return;
    // Simple SVG wrapper for the raster as a fallback for 'vector export'
    // A true vectorization would require center-line tracing which is complex client-side.
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  <image width="1000" height="1000" href="${processedImage}" />
  <metadata> BeamCraft Laser Export - Processed Vector Wrapper </metadata>
</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beamcraft-export-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Vector wrapper (SVG) exported");
  };

  const handleClaimAllTemplates = async () => {
    if (!user) {
      toast.info("LogIn to claim all templates to your library");
      return;
    }
    setIsLoadingProjects(true);
    try {
      for (const template of PROJECT_TEMPLATES) {
        await saveProject({
          id: `template_${template.id}_${Date.now()}`,
          name: `Ref: ${template.name}`,
          originalImage: template.image,
          processedImage: template.image,
          laserSettings: { engraved: true, power: 80, speed: 2000, passes: 1, mode: 'M4', quality: 10 },
          procOptions: { 
            brightness: 0, 
            contrast: 0, 
            threshold: 128, 
            dither: true, 
            invert: false, 
            edgeDetection: false,
            rotate: 0,
            flipH: false,
            flipV: false
          }
        });
      }
      toast.success("All templates added to your library!");
      fetchProjects();
    } catch (e) {
      toast.error("Failed to batch import templates");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // ── Label/Sticker/Decal Handlers ──
  const handleLabelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLabelDesignImage(dataUrl);
      setLabelSilhouetteSvg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateLabelDesign = async () => {
    if (!labelPrompt.trim()) return;
    setIsGeneratingLabel(true);
    try {
      const result = await generateLaserDesign(
        `Design a label/sticker: ${labelPrompt}. High contrast, clean edges, suitable for thermal printing at ${labelSettings.dpi} DPI. Dimensions: ${labelSettings.labelWidth}mm x ${labelSettings.labelHeight}mm. Black and white only.`,
        designStyle,
        labelSettings.labelWidth > labelSettings.labelHeight ? '16:9' : '9:16'
      );
      setLabelDesignImage(result);
      setLabelSilhouetteSvg(null);
      toast.success("Label design generated");
    } catch (err) {
      toast.error("Failed to generate label design");
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleGenerateSilhouette = async () => {
    if (!labelDesignImage) return;
    try {
      const svg = await generateEdgeSilhouette(labelDesignImage, procOptions.threshold);
      setLabelSilhouetteSvg(svg);
      setLabelSettings(s => ({ ...s, showCutLine: true }));
      toast.success("Silhouette cut line generated");
    } catch (err) {
      toast.error("Failed to generate silhouette");
    }
  };

  const handleExportLabel = () => {
    if (!labelDesignImage) return;
    // Render label to canvas at print DPI
    const pxW = Math.round((labelSettings.labelWidth / 25.4) * labelSettings.dpi);
    const pxH = Math.round((labelSettings.labelHeight / 25.4) * labelSettings.dpi);
    const canvas = document.createElement('canvas');
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, pxW, pxH);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Scale to fit
      const scale = Math.min(pxW / img.width, pxH / img.height) * 0.9;
      const dx = (pxW - img.width * scale) / 2;
      const dy = (pxH - img.height * scale) / 2;
      ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);

      // Add text if present
      if (labelText.trim()) {
        ctx.fillStyle = 'black';
        ctx.font = `bold ${labelTextSize * (labelSettings.dpi / 96)}px 'Helvetica Neue', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(labelText, pxW / 2, pxH - labelTextSize * 2);
      }

      const blob = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = blob;
      a.download = `label_${labelSettings.labelWidth}x${labelSettings.labelHeight}mm_${labelSettings.dpi}dpi.png`;
      a.click();
      toast.success(`Label exported at ${pxW}×${pxH}px (${labelSettings.dpi} DPI)`);
    };
    img.src = labelDesignImage;
  };

  const handleExportSilhouetteSvg = () => {
    if (!labelSilhouetteSvg) return;
    const blob = new Blob([labelSilhouetteSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cutline_${labelSettings.labelWidth}x${labelSettings.labelHeight}mm.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Silhouette SVG exported for laser cutting");
  };

  // ── STL Export from 3D Scene ──
  const handleExportSTL = () => {
    if (!protoProject?.openscadCode) { toast.error('No 3D model to export'); return; }
    const primitives = parseOpenSCAD(protoProject.openscadCode);
    if (primitives.length === 0) { toast.error('No geometry parsed'); return; }

    // Build merged geometry for STL
    const geometries: THREE.BufferGeometry[] = [];
    for (const prim of primitives) {
      let geo: THREE.BufferGeometry;
      if (prim.type === 'cube') geo = new THREE.BoxGeometry(prim.args[0], prim.args[1], prim.args[2]);
      else if (prim.type === 'cylinder') geo = new THREE.CylinderGeometry(prim.args[0], prim.args[1], prim.args[2], prim.args[3] || 24);
      else if (prim.type === 'sphere') geo = new THREE.SphereGeometry(prim.args[0], prim.args[1] || 24, prim.args[2] || 24);
      else continue;

      geo.translate(prim.position[0], prim.position[1], prim.position[2]);
      if (prim.rotation[0] || prim.rotation[1] || prim.rotation[2]) {
        geo.rotateX(prim.rotation[0]);
        geo.rotateY(prim.rotation[1]);
        geo.rotateZ(prim.rotation[2]);
      }
      geometries.push(geo);
    }

    // Simple ASCII STL export
    let stl = 'solid substrata_export\n';
    for (const geo of geometries) {
      const posAttr = geo.getAttribute('position');
      const indexAttr = geo.getIndex();
      const positions = posAttr as THREE.BufferAttribute;
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i += 3) {
          const a = indexAttr.getX(i), b = indexAttr.getX(i + 1), c = indexAttr.getX(i + 2);
          const v0 = new THREE.Vector3(positions.getX(a), positions.getY(a), positions.getZ(a));
          const v1 = new THREE.Vector3(positions.getX(b), positions.getY(b), positions.getZ(b));
          const v2 = new THREE.Vector3(positions.getX(c), positions.getY(c), positions.getZ(c));
          const normal = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(v1, v0), new THREE.Vector3().subVectors(v2, v0)).normalize();
          stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n    outer loop\n      vertex ${v0.x} ${v0.y} ${v0.z}\n      vertex ${v1.x} ${v1.y} ${v1.z}\n      vertex ${v2.x} ${v2.y} ${v2.z}\n    endloop\n  endfacet\n`;
        }
      }
      geo.dispose();
    }
    stl += 'endsolid substrata_export\n';

    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(protoProject.name || 'model').replace(/[^a-zA-Z0-9]/g, '_')}.stl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('STL mesh exported!');
  };

  // ── GLB Export from 3D Scene ──
  const buildSceneGeometries = (): { mesh: THREE.Mesh; color: string }[] => {
    if (!protoProject?.openscadCode) return [];
    const primitives = parseOpenSCAD(protoProject.openscadCode);
    return primitives.map(prim => {
      let geo: THREE.BufferGeometry;
      if (prim.type === 'cube') geo = new THREE.BoxGeometry(prim.args[0], prim.args[1], prim.args[2]);
      else if (prim.type === 'cylinder') geo = new THREE.CylinderGeometry(prim.args[0], prim.args[1], prim.args[2], prim.args[3] || 24);
      else if (prim.type === 'sphere') geo = new THREE.SphereGeometry(prim.args[0], prim.args[1] || 24, prim.args[2] || 24);
      else geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);

      const mat = new THREE.MeshStandardMaterial({ color: prim.color, roughness: 0.4, metalness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(prim.position[0], prim.position[1], prim.position[2]);
      mesh.rotation.set(prim.rotation[0], prim.rotation[1], prim.rotation[2]);
      mesh.name = prim.label;
      return { mesh, color: prim.color };
    });
  };

  const handleExportGLB = async () => {
    if (!protoProject?.openscadCode) { toast.error('No 3D model to export'); return; }
    const meshes = buildSceneGeometries();
    if (meshes.length === 0) { toast.error('No geometry parsed'); return; }

    // Dynamically import GLTFExporter
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();
    const scene = new THREE.Scene();
    meshes.forEach(({ mesh }) => scene.add(mesh));

    exporter.parse(scene, (result) => {
      const output = result as ArrayBuffer;
      const blob = new Blob([output], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(protoProject.name || 'model').replace(/[^a-zA-Z0-9]/g, '_')}.glb`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('GLB mesh exported!');
    }, (error) => {
      console.error('GLB export error:', error);
      toast.error('Failed to export GLB');
    }, { binary: true });
  };

  // ── View in AR ──
  const handleViewInAR = async () => {
    if (!protoProject?.openscadCode) { toast.error('No 3D model for AR'); return; }
    const meshes = buildSceneGeometries();
    if (meshes.length === 0) { toast.error('No geometry parsed'); return; }

    toast.info('Preparing AR model...');
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();
    const scene = new THREE.Scene();
    meshes.forEach(({ mesh }) => scene.add(mesh));

    exporter.parse(scene, (result) => {
      // Revoke previous URL if any
      if (arGlbUrl) URL.revokeObjectURL(arGlbUrl);
      const output = result as ArrayBuffer;
      const blob = new Blob([output], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      setArGlbUrl(url);
      setShowArViewer(true);
    }, (error) => {
      console.error('AR export error:', error);
      toast.error('Failed to prepare AR model');
    }, { binary: true });
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-process image when options change
  useEffect(() => {
    if (originalImage) {
      handleProcess();
    }
  }, [originalImage, procOptions]);

  const handleProcess = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      const result = await processImageForLaser(originalImage, procOptions);
      setProcessedImage(result);
    } catch (error) {
      toast.error("Process failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setOriginalImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!designPrompt) return;
    setIsGenerating(true);
    try {
      const result = await generateLaserDesign(designPrompt, designStyle, '1:1', referenceImage || undefined);
      if (result) {
        setOriginalImage(result);
        toast.success(`Design generated in ${designStyle} style!`);
      }
    } catch (error) {
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSketch = async (mode?: SketchMode, asSheet?: boolean) => {
    const prompt = engineeringMode === 'prototype' ? protoPrompt : designPrompt;
    if (!prompt) { toast.error('Enter a design prompt first'); return; }
    setIsGeneratingSketch(true);
    try {
      const m = mode || sketchMode;
      const ref = referenceImage || originalImage || undefined;
      const result = asSheet
        ? await generateConceptSheet(prompt, designStyle, ref)
        : await generateConceptSketch(prompt, designStyle, m, ref);
      if (result) {
        setConceptSketchImage(result);
        setShowConceptPanel(true);
        toast.success(asSheet ? 'Concept sheet generated!' : `${m} sketch generated!`);
      } else {
        toast.error('Sketch generation returned no image');
      }
    } catch (error) {
      toast.error('Sketch generation failed');
    } finally {
      setIsGeneratingSketch(false);
    }
  };

  const handleSearchCommunity = async () => {
    const prompt = engineeringMode === 'prototype' ? protoPrompt : designPrompt;
    if (!prompt) { toast.error('Enter a design prompt first'); return; }
    setIsSearchingCommunity(true);
    try {
      const results = await searchCommunityModels(prompt);
      setCommunityResults(results);
      setShowConceptPanel(true);
      toast.success('Community search complete!');
    } catch {
      toast.error('Community search failed');
    } finally {
      setIsSearchingCommunity(false);
    }
  };

  const handleGenerateVariant = async () => {
    if (!protoProject?.openscadCode) { toast.error('Generate a prototype first'); return; }
    if (!variantPrompt.trim()) { toast.error('Describe the variant you want'); return; }
    setIsGeneratingVariant(true);
    try {
      const result = await generateParametricVariant(protoProject.openscadCode, variantPrompt, designStyle);
      setProtoProject(prev => prev ? { ...prev, openscadCode: result.code, designNotes: prev.designNotes + `\n\nVARIANT: ${result.description}` } : prev);
      setVariantPrompt('');
      toast.success('Parametric variant generated!');
    } catch {
      toast.error('Variant generation failed');
    } finally {
      setIsGeneratingVariant(false);
    }
  };

  const startRecording = async () => {
    // Use Web Speech API for instant recognition if available
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      (window as any).__substrata_recognition = recognition;

      let finalTranscript = '';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interim = transcript;
          }
        }
        // Show live transcript as user speaks
        setDesignPrompt(finalTranscript + interim);
      };
      recognition.onerror = () => {
        setIsTranscribing(false);
        toast.error("Speech recognition error");
      };
      recognition.onend = () => {
        setIsTranscribing(false);
        if (finalTranscript.trim()) toast.success("Voice transcribed!");
      };
      recognition.start();
      setIsTranscribing(true);
      return;
    }

    // Fallback: MediaRecorder + Gemini transcription
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const transcript = await transcribeSpokenPrompt(base64Audio);
            setDesignPrompt(transcript);
            toast.success("Voice transcribed!");
          } catch (e) {
            toast.error("Transcription failed");
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsTranscribing(true);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    // Stop Web Speech API if active
    const recognition = (window as any).__substrata_recognition;
    if (recognition) {
      recognition.stop();
      (window as any).__substrata_recognition = null;
      return;
    }
    // Fallback: stop MediaRecorder
    mediaRecorderRef.current?.stop();
    setIsTranscribing(false);
  };

  const applySmartSettings = (material: string) => {
    const settings = materialPresets[material];
    if (settings) {
      setLaserSettings(settings);
      toast.success(`Applied settings for ${material}`);
    }
  };

  const handleSaveMaterialPreset = (name: string, settings: LaserSettings) => {
    setMaterialPresets(prev => ({
      ...prev,
      [name]: settings
    }));
    toast.success(`New preset saved: ${name}`);
    // Also auto-apply it
    setLaserSettings(settings);
  };

  const handleBuildBlueprint = (projectDescription: string) => {
    setEngineeringMode('prototype');
    setProtoPrompt(projectDescription);
    handleGeneratePrototype(projectDescription);
    toast.success("Blueprint generation triggered from Advisor!");
  };

  // ── Component Registry Handlers ──
  useEffect(() => {
    localStorage.setItem('substrata_component_registry', JSON.stringify(componentRegistry));
  }, [componentRegistry]);

  const handleAddToRegistry = (name: string, category: string, specs: string) => {
    const item = { id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, category, specs, notes: '', addedAt: Date.now() };
    setComponentRegistry(prev => [...prev, item]);
    toast.success(`Added "${name}" to registry`);
  };

  const handleRemoveFromRegistry = (id: string) => {
    setComponentRegistry(prev => prev.filter(c => c.id !== id));
  };

  const getRegistrySummary = () => {
    if (componentRegistry.length === 0) return '';
    const groups = componentRegistry.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push(c.name + (c.specs ? ` (${c.specs})` : ''));
      return acc;
    }, {} as Record<string, string[]>);
    return Object.entries(groups).map(([cat, items]) => `${cat}: ${items.join(', ')}`).join('; ');
  };

  // ── Export All Handler — Rich PDF with rendered visuals ──
  const handleExportAll = async () => {
    if (!protoProject) { toast.error('No project to export'); return; }
    const p = protoProject;
    const totalCost = p.parts.reduce((s, part) => s + part.price, 0);
    toast.info('Preparing rich PDF export…');

    // ── Render Mermaid wiring diagram to SVG ──
    let wiringDiagramSvg = '';
    if (p.wiringDiagram && p.wiringDiagram !== 'No electronics in this design') {
      const mermaidCode = p.wiringDiagram.split('---')[0].trim();
      const textSummary = p.wiringDiagram.includes('---') ? p.wiringDiagram.split('---').slice(1).join('---').trim() : '';
      try {
        const { svg } = await mermaid.render(`export-wiring-${Date.now()}`, mermaidCode);
        wiringDiagramSvg = svg;
      } catch { wiringDiagramSvg = ''; }
      if (textSummary) {
        wiringDiagramSvg += `<div class="wiring-text">${textSummary.replace(/\n/g, '<br/>')}</div>`;
      }
    }

    // ── Split and render SVG designs ──
    let svgDesignHtml = '';
    if (p.svgDesign) {
      const parts = p.svgDesign.split(/<!--\s*PART_BREAK\s*-->/i).filter(s => s.trim());
      svgDesignHtml = parts.map((svgPart, i) => {
        const sanitized = sanitizeSvg(svgPart.trim());
        return `<div class="svg-part"><h4>Part ${i + 1}</h4><div class="svg-render">${sanitized}</div></div>`;
      }).join('');
    }

    // ── Generate assembly step visuals ──
    let assemblyHtml = '';
    if (p.assemblySteps.length > 0) {
      assemblyHtml = p.assemblySteps.map((step, i) => {
        // Find which parts are mentioned in this step
        const mentionedParts = p.parts.filter(part =>
          step.toLowerCase().includes(part.name.toLowerCase())
        );
        const partBadges = mentionedParts.map(pp =>
          `<span class="part-badge">${pp.name}</span>`
        ).join('');
        return `<div class="assembly-step">
          <div class="step-number">${i + 1}</div>
          <div class="step-content">
            <p>${step}</p>
            ${partBadges ? `<div class="step-parts">Parts: ${partBadges}</div>` : ''}
          </div>
        </div>`;
      }).join('');
    }

    // ── Generate 3D parts reference diagram (SVG schematic of parsed geometry) ──
    let partsLayoutSvg = '';
    if (p.openscadCode && !p.openscadCode.startsWith('//')) {
      const primitives = parseOpenSCAD(p.openscadCode);
      if (primitives.length > 0) {
        // Create a top-down schematic of all parts with labels
        const svgW = 600, svgH = 400;
        const shapes = primitives.map((prim, i) => {
          // Map 3D positions to 2D layout (XZ top-down view)
          const x = svgW / 2 + prim.position[0] * 30;
          const y = svgH / 2 + prim.position[2] * 30;
          const size = prim.type === 'sphere' ? prim.args[0] * 20
            : prim.type === 'cylinder' ? Math.max(prim.args[0], prim.args[1]) * 20
            : Math.max(prim.args[0], prim.args[2]) * 10;
          const displaySize = Math.max(8, Math.min(size, 80));

          if (prim.type === 'cylinder' || prim.type === 'sphere') {
            return `<circle cx="${x}" cy="${y}" r="${displaySize}" fill="${prim.color}22" stroke="${prim.color}" stroke-width="2"/>
              <text x="${x}" y="${y + displaySize + 14}" text-anchor="middle" fill="#333" font-size="10">${prim.label}</text>`;
          }
          return `<rect x="${x - displaySize}" y="${y - displaySize / 2}" width="${displaySize * 2}" height="${displaySize}" fill="${prim.color}22" stroke="${prim.color}" stroke-width="2" rx="3"/>
            <text x="${x}" y="${y + displaySize / 2 + 14}" text-anchor="middle" fill="#333" font-size="10">${prim.label}</text>`;
        }).join('\n');
        partsLayoutSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="max-height:400px">
          <text x="${svgW / 2}" y="20" text-anchor="middle" fill="#0066cc" font-size="14" font-weight="bold">Parts Layout — Top-Down View</text>
          <line x1="50" y1="${svgH / 2}" x2="${svgW - 50}" y2="${svgH / 2}" stroke="#ddd" stroke-dasharray="4"/>
          <line x1="${svgW / 2}" y1="30" x2="${svgW / 2}" y2="${svgH - 20}" stroke="#ddd" stroke-dasharray="4"/>
          ${shapes}
        </svg>`;
      }
    }

    // ── Build the full HTML document ──
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${p.name || 'Project'} — SUBSTRATA Export</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #222; line-height: 1.7; padding: 2rem; max-width: 960px; margin: 0 auto; }
  h1 { color: #0066cc; font-size: 1.8rem; margin: 0 0 0.5rem; border-bottom: 3px solid #0066cc; padding-bottom: 0.5rem; }
  h2 { color: #0066cc; font-size: 1.3rem; margin: 2rem 0 0.8rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3rem; }
  h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: #333; }
  h4 { font-size: 0.95rem; margin: 0.5rem 0; color: #555; }
  p { margin-bottom: 0.7rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .meta span { display: inline-block; margin-right: 1.5rem; }

  /* BOM Table */
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
  th { background: #f0f8ff; color: #0066cc; font-weight: 600; text-align: left; padding: 0.5rem 0.6rem; border: 1px solid #ddd; }
  td { padding: 0.4rem 0.6rem; border: 1px solid #ddd; }
  tr:nth-child(even) { background: #fafafa; }
  .total-row { font-weight: 700; background: #f0f8ff !important; }

  /* Assembly Steps */
  .assembly-step { display: flex; gap: 1rem; margin: 0.75rem 0; align-items: flex-start; }
  .step-number { flex-shrink: 0; width: 32px; height: 32px; background: #0066cc; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; }
  .step-content { flex: 1; padding-top: 0.2rem; }
  .step-parts { margin-top: 0.3rem; }
  .part-badge { display: inline-block; background: #e8f4fd; color: #0066cc; padding: 0.1rem 0.5rem; border-radius: 12px; font-size: 0.75rem; margin: 0.1rem 0.2rem; border: 1px solid #b3d9f2; }

  /* Wiring Diagram */
  .wiring-container { margin: 1.5rem 0; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; text-align: center; }
  .wiring-container svg { max-width: 100%; height: auto; }
  .wiring-text { text-align: left; margin-top: 1rem; font-size: 0.85rem; color: #555; white-space: pre-line; }

  /* SVG Parts */
  .svg-part { margin: 1rem 0; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; background: #fafafa; }
  .svg-render { display: flex; justify-content: center; }
  .svg-render svg { max-width: 100%; max-height: 300px; }

  /* Parts Layout */
  .parts-layout { margin: 1.5rem 0; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; background: #fff; text-align: center; }

  /* Code blocks */
  pre { background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 6px; padding: 1rem; overflow-x: auto; margin: 1rem 0; font-size: 0.8rem; line-height: 1.5; }
  code { font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; }

  /* Design Reference */
  .design-ref { background: #f8f9fa; border-left: 4px solid #0066cc; padding: 1rem 1.2rem; margin: 1rem 0; font-size: 0.85rem; }
  .design-ref h4 { color: #0066cc; margin-bottom: 0.3rem; }
  .design-ref ul { padding-left: 1.2rem; margin: 0.3rem 0; }
  .design-ref li { margin-bottom: 0.15rem; }

  /* Community refs */
  .community-ref { margin: 0.3rem 0; }

  /* Footer */
  .footer { margin-top: 3rem; border-top: 2px solid #e0e0e0; padding-top: 1rem; text-align: center; color: #999; font-size: 0.8rem; }

  @page { margin: 1.5cm; size: A4; }
  @media print {
    body { padding: 0; }
    h2 { page-break-after: avoid; }
    .assembly-step { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    pre { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<h1>${p.name || 'Untitled Project'}</h1>
<div class="meta">
  <span>Generated by <strong>SUBSTRATA by GANTASMO</strong></span>
  <span>Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  <span>Parts: ${p.parts.length}</span>
  <span>Est. Cost: $${totalCost.toFixed(2)}</span>
</div>

<h2>Project Overview</h2>
<p>${(p.description || 'No description provided.').replace(/\n/g, '<br/>')}</p>
${p.designNotes ? `<h3>Design Notes</h3><p>${p.designNotes.replace(/\n/g, '<br/>')}</p>` : ''}

<h2>Bill of Materials (${p.parts.length} parts)</h2>
<table>
  <thead><tr><th>#</th><th>Part</th><th>Source</th><th>Price</th><th>Lead Time</th><th>Specifications</th></tr></thead>
  <tbody>
    ${p.parts.map((part, i) => `<tr><td>${i + 1}</td><td><strong>${part.name}</strong></td><td>${part.source}</td><td>$${part.price.toFixed(2)}</td><td>${part.speed}</td><td>${part.specs}</td></tr>`).join('\n    ')}
    <tr class="total-row"><td colspan="3">TOTAL</td><td>$${totalCost.toFixed(2)}</td><td colspan="2">${p.parts.length} components</td></tr>
  </tbody>
</table>

${assemblyHtml ? `<h2>Assembly Instructions</h2>${assemblyHtml}` : ''}

${wiringDiagramSvg ? `<h2>Wiring / Circuit Diagram</h2><div class="wiring-container">${wiringDiagramSvg}</div>` : ''}

${svgDesignHtml ? `<h2>Laser-Cut / SVG Design Sheets</h2>${svgDesignHtml}` : ''}

${partsLayoutSvg ? `<h2>3D Parts Layout</h2><div class="parts-layout">${partsLayoutSvg}</div>` : ''}

${p.openscadCode && !p.openscadCode.startsWith('//') ? `<h2>3D Model (OpenSCAD Source)</h2><pre><code>${p.openscadCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>` : ''}

${p.code ? `<h2>Firmware / Control Code</h2><pre><code>${p.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>` : ''}

${p.communityRefs && p.communityRefs.length > 0 ? `<h2>Community References</h2>${p.communityRefs.map(ref => `<div class="community-ref">• ${ref}</div>`).join('\n')}` : ''}

${componentRegistry.length > 0 ? `<h2>Component Inventory</h2><table>
  <thead><tr><th>Component</th><th>Category</th><th>Specs</th></tr></thead>
  <tbody>${componentRegistry.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.category}</td><td>${c.specs}${c.notes ? ` — ${c.notes}` : ''}</td></tr>`).join('\n')}</tbody>
</table>` : ''}

<h2>Design Reference Guide</h2>
<div class="design-ref">
  <h4>3D Printing DFM</h4>
  <ul>
    <li>Min wall: 1.2mm FDM, 0.8mm SLA</li>
    <li>Overhang limit: 45° without supports</li>
    <li>Hole tolerance: 0.2–0.4mm undersized, ream to fit</li>
    <li>Screw bosses: Use heat-set brass inserts (M3 = 4.0mm hole)</li>
    <li>Snap fits: 1–2mm deflection; PETG for flex fatigue</li>
  </ul>
</div>
<div class="design-ref">
  <h4>Laser Cutting DFM</h4>
  <ul>
    <li>Kerf: ~0.1–0.2mm/side for diode on wood</li>
    <li>Tab-and-slot: 0.1mm interference for press-fit</li>
    <li>Max cut: ~3mm balsa, ~2mm MDF (multi-pass)</li>
    <li>NEVER cut PVC/vinyl (toxic gas)</li>
  </ul>
</div>
<div class="design-ref">
  <h4>Electronics Design Rules</h4>
  <ul>
    <li>100nF ceramic decoupling on every IC VCC</li>
    <li>Never power servos from MCU/USB — use separate BEC</li>
    <li>Flyback diodes on all motor/relay coils</li>
    <li>ESP32 is 3.3V logic — use level shifters for 5V</li>
    <li>I2C: 4.7kΩ pull-ups on SDA/SCL (per bus)</li>
  </ul>
</div>
<div class="design-ref">
  <h4>Mechanical Design</h4>
  <ul>
    <li>Gear module 1.0–2.0 for 3D printed, min 12 teeth</li>
    <li>Fastener engagement: ≥1.5× diameter (metal), 2× (plastic)</li>
    <li>Use rubber grommets / TPU dampers for motor mounts</li>
    <li>Bearing: 608ZZ general, 6001ZZ heavier loads</li>
  </ul>
</div>

<div class="footer">
  <p>Exported from SUBSTRATA by GANTASMO • ${new Date().toISOString().split('T')[0]}</p>
  <p>All dimensions in millimeters unless noted. Verify critical dimensions before fabrication.</p>
</div>

<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: download as HTML if popup blocked
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(p.name || 'project').replace(/[^a-zA-Z0-9]/g, '_')}_full_export.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported as HTML (enable popups for direct PDF)');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('PDF export ready — use the print dialog to save as PDF');
  };

  // Sorted parts memo for BOM
  const sortedParts = useMemo(() => {
    if (!protoProject) return [];
    let list = [...protoProject.parts];
    if (bomSortMode === 'cheapest') list.sort((a, b) => a.price - b.price);
    else if (bomSortMode === 'fastest') {
      const w: Record<string, number> = { 'Today': 0, 'Tomorrow': 1, '2-3 Days': 2, '1-Week': 3, '2-Weeks': 4 };
      list.sort((a, b) => (w[a.speed] || 99) - (w[b.speed] || 99));
    }
    return list;
  }, [protoProject, bomSortMode]);

  // Prototype generation — lifted from PrototypingStudio so it survives tab switches
  const handleGeneratePrototype = async (overridePrompt?: string) => {
    const activePrompt = overridePrompt || protoPrompt;
    if (!activePrompt.trim()) {
      toast.error("Please describe your prototype idea");
      return;
    }

    setIsProtoGenerating(true);
    setProtoGenerationProgress(10);
    setGenerationStage(GENERATION_STAGES[0]);

    try {
      setProtoGenerationProgress(20);
      let stageIdx = 0;
      const progressInterval = setInterval(() => {
        setProtoGenerationProgress(p => Math.min(p + 5, 85));
        stageIdx = Math.min(stageIdx + 1, GENERATION_STAGES.length - 2);
        setGenerationStage(GENERATION_STAGES[stageIdx]);
      }, 2500);

      const registrySummary = getRegistrySummary();
      const enrichedPrompt = registrySummary 
        ? `${activePrompt}\n\n[User's existing component inventory: ${registrySummary}]` 
        : activePrompt;
      const data = await generateProjectBlueprint(enrichedPrompt, designStyle, selectedPrinter, '', referenceImage || undefined);
      
      clearInterval(progressInterval);
      setProtoGenerationProgress(90);
      setGenerationStage(GENERATION_STAGES[GENERATION_STAGES.length - 1]);
      
      const newProject: PrototypeProject = {
        id: `proto_${Date.now()}`,
        name: data.name,
        description: data.description,
        designNotes: data.designNotes || '',
        parts: (data.parts || []).map((p: any) => ({ ...p, id: p.id || Math.random().toString(36).substr(2, 9) })),
        openscadCode: data.openscadCode || '// No custom 3D parts generated',
        svgDesign: data.svgDesign || '',
        wiringDiagram: data.wiringDiagram || 'No electronics in this design',
        assemblySteps: data.assemblySteps || [],
        code: data.code,
        printingFiles: data.printingFiles || [],
        communityRefs: data.communityRefs || [],
        status: 'ready'
      };

      setProtoProject(newProject);
      setProtoGenerationProgress(100);
      setActiveOutputTab('bom');
      toast.success("Blueprint Generated — Design files ready!");
    } catch (error) {
      console.error(error);
      toast.error("Generation failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsProtoGenerating(false);
        setProtoGenerationProgress(0);
        setGenerationStage('');
      }, 500);
    }
  };

  const handleAnalyzeMaterial = async () => {
    if (!originalImage) return;
    setIsAnalyzing(true);
    try {
        const result = await analyzeLaserMaterial(originalImage);
        toast.info("Material Analysis Complete: " + result.slice(0, 100) + "...");
    } catch (e) {
        toast.error("Analysis failed");
    } finally {
        setIsAnalyzing(false);
    }
  }

  const handleExtrudeFromImage = async () => {
    const src = conceptSketchImage || referenceImage || originalImage;
    if (!src) { toast.error('Load or generate an image first'); return; }
    try {
      toast.info('Extracting profile and generating extrusion...');
      const result = await extractProfileForExtrusion(src, { extrudeHeight: 10, scaleMm: 50 });
      // Inject the extruded OpenSCAD into a new prototype project
      const newProject: PrototypeProject = {
        id: `extrude_${Date.now()}`,
        name: 'Extruded Profile',
        description: `Profile extruded from reference image (${result.pointCount} points, ${result.boundingBox.width.toFixed(1)}x${result.boundingBox.height.toFixed(1)}mm)`,
        designNotes: 'Auto-generated from image silhouette extrusion. Edit the OpenSCAD code to add features like fillets, holes, or Boolean operations.',
        parts: [],
        openscadCode: result.openscad,
        svgDesign: result.svgProfile,
        wiringDiagram: '',
        assemblySteps: ['Modify extruded profile in OpenSCAD', 'Export as STL for 3D printing', 'Add detail features as needed'],
        code: '',
        printingFiles: [],
        communityRefs: [],
        status: 'ready'
      };
      setProtoProject(newProject);
      setEngineeringMode('prototype');
      setActiveOutputTab('3d');
      setActiveDesignFileTab('openscad');
      toast.success(`Profile extruded: ${result.pointCount} points, ${result.boundingBox.width.toFixed(1)}x${result.boundingBox.height.toFixed(1)}mm`);
    } catch (error) {
      toast.error('Extrusion failed — image may not have clear edges');
    }
  }

  return (
    <div className="flex flex-col overflow-hidden bg-transparent text-white font-sans selection:bg-laser-accent selection:text-black" style={{ height: '100dvh' }}>
      {/* Advanced Editor Modal */}
      <AnimatePresence>
        {isAdvancedEditorOpen && processedImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] p-4 md:p-12 flex items-center justify-center bg-black/80 backdrop-blur-xl"
          >
            <div className="w-full h-full max-w-5xl">
              <AdvancedEditor 
                imageUrl={processedImage} 
                onCancel={() => setIsAdvancedEditorOpen(false)}
                onSave={(newImage: string) => {
                  setProcessedImage(newImage);
                  setIsAdvancedEditorOpen(false);
                  toast.success("Design synth completed");
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library Drawer */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLibrary(false)}
          >
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-xl glass-panel !rounded-none border-l border-white/10 overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl z-10">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Project Library</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowLibrary(false)} className="h-8 w-8 text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <Card 
                  className="aspect-square border-dashed border-2 border-white/20 glass-panel flex flex-col items-center justify-center text-white/20 hover:text-laser-accent hover:border-laser-accent transition-colors cursor-pointer group"
                  onClick={() => { setOriginalImage(null); setProcessedImage(null); setDesignPrompt(''); setShowLibrary(false); toast.info("Started new project"); }}
                >
                  <div className="bg-white/5 p-4 rounded-full group-hover:bg-laser-accent/10 transition-colors"><Plus className="w-8 h-8 text-white/20 group-hover:text-laser-accent" /></div>
                  <span className="text-xs font-bold uppercase tracking-widest mt-4">New Project</span>
                </Card>
                {isLoadingProjects && <div className="col-span-full flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-laser-accent" /></div>}
                {savedProjects.map(project => (
                  <Card key={project.id} className="group overflow-hidden glass-panel border-white/10 cursor-pointer hover:shadow-cyan-500/10 transition-all relative"
                    onClick={() => { loadProject(project); setShowLibrary(false); }}>
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-7 w-7 bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 rounded flex items-center justify-center p-1" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="glass-panel border-white/10 text-white min-w-40" align="end">
                          <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={e => { e.stopPropagation(); loadProject(project); setShowLibrary(false); }}><ChevronRight className="w-3.5 h-3.5" /> Open</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={e => handleRenameProject(project.id, e)}><Edit2 className="w-3.5 h-3.5" /> Rename</DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={e => handleDuplicateProject(project, e)}><Copy className="w-3.5 h-3.5" /> Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem className="gap-2 focus:bg-red-500/20 text-red-300 focus:text-red-200 cursor-pointer" onClick={e => handleDeleteProject(project.id, e)}><Trash2 className="w-3.5 h-3.5" /> Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="aspect-square relative flex items-center justify-center bg-black/20">
                      <img src={project.processedImage || project.originalImage || ''} alt={project.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                    </div>
                    <div className="p-3 border-t border-white/10">
                      <p className="text-xs font-bold uppercase tracking-tight truncate text-white">{project.name}</p>
                      <p className="text-[10px] text-white/40">Saved {new Date(project.updatedAt?.toMillis ? project.updatedAt.toMillis() : Date.now()).toLocaleDateString()}</p>
                    </div>
                  </Card>
                ))}
                {/* Templates */}
                <div className="col-span-full pt-4 pb-2 flex flex-col gap-2 border-t border-white/5 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40">Design Library — {PROJECT_TEMPLATES.length} templates</h3>
                    {user && <Button variant="ghost" size="sm" onClick={handleClaimAllTemplates} className="text-[10px] font-bold uppercase text-laser-accent hover:bg-laser-accent/10 h-7"><Plus className="w-3 h-3 mr-1" /> Add All</Button>}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {['all', ...Array.from(new Set(PROJECT_TEMPLATES.map(t => t.category.split(' / ')[0])))].map(cat => (
                      <button key={cat} onClick={() => setLibraryFilter(cat)}
                        className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-colors ${libraryFilter === cat ? 'border-laser-accent text-laser-accent bg-laser-accent/10' : 'border-white/10 text-white/40 hover:border-white/30'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {PROJECT_TEMPLATES
                  .filter(t => libraryFilter === 'all' || t.category.startsWith(libraryFilter))
                  .map(template => (
                  <Card key={template.id} className="group overflow-hidden glass-panel border-white/10 cursor-pointer hover:shadow-cyan-500/10 transition-all"
                    onClick={() => {
                      const prompt = template.suggestedPrompt || template.name;
                      setDesignPrompt(prompt);
                      setOriginalImage(template.image);
                      setShowLibrary(false);
                      toast.info(`Loading ${template.name}...`);

                      // Auto-trigger generation based on category/mode
                      const cat = template.category.toLowerCase();
                      const is3D = cat.includes('3d') || cat.includes('electronics') || cat.includes('architecture') || cat.includes('wearable') || cat.includes('vehicle') || cat.includes('science') || cat.includes('outdoor') || cat.includes('bleeding');
                      if (is3D || engineeringMode === 'prototype') {
                        setEngineeringMode('prototype');
                        setTimeout(() => handleGeneratePrototype(prompt), 100);
                      } else if (cat.includes('laser') || engineeringMode === 'laser') {
                        setEngineeringMode('laser');
                        setDesignPrompt(prompt);
                        setTimeout(() => handleGenerate(), 100);
                      }
                    }}>
                    <div className="aspect-[4/3] relative flex items-center justify-center bg-black/20 overflow-hidden">
                      <img src={template.image} alt={template.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                      {template.complexity && (
                        <Badge className={`absolute top-1.5 right-1.5 text-[7px] py-0 px-1.5 ${
                          template.complexity === 'beginner' ? 'bg-green-500/80 text-white' :
                          template.complexity === 'intermediate' ? 'bg-yellow-500/80 text-black' :
                          'bg-red-500/80 text-white'
                        }`}>{template.complexity}</Badge>
                      )}
                    </div>
                    <div className="p-2 border-t border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-tight text-white truncate">{template.name}</p>
                      <span className="text-[8px] text-white/40">{template.category}</span>
                      {template.description && <p className="text-[8px] text-white/30 mt-0.5 line-clamp-2">{template.description}</p>}
                      {template.tags && (
                        <div className="flex gap-0.5 mt-1 flex-wrap">
                          {template.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[7px] px-1 py-0 bg-white/5 rounded text-white/30">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR Viewer Modal */}
      <AnimatePresence>
        {showArViewer && arGlbUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowArViewer(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl aspect-square bg-black/60 rounded-2xl border border-white/10 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">AR / 3D Viewer</span>
              </div>
              <Button variant="ghost" size="icon" className="absolute top-3 right-3 z-10 h-8 w-8 text-white/60 hover:text-white"
                onClick={() => setShowArViewer(false)}>
                <X className="w-4 h-4" />
              </Button>
              {/* @google/model-viewer web component */}
              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: `
                <model-viewer
                  src="${arGlbUrl}"
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  camera-controls
                  touch-action="pan-y"
                  auto-rotate
                  shadow-intensity="1"
                  exposure="1"
                  style="width:100%;height:100%;background:transparent;"
                >
                  <button slot="ar-button" style="
                    position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
                    background:linear-gradient(135deg,#f97316,#ea580c);color:white;
                    border:none;border-radius:9999px;padding:10px 24px;font-size:12px;
                    font-weight:900;text-transform:uppercase;letter-spacing:2px;cursor:pointer;
                    box-shadow:0 4px 20px rgba(249,115,22,0.4);
                  ">
                    View in AR
                  </button>
                </model-viewer>
              ` }} />
              <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                <Button size="sm" className="h-7 text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/20"
                  onClick={handleExportGLB}>
                  <Download className="w-3 h-3 mr-1" /> Export GLB
                </Button>
                <a href={arGlbUrl} download={`${(protoProject?.name || 'model').replace(/[^a-zA-Z0-9]/g, '_')}.glb`}
                  className="inline-flex items-center h-7 px-3 text-[9px] font-bold uppercase bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/20 rounded-md">
                  <FileDown className="w-3 h-3 mr-1" /> Download GLB
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Component Registry Drawer */}
      <AnimatePresence>
        {showRegistry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setShowRegistry(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-lg glass-panel !rounded-none border-l border-white/10 overflow-auto"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl z-10">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-laser-accent" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Component Registry</h2>
                  <Badge className="bg-laser-accent/20 text-laser-accent text-[8px] px-1.5 py-0">{componentRegistry.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowRegistry(false)} className="h-8 w-8 text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-4 space-y-4">
                {/* Quick Add */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/50">Quick Add Component</label>
                  <div className="flex gap-2">
                    <Input placeholder="e.g. Nema 17 Stepper Motor" className="glass-input h-9 border-white/10 text-sm flex-1"
                      value={registryInput} onChange={e => setRegistryInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && registryInput.trim()) {
                          handleAddToRegistry(registryInput.trim(), 'General', '');
                          setRegistryInput('');
                        }
                      }} />
                    <Button className="accent-btn h-9 px-3" onClick={() => {
                      if (registryInput.trim()) { handleAddToRegistry(registryInput.trim(), 'General', ''); setRegistryInput(''); }
                    }}><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                {/* Add from current project BOM */}
                {protoProject && protoProject.parts.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/50">From Current Project</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {protoProject.parts.filter(p => !componentRegistry.some(c => c.name === p.name)).slice(0, 6).map(part => (
                        <button key={part.id}
                          onClick={() => handleAddToRegistry(part.name, part.category || 'Component', part.specs)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-laser-accent/30 transition-colors text-left">
                          <Plus className="w-3 h-3 text-laser-accent shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold text-white/80">{part.name}</p>
                            <p className="text-[8px] text-white/40">{part.specs}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registry Inventory */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/50">
                    Inventory ({componentRegistry.length} components)
                  </label>
                  {componentRegistry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-white/20">
                      <Archive className="w-8 h-8 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">No components registered</p>
                      <p className="text-[9px] mt-1 text-white/15">Add components to build your inventory</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {componentRegistry.map(comp => (
                        <div key={comp.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-white/80">{comp.name}</p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 text-[7px] px-1 py-0">{comp.category}</Badge>
                                {comp.specs && <span className="text-[8px] text-white/40 font-mono">{comp.specs}</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveFromRegistry(comp.id)}
                            className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary for AI context */}
                {componentRegistry.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/50">AI Context Summary</label>
                    <p className="text-[10px] text-white/40 bg-white/5 rounded p-2 border border-white/10 font-mono">
                      {getRegistrySummary()}
                    </p>
                    <p className="text-[8px] text-white/30 italic">This summary is automatically injected into AI prompts to save context and tokens.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maintenance Drawer */}
      <AnimatePresence>
        {showMaintenance && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setShowMaintenance(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-lg glass-panel !rounded-none border-l border-white/10 overflow-auto"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl z-10">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Maintenance</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowMaintenance(false)} className="h-8 w-8 text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-4"><MaintenanceDashboard selectedPrinter={selectedPrinter} selectedLaser={selectedLaser} onChangePrinter={setSelectedPrinter} onChangeLaser={setSelectedLaser} /></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docs Drawer */}
      <AnimatePresence>
        {showDocs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setShowDocs(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-2xl glass-panel !rounded-none border-l border-white/10 overflow-auto"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl z-10">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Documentation</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowDocs(false)} className="h-8 w-8 text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-4"><DocumentationViewer /></div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Concept Sketch Panel ── */}
        {showConceptPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={() => setShowConceptPanel(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-xl glass-panel !rounded-none border-l border-white/10 overflow-auto"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl z-10">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Concept Sketch</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowConceptPanel(false)} className="h-8 w-8 text-white/60 hover:text-white"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-4 space-y-4">
                {/* Sketch Mode Selector */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 block">Sketch Mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([['rough', 'Rough Ideation'], ['refined', 'Refined Concept'], ['technical', 'Technical Drawing'], ['presentation', 'Presentation Render']] as const).map(([mode, label]) => (
                      <button key={mode} onClick={() => setSketchMode(mode)}
                        className={`px-3 py-2 text-[9px] font-bold uppercase tracking-wider rounded border transition-all ${sketchMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate buttons */}
                <div className="flex gap-2">
                  <Button onClick={() => handleGenerateSketch()} disabled={isGeneratingSketch}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9 text-[10px] font-bold uppercase">
                    {isGeneratingSketch ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <PenTool className="w-3 h-3 mr-1.5" />}
                    Generate Sketch
                  </Button>
                  <Button onClick={() => handleGenerateSketch(undefined, true)} disabled={isGeneratingSketch}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white h-9 text-[10px] font-bold uppercase">
                    {isGeneratingSketch ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <LayoutGrid className="w-3 h-3 mr-1.5" />}
                    Concept Sheet
                  </Button>
                </div>

                {/* Sketch Output */}
                {conceptSketchImage && (
                  <div className="space-y-2">
                    <img src={conceptSketchImage} alt="Concept sketch" className="w-full rounded-lg border border-white/10" />
                    <div className="flex gap-2">
                      <a href={conceptSketchImage} download={`concept-${sketchMode}-${Date.now()}.png`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-[9px] font-bold uppercase text-white/60 hover:text-white transition-colors border border-white/10">
                        <Download className="w-3 h-3" /> Download
                      </a>
                      <Button variant="ghost" onClick={() => { setOriginalImage(conceptSketchImage); setShowConceptPanel(false); toast.success('Sketch loaded as reference image'); }}
                        className="flex-1 h-auto py-2 text-[9px] font-bold uppercase text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10">
                        <ImageIcon className="w-3 h-3 mr-1.5" /> Use as Reference
                      </Button>
                      <Button variant="ghost" onClick={() => { handleExtrudeFromImage(); setShowConceptPanel(false); }}
                        className="flex-1 h-auto py-2 text-[9px] font-bold uppercase text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10">
                        <Box className="w-3 h-3 mr-1.5" /> Extrude to 3D
                      </Button>
                    </div>
                  </div>
                )}

                {!conceptSketchImage && !isGeneratingSketch && (
                  <div className="flex flex-col items-center justify-center py-12 text-white/20">
                    <PenTool className="w-10 h-10 mb-3" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Enter a prompt and generate a concept sketch</p>
                    <p className="text-[9px] mt-1 text-white/15">Uses your current design prompt and style</p>
                  </div>
                )}

                {isGeneratingSketch && !conceptSketchImage && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Generating {sketchMode} sketch...</p>
                  </div>
                )}

                {/* Community Search */}
                <div className="border-t border-white/10 pt-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 block">Community Models</label>
                  <Button onClick={handleSearchCommunity} disabled={isSearchingCommunity}
                    className="w-full bg-white/10 hover:bg-white/20 text-white h-9 text-[10px] font-bold uppercase">
                    {isSearchingCommunity ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <Search className="w-3 h-3 mr-1.5" />}
                    Search Community Projects
                  </Button>
                  {communityResults && (
                    <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70 leading-relaxed max-h-[300px] overflow-auto prose prose-invert prose-sm"
                      dangerouslySetInnerHTML={{ __html: communityResults.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ TOOLBAR ═══════ */}
      <header className="h-auto min-h-10 shrink-0 px-3 border-b border-white/10 bg-black/40 backdrop-blur-xl flex flex-wrap items-center justify-between z-50 gap-y-1 py-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-laser-accent p-1 rounded shadow-[0_0_15px_rgba(0,242,255,0.4)]">
              <Layers className="text-black w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-[11px] font-black tracking-tighter leading-none text-white uppercase">SUBSTRATA</h1>
              <p className="text-[7px] font-bold tracking-[0.15em] text-laser-accent/70 uppercase leading-none">by GANTASMO</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-5 bg-white/10 mx-0.5 hidden sm:block" />

          {/* Mode switcher — always visible */}
          <div className="flex bg-white/5 rounded-md border border-white/5 p-0.5">
            <button onClick={() => setEngineeringMode('prototype')} title="Design 3D objects for 3D printing" className={`px-1.5 sm:px-2.5 py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-sm transition-all ${engineeringMode === 'prototype' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/70'}`}>3D</button>
            <button onClick={() => setEngineeringMode('laser')} title="Prepare images for laser engraving and cutting" className={`px-1.5 sm:px-2.5 py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-sm transition-all ${engineeringMode === 'laser' ? 'bg-laser-accent text-black' : 'text-white/40 hover:text-white/70'}`}>Laser</button>
            <button onClick={() => setEngineeringMode('label')} title="Design and print labels on a label printer" className={`px-1.5 sm:px-2.5 py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-sm transition-all ${engineeringMode === 'label' ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white/70'}`}>Labels</button>
          </div>

          {/* Design style — hidden on mobile */}
          <div className="hidden md:flex gap-0.5 ml-2">
            {(['minimalist', 'deconstructivist', 'classical', 'organic'] as const).map(s => (
              <button key={s} onClick={() => setDesignStyle(s)}
                title={STYLE_GUIDES[s].description}
                className={`px-2 py-1 text-[8px] font-black uppercase tracking-tight rounded transition-all border ${designStyle === s ? (engineeringMode === 'laser' ? 'bg-laser-accent text-black border-laser-accent' : 'bg-blue-600 text-white border-blue-600') : 'bg-transparent text-white/30 border-transparent hover:text-white/50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setShowLibrary(true)} title="Browse ready-made templates you can use as starting points" className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
              <Library className="w-3.5 h-3.5" /> Library
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowRegistry(true)} title="See all parts and components you have saved" className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
              <Database className="w-3.5 h-3.5" /> Registry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowMaintenance(true)} title="Check machine health, troubleshoot problems, and do upkeep" className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
              <Settings className="w-3.5 h-3.5" /> Maint.
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDocs(true)} title="View the full project documentation and export it" className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowConceptPanel(true)} title="Draw a quick sketch and turn it into a 3D design" className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
              <PenTool className="w-3.5 h-3.5" /> Sketch
            </Button>
          </div>

          {/* Mobile hamburger */}
          <div className="relative sm:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-7 w-7 text-white/50 hover:text-white" title="Open navigation menu">
              <Menu className="w-4 h-4" />
            </Button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-8 w-44 glass-panel border border-white/10 rounded-lg py-1 z-[100] shadow-2xl">
                {[
                  { label: 'Library', icon: Library, action: () => setShowLibrary(true) },
                  { label: 'Registry', icon: Database, action: () => setShowRegistry(true) },
                  { label: 'Maintenance', icon: Settings, action: () => setShowMaintenance(true) },
                  { label: 'Docs', icon: BookOpen, action: () => setShowDocs(true) },
                  { label: 'Sketch', icon: PenTool, action: () => setShowConceptPanel(true) },
                ].map(item => (
                  <button key={item.label} onClick={() => { item.action(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                    <item.icon className="w-3.5 h-3.5" /> {item.label}
                  </button>
                ))}
                {/* Mobile style selector */}
                <div className="border-t border-white/10 px-3 py-2 flex gap-1 flex-wrap">
                  {(['minimalist', 'deconstructivist', 'classical', 'organic'] as const).map(s => (
                    <button key={s} onClick={() => { setDesignStyle(s); setMobileMenuOpen(false); }}
                      className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded border ${designStyle === s ? 'bg-blue-600 text-white border-blue-600' : 'border-white/10 text-white/30'}`}>
                      {s.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-5 bg-white/10 mx-0.5 hidden sm:block" />
          <Button size="sm" className="accent-btn h-7 text-[9px] shadow-[0_0_12px_rgba(0,242,255,0.2)]" onClick={handleSaveProject} title="Save your project to the cloud">
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          {user ? (
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out of your account" className="rounded-full overflow-hidden border border-white/10 h-7 w-7 hover:bg-white/10">
              {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-3.5 h-3.5" />}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={loginWithGoogle} title="Sign in with Google to save your work" className="h-7 text-[9px] border border-white/10 text-white/60 hover:text-white gap-1">
              <UserIcon className="w-3 h-3" /> Sign In
            </Button>
          )}
        </div>
      </header>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── LEFT: Advisor Panel ─── */}
        <div className={`shrink-0 border-r border-white/10 bg-black/20 flex flex-col transition-all duration-300 ${advisorCollapsed ? 'w-0 overflow-hidden' : 'w-[300px]'}`}>
          <ConsultantInterface
            isMuted={isAdvisorMuted}
            onToggleMute={() => setIsAdvisorMuted(!isAdvisorMuted)}
            onSavePreset={handleSaveMaterialPreset}
            onBuildBlueprint={handleBuildBlueprint}
            protoProject={protoProject}
          />
        </div>
        {/* Advisor toggle (always visible) */}
        <button onClick={() => setAdvisorCollapsed(!advisorCollapsed)} title="Show or hide the AI chat assistant"
          className="shrink-0 w-5 flex items-center justify-center border-r border-white/5 bg-black/20 hover:bg-white/5 transition-colors text-white/30 hover:text-white/60">
          <PanelLeft className={`w-3 h-3 transition-transform ${advisorCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* ─── CENTER: Viewport + Output Tabs ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Main Viewport Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Laser Studio viewport */}
            <div className={`absolute inset-0 ${engineeringMode === 'laser' ? '' : 'hidden'}`}>
              <div className="h-full flex flex-col">
                {/* Laser viewport */}
                <div className="flex-1 relative flex items-center justify-center bg-black/20 group">
                  {processedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img src={processedImage} alt="Processed" className="max-w-full max-h-full shadow-2xl rounded-sm pixelated border border-white/20"
                        style={{ imageRendering: procOptions.dither ? 'pixelated' : 'auto' }} />
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" onClick={() => setIsAdvancedEditorOpen(true)} className="bg-laser-accent/90 text-black hover:bg-laser-accent font-bold h-7 text-[10px]" title="Open the full image editor with more tools">
                          <Edit2 className="w-3 h-3 mr-1" /> Studio
                        </Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20 text-laser-accent" onClick={handleExportRaster} title="Download the image as a PNG file"><FileImage className="w-3 h-3" /></Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20 text-laser-accent" onClick={handleExportVector} title="Download the image as an SVG vector file"><FileCode className="w-3 h-3" /></Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20" onClick={() => { setOriginalImage(null); setProcessedImage(null); }} title="Delete the current image"><Trash2 className="w-3 h-3 text-red-400" /></Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20" onClick={handleAnalyzeMaterial} disabled={isAnalyzing} title="Use AI to detect the material and suggest laser settings">
                          {isAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3 text-laser-accent" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="mx-auto w-14 h-14 bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center text-white/20">
                        <ImageIcon className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-white">Import your design</p>
                      <p className="text-xs text-white/40">JSON, SVG, PNG or JPEG up to 10MB</p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" className="relative group overflow-hidden border-white/20 glass-panel hover:bg-white/10 text-white text-xs h-8">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*" />
                          <Upload className="w-3 h-3 mr-1" /> Upload
                        </Button>
                        <Button onClick={() => setEngineeringMode('laser')} className="accent-btn gap-1 text-xs h-8">
                          <Sparkles className="w-3 h-3" /> AI Generate
                        </Button>
                      </div>
                    </div>
                  )}
                  {(isProcessing || isAnalyzing) && (
                    <div className="absolute inset-0 glass-panel bg-black/40 backdrop-blur-md flex items-center justify-center z-10 rounded-sm">
                      <RefreshCw className="w-8 h-8 animate-spin text-laser-accent" />
                    </div>
                  )}
                </div>
                {/* Laser prompt bar */}
                <div className="p-3 border-t border-white/10 bg-black/30">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input placeholder={`e.g. A ${designStyle} wolf head stencil...`} className="glass-input h-10 pr-20 text-sm border-white/10"
                        value={designPrompt} onChange={e => setDesignPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
                      <div className="absolute right-1 top-1 flex gap-1">
                        <Button size="icon" variant="ghost" className={`h-8 w-8 transition-colors ${isTranscribing ? 'text-red-400 bg-red-500/10' : 'text-white/40'}`}
                          onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                          title="Hold to speak your design idea out loud">
                          {isTranscribing ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" className="h-8 w-8 accent-btn" onClick={handleGenerate} disabled={isGenerating || !designPrompt} title="Generate a laser design from your description">
                          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <p className="text-[9px] text-white/30 mt-0.5 pr-1">Presets:</p>
                    {['Tribal Mask', 'Sacred Geometry', 'Minimalist Cat', 'Floral Frame'].map(p => (
                      <button key={p} onClick={() => setDesignPrompt(p)} title={`Fill in the prompt with "${p}" so you can generate it quickly`} className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 glass-panel border-white/10 text-white/60 hover:border-laser-accent hover:text-laser-accent transition-colors">{p}</button>
                    ))}
                  </div>
                  {/* Reference Image */}
                  <div className="flex items-center gap-2 mt-2">
                    <input ref={referenceInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const r = new FileReader(); r.onload = ev => setReferenceImage(ev.target?.result as string); r.readAsDataURL(file); }
                    }} />
                    <button onClick={() => referenceInputRef.current?.click()} title="Upload a picture for the AI to use as a design reference"
                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 glass-panel border-white/10 text-white/40 hover:text-laser-accent hover:border-laser-accent transition-colors flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {referenceImage ? 'Change Ref' : 'Add Reference'}
                    </button>
                    {referenceImage && (
                      <>
                        <img src={referenceImage} alt="ref" className="w-7 h-7 rounded border border-white/20 object-cover" />
                        <button onClick={() => setReferenceImage(null)} className="text-[8px] text-white/30 hover:text-red-400 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Prototype viewport (always mounted, hidden when not active) */}
            <div className={`absolute inset-0 ${engineeringMode === 'prototype' ? '' : 'hidden'}`}>
              <div className="h-full bg-slate-950">
                <Canvas shadows={{ type: THREE.PCFShadowMap }}>
                  <PerspectiveCamera makeDefault position={[5, 5, 5]} />
                  <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
                  <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.5}>
                      <PrototypePreview openscadCode={protoProject?.openscadCode || ''} parts={protoProject?.parts || []} selectedPartLabel={selectedPartLabel} onPartClick={(label) => setSelectedPartLabel(label)} />
                    </Stage>
                    <Environment preset="city" />
                  </Suspense>
                  <Grid infiniteGrid fadeDistance={30} fadeStrength={5} sectionSize={1.5} sectionColor="#3b82f6" sectionThickness={1.5} cellColor="#1e293b" />
                </Canvas>

                {/* 3D overlay controls */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <Card className="bg-black/80 backdrop-blur-md border border-white/10 p-1.5 flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white" title="Toggle scene layers"><Layers className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white" title="Open viewport settings"><Settings2 className="w-3.5 h-3.5" /></Button>
                    <Separator orientation="vertical" className="h-7 bg-white/10" />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300" title="Show printer build volume"><Printer className="w-3.5 h-3.5" /></Button>
                    <Separator orientation="vertical" className="h-7 bg-white/10" />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white" title="Load a reference image to design from"
                      onClick={() => referenceInputRef.current?.click()}>
                      <ImageIcon className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white" title="Open the sketch pad to draw an idea"
                      onClick={() => setShowConceptPanel(true)}>
                      <PenTool className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white" title="Turn a flat image into a 3D shape"
                      onClick={handleExtrudeFromImage} disabled={!originalImage && !conceptSketchImage && !referenceImage}>
                      <Box className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300" title="Download 3D model as STL file for printing"
                      onClick={handleExportSTL} disabled={!protoProject}>
                      <FileDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-400 hover:text-purple-300" title="Download 3D model as GLB file"
                      onClick={handleExportGLB} disabled={!protoProject}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-400 hover:text-orange-300" title="View this 3D model in augmented reality on your phone"
                      onClick={handleViewInAR} disabled={!protoProject}>
                      <Smartphone className="w-3.5 h-3.5" />
                    </Button>
                    {referenceImage && (
                      <div className="flex items-center gap-1">
                        <img src={referenceImage} alt="ref" className="w-6 h-6 rounded border border-white/20 object-cover" />
                        <button onClick={() => setReferenceImage(null)} className="text-white/30 hover:text-red-400"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                  </Card>
                </div>

                {!protoProject && !isProtoGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="max-w-sm text-center p-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl">
                      <Box className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <h3 className="text-white/40 font-bold uppercase tracking-widest text-sm">Awaiting Generator</h3>
                      <p className="text-white/20 text-xs mt-1">Describe your vision in the advisor panel</p>
                    </div>
                  </div>
                )}

                {/* Generation progress overlay */}
                {isProtoGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="max-w-sm text-center p-6 bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-2xl space-y-3">
                      <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                      <p className="text-sm font-bold text-white uppercase tracking-widest">Synthesizing Blueprint</p>
                      <p className="text-xs text-blue-300 font-mono">{generationStage}</p>
                      <Progress value={protoGenerationProgress} className="h-1.5 bg-white/5" />
                      <p className="text-[10px] text-white/40 font-mono">{protoGenerationProgress}%</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Label/Sticker Designer viewport */}
          <div className={`absolute inset-0 ${engineeringMode === 'label' ? '' : 'hidden'}`}>
            <div className="h-full flex flex-col">
              {/* Label canvas area */}
              <div className="flex-1 relative flex items-center justify-center bg-black/20 group">
                {labelDesignImage ? (
                  <div className="relative flex flex-col items-center gap-3 p-4">
                    {/* Label preview with print dimensions */}
                    <div className="relative bg-white rounded-lg shadow-2xl border-2 border-white/20 overflow-hidden"
                      style={{
                        width: `${Math.min(labelSettings.labelWidth * 2.5, 400)}px`,
                        height: `${Math.min(labelSettings.labelHeight * 2.5, 500)}px`,
                      }}>
                      <img src={labelDesignImage} alt="Label" className="w-full h-full object-contain p-2" />
                      {labelText && (
                        <div className="absolute bottom-2 left-0 right-0 text-center">
                          <span className="text-black font-bold" style={{ fontSize: `${labelTextSize}px` }}>{labelText}</span>
                        </div>
                      )}
                      {labelSettings.showCutLine && labelSilhouetteSvg && (
                        <div className="absolute inset-0 pointer-events-none" dangerouslySetInnerHTML={{ __html: sanitizeSvg(labelSilhouetteSvg) }} />
                      )}
                    </div>
                    <div className="flex gap-1.5 text-[9px] text-white/40 font-mono">
                      <span>{labelSettings.labelWidth}×{labelSettings.labelHeight}mm</span>
                      <span>•</span>
                      <span>{labelSettings.dpi} DPI</span>
                      <span>•</span>
                      <span>{Math.round((labelSettings.labelWidth / 25.4) * labelSettings.dpi)}×{Math.round((labelSettings.labelHeight / 25.4) * labelSettings.dpi)}px</span>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" onClick={handleExportLabel} className="bg-orange-500/90 text-white hover:bg-orange-500 font-bold h-7 text-[10px]">
                        <Printer className="w-3 h-3 mr-1" /> Export Print
                      </Button>
                      <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20 text-orange-400" onClick={handleGenerateSilhouette} title="Generate Cut Line">
                        <Scissors className="w-3 h-3" />
                      </Button>
                      {labelSilhouetteSvg && (
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20 text-red-400" onClick={handleExportSilhouetteSvg} title="Export Cut SVG">
                          <FileCode className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20" onClick={() => { setLabelDesignImage(null); setLabelSilhouetteSvg(null); }}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="mx-auto w-14 h-14 bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center text-white/20">
                      <Tag className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-medium text-white">Design your label</p>
                    <p className="text-xs text-white/40">Upload an image or generate with AI</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" className="relative group overflow-hidden border-white/20 glass-panel hover:bg-white/10 text-white text-xs h-8">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLabelImageUpload} accept="image/*" />
                        <Upload className="w-3 h-3 mr-1" /> Upload
                      </Button>
                      <Button onClick={() => {}} className="bg-orange-500 hover:bg-orange-600 text-white gap-1 text-xs h-8">
                        <Sparkles className="w-3 h-3" /> AI Generate
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {/* Label prompt bar */}
              <div className="p-3 border-t border-white/10 bg-black/30">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input placeholder="e.g. QR code label for my hexapod robot..." className="glass-input h-10 pr-12 text-sm border-white/10"
                      value={labelPrompt} onChange={e => setLabelPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerateLabelDesign()} />
                    <div className="absolute right-1 top-1">
                      <Button size="icon" className="h-8 w-8 bg-orange-500 hover:bg-orange-600" onClick={handleGenerateLabelDesign} disabled={isGeneratingLabel || !labelPrompt}>
                        {isGeneratingLabel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <p className="text-[9px] text-white/30 mt-0.5 pr-1">Templates:</p>
                  {['Product QR', 'Serial Number', 'Warning Decal', 'Logo Sticker', 'Address Label', 'Parts Tag'].map(p => (
                    <button key={p} onClick={() => setLabelPrompt(p)} title={`Fill in the prompt with "${p}" so you can generate it quickly`} className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 glass-panel border-white/10 text-white/60 hover:border-orange-500 hover:text-orange-400 transition-colors">{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* ─── BOTTOM: Output Tabs (progressive reveal) ─── */}
          <div className="shrink-0 border-t border-white/10 bg-black/30">
            {/* Tab bar */}
            <div className="h-9 px-3 flex items-center gap-1 border-b border-white/5 overflow-x-auto">
              {[
                { id: '3d', label: '3D Workspace', icon: Box, ready: true, tip: 'View and rotate the 3D model' },
                { id: 'bom', label: 'Bill of Materials', icon: ListTodo, ready: !!protoProject, tip: 'List of all parts needed and where to buy them' },
                { id: 'fabrication', label: 'Design Files', icon: FileCode, ready: !!protoProject, tip: 'SVG files, wiring diagrams, and technical drawings' },
                { id: 'code', label: 'Control Code', icon: Terminal, ready: !!protoProject, tip: 'Machine-readable code for 3D printing or laser cutting' },
                { id: 'assembly', label: 'Assembly', icon: ClipboardList, ready: !!(protoProject && protoProject.assemblySteps.length > 0), tip: 'Step-by-step instructions for putting it together' },
              ].map(tab => (
                <button key={tab.id} onClick={() => tab.ready && setActiveOutputTab(tab.id)} title={tab.tip}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-t transition-all whitespace-nowrap
                    ${activeOutputTab === tab.id ? 'bg-white/10 text-blue-400 border-b-2 border-blue-400' : tab.ready ? 'text-white/40 hover:text-white/60 hover:bg-white/5' : 'text-white/15 cursor-not-allowed'}`}>
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                  {isProtoGenerating && !tab.ready && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-1" />}
                </button>
              ))}
              <div className="flex-1" />
              {protoProject && (
                <Button size="sm" className="h-6 text-[9px] bg-blue-600 hover:bg-blue-500 text-white" onClick={handleExportAll} title="Download everything as one organized document">
                  <FileDown className="w-3 h-3 mr-1" /> Export All
                </Button>
              )}
            </div>
            {/* Tab content (compact bottom panel) */}
            <div className={`overflow-auto transition-all ${activeOutputTab === '3d' ? 'h-0' : 'h-56'}`}>
              {activeOutputTab === 'bom' && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white/60">Sourcing — {sortedParts.length} parts</p>
                    <div className="flex gap-1">
                      {shoppingList.size > 0 && (
                        <Badge className="bg-green-500/20 text-green-400 text-[8px] px-1.5 py-0 mr-1">
                          {shoppingList.size} in list — ${sortedParts.filter(p => shoppingList.has(p.id)).reduce((s, p) => s + p.price, 0).toFixed(2)}
                        </Badge>
                      )}
                      <Button size="sm" variant={bomSortMode === 'fastest' ? 'default' : 'outline'} className={`h-5 text-[8px] ${bomSortMode === 'fastest' ? 'bg-blue-600' : 'bg-white/5 border-white/10 text-white/60'}`}
                        onClick={() => setBomSortMode(bomSortMode === 'fastest' ? 'none' : 'fastest')} title="Sort parts by fastest delivery time">FASTEST</Button>
                      <Button size="sm" variant={bomSortMode === 'cheapest' ? 'default' : 'outline'} className={`h-5 text-[8px] ${bomSortMode === 'cheapest' ? 'bg-blue-600' : 'bg-white/5 border-white/10 text-white/60'}`}
                        onClick={() => setBomSortMode(bomSortMode === 'cheapest' ? 'none' : 'cheapest')} title="Sort parts by lowest price first">CHEAPEST</Button>
                      {shoppingList.size > 0 && (
                        <Button size="sm" variant="outline" className="h-5 text-[8px] bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                          title="Copy your shopping list to the clipboard so you can paste it somewhere"
                          onClick={() => {
                            const items = sortedParts.filter(p => shoppingList.has(p.id));
                            const text = `SUBSTRATA Shopping List\n${'='.repeat(40)}\n${items.map(p => `[ ] ${p.name} — $${p.price.toFixed(2)} (${p.source})\n    ${p.specs}\n    ${p.url || 'No link'}`).join('\n\n')}\n\nTotal: $${items.reduce((s, p) => s + p.price, 0).toFixed(2)}`;
                            navigator.clipboard.writeText(text);
                            toast.success(`Copied ${items.length} items to clipboard`);
                          }}>
                          <ClipboardList className="w-3 h-3 mr-1" /> COPY LIST
                        </Button>
                      )}
                    </div>
                  </div>
                  {sortedParts.map(part => {
                    const inList = shoppingList.has(part.id);
                    return (
                      <div key={part.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${inList ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShoppingList(prev => {
                              const next = new Set(prev);
                              if (next.has(part.id)) next.delete(part.id); else next.add(part.id);
                              return next;
                            })}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${inList ? 'border-green-400 bg-green-500/30 text-green-300' : 'border-white/20 hover:border-blue-400'}`}
                          >
                            {inList && <Check className="w-3 h-3" />}
                          </button>
                          <Package className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            {part.url ? (
                              <a href={part.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-bold text-blue-300 hover:text-blue-200 underline underline-offset-2 decoration-blue-400/30 hover:decoration-blue-400 transition-colors flex items-center gap-1">
                                {part.name} <ExternalLink className="w-3 h-3 opacity-50" />
                              </a>
                            ) : (
                              <p className="text-xs font-bold text-white">{part.name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 text-[8px] px-1 py-0">{part.source}</Badge>
                              <span className="text-[9px] text-white/40 font-mono">{part.specs}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-xs font-mono text-white">${part.price.toFixed(2)}</p>
                            <p className="text-[9px] text-green-400 font-bold">{part.speed}</p>
                          </div>
                          {part.url && (
                            <a href={part.url} target="_blank" rel="noopener noreferrer"
                              className="text-white/20 hover:text-blue-400 transition-colors" title="Open vendor page">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {sortedParts.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <Button size="sm" variant="outline" className="h-6 text-[8px] bg-white/5 border-white/10 text-white/40"
                        onClick={() => setShoppingList(prev => {
                          const allIds = sortedParts.map(p => p.id);
                          const allSelected = allIds.every(id => prev.has(id));
                          return allSelected ? new Set<string>() : new Set(allIds);
                        })}>{sortedParts.every(p => shoppingList.has(p.id)) ? 'Deselect All' : 'Select All'}</Button>
                      <p className="text-xs font-mono text-white/60">Total: <span className="text-white font-bold">${sortedParts.reduce((s, p) => s + p.price, 0).toFixed(2)}</span></p>
                    </div>
                  )}
                  {!protoProject && <p className="text-center py-8 text-white/20 text-xs font-mono tracking-widest">NO PARTS GENERATED YET</p>}
                </div>
              )}

              {activeOutputTab === 'fabrication' && (
                <div className="h-full flex flex-col">
                  <div className="px-3 py-1.5 flex gap-1.5 border-b border-white/5">
                    <Button size="sm" variant={activeDesignFileTab === 'openscad' ? 'default' : 'ghost'} className={`h-6 text-[8px] uppercase tracking-widest font-bold ${activeDesignFileTab === 'openscad' ? 'bg-blue-600 text-white' : 'text-white/40'}`}
                      onClick={() => setActiveDesignFileTab('openscad')}><Box className="w-3 h-3 mr-1" /> OpenSCAD</Button>
                    <Button size="sm" variant={activeDesignFileTab === 'svg' ? 'default' : 'ghost'} className={`h-6 text-[8px] uppercase tracking-widest font-bold ${activeDesignFileTab === 'svg' ? 'bg-green-600 text-white' : 'text-white/40'}`}
                      onClick={() => setActiveDesignFileTab('svg')}><Scissors className="w-3 h-3 mr-1" /> SVG</Button>
                    <Button size="sm" variant={activeDesignFileTab === 'wiring' ? 'default' : 'ghost'} className={`h-6 text-[8px] uppercase tracking-widest font-bold ${activeDesignFileTab === 'wiring' ? 'bg-yellow-600 text-white' : 'text-white/40'}`}
                      onClick={() => setActiveDesignFileTab('wiring')}><Cable className="w-3 h-3 mr-1" /> Wiring</Button>
                    <Separator orientation="vertical" className="h-5 bg-white/10" />
                    <Button size="sm" variant={designFileViewMode === 'preview' ? 'default' : 'ghost'}
                      className={`h-6 text-[8px] uppercase tracking-widest font-bold ${designFileViewMode === 'preview' ? 'bg-white/15 text-white' : 'text-white/30'}`}
                      onClick={() => setDesignFileViewMode('preview')}><ImageIcon className="w-3 h-3 mr-1" /> Preview</Button>
                    <Button size="sm" variant={designFileViewMode === 'code' ? 'default' : 'ghost'}
                      className={`h-6 text-[8px] uppercase tracking-widest font-bold ${designFileViewMode === 'code' ? 'bg-white/15 text-white' : 'text-white/30'}`}
                      onClick={() => setDesignFileViewMode('code')}><FileCode className="w-3 h-3 mr-1" /> Code</Button>
                    <div className="flex-1" />
                    {protoProject && <Button size="sm" variant="outline" className="h-6 text-[8px] bg-white/5 border-white/10 text-white/60"
                      onClick={() => {
                        const c = activeDesignFileTab === 'openscad' ? protoProject.openscadCode : activeDesignFileTab === 'svg' ? protoProject.svgDesign : protoProject.wiringDiagram;
                        navigator.clipboard.writeText(c); toast.success('Copied!');
                      }}><Copy className="w-3 h-3 mr-1" /> Copy</Button>}
                  </div>

                  {designFileViewMode === 'code' ? (
                    <div className="flex-1 overflow-auto">
                      {activeDesignFileTab === 'openscad' && (() => {
                        const code = protoProject?.openscadCode || '// Generate a blueprint to see OpenSCAD code';
                        // Split code into module blocks for click-to-select
                        const moduleRegex = /module\s+(\w+)\s*\([^)]*\)\s*\{/g;
                        const segments: { text: string; label: string | null }[] = [];
                        let lastIdx = 0;
                        let match;
                        while ((match = moduleRegex.exec(code)) !== null) {
                          if (match.index > lastIdx) {
                            segments.push({ text: code.slice(lastIdx, match.index), label: null });
                          }
                          let depth = 1, pos = match.index + match[0].length;
                          while (pos < code.length && depth > 0) {
                            if (code[pos] === '{') depth++;
                            else if (code[pos] === '}') depth--;
                            pos++;
                          }
                          segments.push({ text: code.slice(match.index, pos), label: match[1] });
                          lastIdx = pos;
                        }
                        if (lastIdx < code.length) segments.push({ text: code.slice(lastIdx), label: null });

                        return (
                          <pre className="p-3 text-xs font-mono whitespace-pre-wrap" style={{ color: '#93c5fd' }}>
                            {segments.map((seg, idx) => seg.label ? (
                              <span key={idx}
                                className={`cursor-pointer rounded transition-colors ${selectedPartLabel === seg.label ? 'bg-blue-500/30 ring-1 ring-blue-400/50' : 'hover:bg-white/5'}`}
                                onClick={() => { setSelectedPartLabel(selectedPartLabel === seg.label ? null : seg.label); setEngineeringMode('prototype'); }}
                              >{seg.text}</span>
                            ) : <span key={idx}>{seg.text}</span>)}
                          </pre>
                        );
                      })()}
                      {activeDesignFileTab === 'svg' && (
                        <pre className="p-3 text-xs font-mono overflow-auto whitespace-pre-wrap" style={{ color: '#86efac' }}>
                          {protoProject?.svgDesign || '<!-- Generate a blueprint to see SVG paths -->'}
                        </pre>
                      )}
                      {activeDesignFileTab === 'wiring' && (
                        <pre className="p-3 text-xs font-mono overflow-auto whitespace-pre-wrap" style={{ color: '#fde68a' }}>
                          {protoProject?.wiringDiagram || '# Generate a blueprint to see wiring diagram'}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto p-3">
                      {activeDesignFileTab === 'svg' && (
                        protoProject?.svgDesign ? (
                          <div className="space-y-4">
                            <p className="text-[9px] text-red-400/60 uppercase tracking-widest font-bold">Laser-Cut SVG Parts</p>
                            {(() => {
                              // Split on <!--PART_BREAK--> to get individual part SVGs
                              const parts = protoProject.svgDesign.split(/<!--\s*PART_BREAK\s*-->/).map(s => s.trim()).filter(Boolean);
                              if (parts.length === 0) return (
                                <div className="bg-white rounded-lg p-4 shadow-lg max-w-full overflow-auto"
                                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(protoProject.svgDesign) }} />
                              );

                              return (
                                <div className="grid grid-cols-1 gap-4">
                                  {parts.map((partSvg, idx) => {
                                    // Extract title from <title> element
                                    const titleMatch = partSvg.match(/<title>([^<]+)<\/title>/);
                                    const partName = titleMatch ? titleMatch[1] : `Part ${idx + 1}`;
                                    return (
                                      <div key={idx} className="glass-panel border border-white/10 rounded-lg overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/5">
                                          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{partName}</span>
                                          <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" className="h-6 text-[9px] text-white/40 hover:text-white"
                                              onClick={() => { navigator.clipboard.writeText(partSvg); toast.success(`Copied ${partName} SVG`); }}>
                                              <Copy className="w-3 h-3 mr-1" /> Copy
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 text-[9px] text-red-400/60 hover:text-red-300"
                                              onClick={() => {
                                                const blob = new Blob([partSvg], { type: 'image/svg+xml' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${partName.replace(/[^a-zA-Z0-9]/g, '_')}.svg`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                                toast.success(`Downloaded ${partName}.svg`);
                                              }}>
                                              <FileDown className="w-3 h-3 mr-1" /> Download
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-b-lg p-4 flex items-center justify-center overflow-auto"
                                          dangerouslySetInnerHTML={{ __html: sanitizeSvg(partSvg) }} />
                                      </div>
                                    );
                                  })}
                                  {/* Download All Parts as single file */}
                                  <Button size="sm" variant="ghost" className="h-7 text-[9px] text-red-400/60 hover:text-red-300 self-start"
                                    onClick={() => {
                                      const blob = new Blob([protoProject.svgDesign], { type: 'image/svg+xml' });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${(protoProject.name || 'parts').replace(/[^a-zA-Z0-9]/g, '_')}_all_parts.svg`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                      toast.success('All SVG parts exported');
                                    }}>
                                    <FileDown className="w-3 h-3 mr-1" /> Download All SVGs
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-center py-8 text-white/20 text-xs font-mono tracking-widest">GENERATE A BLUEPRINT TO SEE SVG DESIGNS</p>
                        )
                      )}
                      {activeDesignFileTab === 'openscad' && (
                        protoProject?.openscadCode ? (
                          <div className="space-y-3">
                            <p className="text-[9px] text-white/40 uppercase tracking-widest">3D part modules parsed from OpenSCAD — view the full 3D model in the 3D Workspace tab</p>
                            <div className="grid grid-cols-2 gap-2">
                              {(() => {
                                const mods = protoProject.openscadCode.match(/module\s+(\w+)/g) || [];
                                if (mods.length === 0) return <p className="text-[9px] text-white/30 col-span-2">No discrete modules found — switch to Code view to inspect raw output</p>;
                                return mods.map((m, i) => {
                                  const name = m.replace('module ', '');
                                  return (
                                    <div key={i} className="glass-panel border border-white/10 p-2 flex items-center gap-2">
                                      <div className="w-6 h-6 rounded" style={{ backgroundColor: PART_COLORS[i % PART_COLORS.length], opacity: 0.8 }} />
                                      <div>
                                        <p className="text-[10px] font-bold text-white/80">{name.replace(/_/g, ' ')}</p>
                                        <p className="text-[8px] text-white/30 font-mono">module {name}()</p>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            {/* Parametric Variant Generator */}
                            <div className="mt-4 pt-3 border-t border-white/10">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2 block">Parametric Variant</label>
                              <div className="flex gap-2">
                                <input value={variantPrompt} onChange={e => setVariantPrompt(e.target.value)}
                                  placeholder="e.g. make it 50% larger, add mounting holes, thinner walls..."
                                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                                  onKeyDown={e => e.key === 'Enter' && handleGenerateVariant()} />
                                <Button onClick={handleGenerateVariant} disabled={isGeneratingVariant}
                                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-[9px] font-bold uppercase px-3">
                                  {isGeneratingVariant ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Variant'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center py-8 text-white/20 text-xs font-mono tracking-widest">GENERATE A BLUEPRINT TO SEE 3D PARTS</p>
                        )
                      )}
                      {activeDesignFileTab === 'wiring' && (
                        protoProject?.wiringDiagram ? (
                          <div className="space-y-3">
                            <p className="text-[9px] text-yellow-400/60 uppercase tracking-widest font-bold mb-2">Wiring Diagram</p>
                            {/* Render Mermaid diagram if present */}
                            {(() => {
                              const raw = protoProject.wiringDiagram;
                              // Split on ---TEXT--- to get mermaid part and text part
                              const textMarker = raw.indexOf('---TEXT---');
                              const mermaidPart = textMarker >= 0 ? raw.substring(0, textMarker).trim() : '';
                              const textPart = textMarker >= 0 ? raw.substring(textMarker + 9).trim() : raw;
                              // Check if there's a mermaid graph definition
                              const hasMermaid = /^\s*(graph|flowchart|sequenceDiagram|classDiagram)\s/m.test(mermaidPart || raw);
                              const mermaidCode = hasMermaid ? (mermaidPart || raw.split('---TEXT---')[0]).trim() : '';
                              const textLines = (textPart || (!hasMermaid ? raw : '')).split('\n').filter(l => l.trim());

                              return (
                                <>
                                  {mermaidCode && (
                                    <div className="bg-black/40 rounded-lg border border-yellow-500/20 p-4 overflow-auto">
                                      <WiringMermaid code={mermaidCode} />
                                    </div>
                                  )}
                                  {textLines.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      <p className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Pin-by-Pin Connections</p>
                                      {textLines.map((line, i) => {
                                        const isHeader = line.startsWith('#') || line.startsWith('==') || (line.toUpperCase() === line.trim() && line.length > 3);
                                        const isConnection = line.includes('→') || line.includes('->') || line.includes('-->');
                                        return (
                                          <div key={i} className={`text-xs font-mono px-2 py-0.5 rounded ${isHeader ? 'text-yellow-300 font-bold text-[10px] mt-2 border-b border-yellow-500/20 pb-1' : isConnection ? 'text-green-300 bg-green-900/20 border-l-2 border-green-500/40 pl-3' : 'text-white/50'}`}>
                                            {line}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {/* Download wiring as SVG */}
                                  {mermaidCode && (
                                    <Button size="sm" variant="ghost" className="h-7 text-[9px] text-yellow-400/60 hover:text-yellow-300 mt-2"
                                      onClick={() => {
                                        const svgEl = document.querySelector('.wiring-mermaid-container svg');
                                        if (svgEl) {
                                          const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url; a.download = 'wiring_diagram.svg'; a.click();
                                          URL.revokeObjectURL(url);
                                          toast.success('Wiring diagram SVG exported');
                                        }
                                      }}>
                                      <FileDown className="w-3 h-3 mr-1" /> Export Wiring SVG
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-center py-8 text-white/20 text-xs font-mono tracking-widest">GENERATE A BLUEPRINT TO SEE WIRING</p>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeOutputTab === 'code' && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
                    <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-blue-400" /><span className="text-[10px] text-white/60 font-mono">main_control.py</span></div>
                    <Button size="sm" variant="ghost" className="h-6 text-[9px] text-white/40 hover:text-white"
                      onClick={() => { if (protoProject?.code) { navigator.clipboard.writeText(protoProject.code); toast.success('Copied!'); } }}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
                  </div>
                  <pre className="flex-1 p-3 text-blue-300 font-mono text-xs overflow-auto">{protoProject?.code || "# Awaiting project generation..."}</pre>
                </div>
              )}

              {activeOutputTab === 'assembly' && protoProject && (
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 mb-2"><ClipboardList className="w-3.5 h-3.5 text-purple-400" /><span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Assembly Steps</span></div>
                  {protoProject.assemblySteps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <span className="text-purple-400 font-mono font-bold w-5 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                      <span className="text-white/70">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Props panel toggle */}
        <button onClick={() => setPropsCollapsed(!propsCollapsed)} title="Show or hide the settings panel on the right"
          className="shrink-0 w-5 flex items-center justify-center border-l border-white/5 bg-black/20 hover:bg-white/5 transition-colors text-white/30 hover:text-white/60">
          <PanelRight className={`w-3 h-3 transition-transform ${propsCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* ─── RIGHT: Properties Panel ─── */}
        <div className={`shrink-0 border-l border-white/10 bg-black/20 overflow-y-auto transition-all duration-300 ${propsCollapsed ? 'w-0 overflow-hidden' : 'w-[260px]'}`}>
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {engineeringMode === 'laser' ? (
                <>
                  {/* Laser Parameters */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Settings className="w-3 h-3" /> Laser Parameters</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Smart Presets</Label>
                        <Select onValueChange={applySmartSettings}>
                          <SelectTrigger className="glass-input border-white/10 bg-black/20 h-8 text-[10px]"><SelectValue placeholder="Select Material" /></SelectTrigger>
                          <SelectContent className="glass-panel border-white/20">
                            {Object.keys(materialPresets).map(mat => <SelectItem key={mat} value={mat} className="text-xs text-white hover:bg-white/10">{mat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {[
                        { label: 'Power', key: 'power', max: 100, step: 1, suffix: '%' },
                        { label: 'Speed', key: 'speed', max: 5000, step: 10, suffix: ' mm/min' },
                        { label: 'Passes', key: 'passes', max: 10, step: 1, suffix: '' },
                      ].map(s => (
                        <div key={s.key} className="space-y-0.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <Label className="text-white/60">{s.label}</Label>
                            <span className="bg-laser-accent/10 text-laser-accent px-1 py-0.5 rounded text-[9px] font-bold border border-laser-accent/20">{(laserSettings as any)[s.key]}{s.suffix}</span>
                          </div>
                          <Slider value={[(laserSettings as any)[s.key]]} onValueChange={(val: any) => { const v = Array.isArray(val) ? val[0] : val; setLaserSettings(prev => ({...prev, [s.key]: Number(v) || 0})); }} max={s.max} step={s.step} className="py-1 cyan-slider" />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Canvas Editing */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Scissors className="w-3 h-3" /> Canvas Editing</h3>
                    <div className="p-2 glass-panel border-white/10 flex justify-around">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/10 text-white/60 hover:text-laser-accent" onClick={() => setProcOptions(p => ({...p, rotate: (p.rotate + 90) % 360}))} title="Spin the image 90 degrees"><RotateCw className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className={`h-7 w-7 hover:bg-white/10 ${procOptions.flipH ? 'bg-laser-accent/20 text-laser-accent' : 'text-white/60'}`} onClick={() => setProcOptions(p => ({...p, flipH: !p.flipH}))} title="Mirror the image left to right"><FlipHorizontal className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className={`h-7 w-7 hover:bg-white/10 ${procOptions.flipV ? 'bg-laser-accent/20 text-laser-accent' : 'text-white/60'}`} onClick={() => setProcOptions(p => ({...p, flipV: !p.flipV}))} title="Mirror the image top to bottom"><FlipVertical className="w-3.5 h-3.5" /></Button>
                    </div>
                  </section>

                  {/* Image Filters */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Image Filters</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { name: 'Draft', tip: 'Quick low-detail engrave for testing', opts: { brightness: 0, contrast: 0.2, threshold: 128, dither: false, edgeDetection: false } },
                          { name: 'Fine', tip: 'Detailed engrave with smooth shading', opts: { brightness: -0.1, contrast: 0.3, threshold: 120, dither: true, edgeDetection: false } },
                          { name: 'Contrast', tip: 'High contrast black and white engrave', opts: { brightness: 0, contrast: 0.8, threshold: 128, dither: true, edgeDetection: false } },
                          { name: 'Stencil', tip: 'Outline only for cutting shapes', opts: { brightness: 0, contrast: 0.5, threshold: 150, dither: false, edgeDetection: true } },
                        ].map(style => (
                          <Button key={style.name} variant="outline" className="h-6 text-[8px] font-bold uppercase border-white/5 bg-black/20 hover:border-laser-accent/50"
                            onClick={() => setProcOptions(p => ({...p, ...style.opts}))} title={style.tip}>{style.name}</Button>
                        ))}
                      </div>
                      {/* Toggles */}
                      {[
                        { label: 'Dithering', key: 'dither', color: 'laser-accent', tip: 'Add dots to simulate shading instead of solid black and white' },
                        { label: 'Invert', key: 'invert', color: 'laser-accent', tip: 'Swap black and white so the laser burns the opposite areas' },
                        { label: 'Cut Mode', key: 'edgeDetection', color: 'cyan-500', tip: 'Detect edges only so the laser cuts outlines instead of engraving' },
                      ].map(t => (
                        <div key={t.key} className="flex items-center justify-between" title={t.tip}>
                          <Label className={`text-[10px] font-medium ${t.key === 'edgeDetection' ? 'text-cyan-400 font-bold' : 'text-white/70'}`}>{t.label}</Label>
                          <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex items-center p-0.5 ${(procOptions as any)[t.key] ? `bg-${t.color}` : 'bg-white/10'}`}
                            onClick={() => setProcOptions(p => ({...p, [t.key]: !(p as any)[t.key]}))}>
                            <motion.div animate={{ x: (procOptions as any)[t.key] ? 16 : 0 }} className={`w-3 h-3 rounded-full shadow-sm ${(procOptions as any)[t.key] ? 'bg-black' : 'bg-white'}`} />
                          </div>
                        </div>
                      ))}
                      {/* Sliders */}
                      {[
                        { label: 'Brightness', key: 'brightness', min: -1, max: 1, step: 0.01, fmt: (v: number) => `${Math.round(v * 100)}%` },
                        { label: 'Contrast', key: 'contrast', min: -1, max: 1, step: 0.01, fmt: (v: number) => `${Math.round(v * 100)}%` },
                        { label: 'Threshold', key: 'threshold', min: 0, max: 255, step: 1, fmt: (v: number) => `${v}` },
                      ].map(s => (
                        <div key={s.key} className="space-y-0.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <Label className="text-white/60">{s.label}</Label>
                            <span className="text-laser-accent font-bold text-[9px]">{s.fmt((procOptions as any)[s.key] || 0)}</span>
                          </div>
                          <Slider value={[(procOptions as any)[s.key] || 0]} min={s.min} max={s.max} step={s.step} className="py-1 cyan-slider"
                            onValueChange={(val: any) => { const v = Array.isArray(val) ? val[0] : val; setProcOptions(p => ({...p, [s.key]: s.key === 'threshold' ? Math.round(Number(v) || 0) : Number(v) || 0})); }} />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : engineeringMode === 'label' ? (
                <>
                  {/* ── Label Printer Settings ── */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Tag className="w-3 h-3" /> Label Settings</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2.5">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Preset Size</Label>
                        <Select onValueChange={(key: string) => {
                          const preset = LABEL_SIZE_PRESETS[key as keyof typeof LABEL_SIZE_PRESETS];
                          if (preset) setLabelSettings(s => ({ ...s, labelWidth: preset.width, labelHeight: preset.height }));
                        }}>
                          <SelectTrigger className="glass-input border-white/10 bg-black/20 h-8 text-[10px]"><SelectValue placeholder="Select label size" /></SelectTrigger>
                          <SelectContent className="glass-panel border-white/20">
                            {Object.entries(LABEL_SIZE_PRESETS).map(([key, v]) => (
                              <SelectItem key={key} value={key} className="text-xs text-white hover:bg-white/10">{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Custom dimensions */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-white/40">Width (mm)</Label>
                          <Input type="number" className="glass-input border-white/10 h-7 text-[10px]" value={labelSettings.labelWidth}
                            onChange={e => setLabelSettings(s => ({ ...s, labelWidth: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-white/40">Height (mm)</Label>
                          <Input type="number" className="glass-input border-white/10 h-7 text-[10px]" value={labelSettings.labelHeight}
                            onChange={e => setLabelSettings(s => ({ ...s, labelHeight: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      {/* Orientation */}
                      <div className="flex gap-1">
                        <Button variant={labelSettings.orientation === 'portrait' ? 'default' : 'outline'} size="sm"
                          className={`flex-1 h-6 text-[8px] font-bold uppercase ${labelSettings.orientation === 'portrait' ? 'bg-orange-500 text-white' : 'border-white/10 text-white/40'}`}
                          onClick={() => setLabelSettings(s => ({ ...s, orientation: 'portrait' }))}>Portrait</Button>
                        <Button variant={labelSettings.orientation === 'landscape' ? 'default' : 'outline'} size="sm"
                          className={`flex-1 h-6 text-[8px] font-bold uppercase ${labelSettings.orientation === 'landscape' ? 'bg-orange-500 text-white' : 'border-white/10 text-white/40'}`}
                          onClick={() => setLabelSettings(s => ({ ...s, orientation: 'landscape' }))}>Landscape</Button>
                      </div>
                      {/* Copies */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <Label className="text-white/60">Copies</Label>
                          <span className="bg-orange-500/10 text-orange-400 px-1 py-0.5 rounded text-[9px] font-bold border border-orange-500/20">{labelSettings.copies}</span>
                        </div>
                        <Slider value={[labelSettings.copies]} min={1} max={50} step={1} className="py-1"
                          onValueChange={(v: any) => setLabelSettings(s => ({ ...s, copies: Array.isArray(v) ? v[0] : v }))} />
                      </div>
                    </div>
                  </section>

                  {/* Label Text */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Type className="w-3 h-3" /> Label Text</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2">
                      <Input placeholder="Label text..." className="glass-input border-white/10 h-8 text-[10px]" value={labelText}
                        onChange={e => setLabelText(e.target.value)} />
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <Label className="text-white/60">Font Size</Label>
                          <span className="text-orange-400 font-bold text-[9px]">{labelTextSize}px</span>
                        </div>
                        <Slider value={[labelTextSize]} min={8} max={72} step={1} className="py-1"
                          onValueChange={(v: any) => setLabelTextSize(Array.isArray(v) ? v[0] : v)} />
                      </div>
                    </div>
                  </section>

                  {/* Silhouette / Cut Line */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Scissors className="w-3 h-3" /> Silhouette Cut</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-white/70 font-bold">Show Cut Line</Label>
                        <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex items-center p-0.5 ${labelSettings.showCutLine ? 'bg-red-500' : 'bg-white/10'}`}
                          onClick={() => setLabelSettings(s => ({ ...s, showCutLine: !s.showCutLine }))}>
                          <motion.div animate={{ x: labelSettings.showCutLine ? 16 : 0 }} className={`w-3 h-3 rounded-full shadow-sm ${labelSettings.showCutLine ? 'bg-white' : 'bg-white'}`} />
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full h-7 text-[9px] border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold uppercase"
                        onClick={handleGenerateSilhouette} disabled={!labelDesignImage} title="Create a cut line around the edges of the label design">
                        <Scissors className="w-3 h-3 mr-1" /> Generate Edge Outline
                      </Button>
                      {labelSilhouetteSvg && (
                        <Button variant="outline" size="sm" className="w-full h-7 text-[9px] border-white/10 text-white/60 hover:bg-white/10 font-bold uppercase"
                          onClick={handleExportSilhouetteSvg} title="Download the cut line as an SVG file for the laser">
                          <Download className="w-3 h-3 mr-1" /> Export Cut SVG
                        </Button>
                      )}
                      <p className="text-[8px] text-white/30 italic">Red line = laser cut path for sticker shape</p>
                    </div>
                  </section>

                  {/* Printer Card */}
                  <Card className="bg-orange-500 overflow-hidden border-none shadow-[0_5px_15px_rgba(249,115,22,0.2)]">
                    <div className="p-2.5 text-white">
                      <div className="flex justify-between items-start mb-1">
                        <Printer className="w-3.5 h-3.5" />
                        <span className="text-[7px] font-black uppercase bg-black/10 px-1 py-0.5 rounded">MUNBYN</span>
                      </div>
                      <p className="text-[9px] font-black leading-tight mb-0.5">{MUNBYN_ITPP130B.name}</p>
                      <p className="text-[7px] font-bold opacity-70 mb-1.5">{MUNBYN_ITPP130B.dpi} DPI • {MUNBYN_ITPP130B.maxPrintWidth}mm • Direct Thermal</p>
                      <Button className="w-full bg-black text-white hover:bg-black/80 font-bold h-6 text-[8px]" onClick={handleExportLabel} disabled={!labelDesignImage} title="Download a file ready to send to the label printer">
                        <Download className="w-3 h-3 mr-1" /> Export Print-Ready
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <>
                  {/* 3D Printer Settings */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Printer className="w-3 h-3" /> 3D Machine</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Printer</Label>
                      <select className="w-full bg-black/40 border border-white/10 text-[10px] text-white/60 rounded px-2 py-1.5 outline-none focus:border-blue-500/50"
                        value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
                        <option>Saturn 3 Ultra (Resin)</option>
                        <option>Formbot T-Rex 2 (FDM)</option>
                        <option>Custom Industrial Slicer</option>
                      </select>
                      <div className="bg-blue-600/20 border border-blue-500/30 p-2 rounded-lg">
                        <p className="text-[10px] font-bold text-blue-200">Industrial High Detail</p>
                        <p className="text-[8px] text-blue-300/60 mt-0.5">0.05mm Layer • High Strength</p>
                      </div>
                      <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                        <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Build Volume</p>
                        <div className="flex justify-between text-[10px] text-white/60">
                          <span>X: 130mm</span><span>Y: 130mm</span><span>Z: 150mm</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <Card className="bg-blue-600 overflow-hidden border-none shadow-[0_5px_15px_rgba(59,130,246,0.2)]">
                    <div className="p-2.5 text-white">
                      <div className="flex justify-between items-start mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[7px] font-black uppercase bg-black/10 px-1 py-0.5 rounded">GANTASMO</span>
                      </div>
                      <p className="text-[9px] font-black leading-tight mb-0.5">Generative Strength Analysis</p>
                      <p className="text-[7px] font-bold opacity-70 mb-1.5">Optimize for {designStyle} structures.</p>
                      <Button className="w-full bg-black text-white hover:bg-black/80 font-bold h-6 text-[8px]" title="Test how strong the 3D design is before printing it">Run Simulation</Button>
                    </div>
                  </Card>

                  {/* Design Notes & Refs */}
                  {protoProject?.designNotes && (
                    <section className="space-y-1">
                      <details className="group">
                        <summary className="text-[9px] font-bold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white/60 flex items-center gap-1.5">
                          <Wrench className="w-3 h-3" /> Design Notes
                          <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                        </summary>
                        <p className="text-[10px] text-white/50 mt-1.5 whitespace-pre-wrap max-h-28 overflow-auto p-2 glass-panel border-white/10">{protoProject.designNotes}</p>
                      </details>
                    </section>
                  )}
                  {protoProject?.communityRefs && protoProject.communityRefs.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">References:</span>
                      {protoProject.communityRefs.map((ref, idx) => (
                        <p key={idx} className="text-[9px] text-blue-400/60 font-mono">{ref}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Toaster position="bottom-left" />
    </div>
  );
}

function ConsultantInterface({ 
  isMuted, 
  onToggleMute,
  onSavePreset,
  onBuildBlueprint,
  protoProject,
}: { 
  isMuted: boolean, 
  onToggleMute: () => void,
  onSavePreset: (name: string, settings: LaserSettings) => void,
  onBuildBlueprint: (description: string) => void,
  protoProject: PrototypeProject | null,
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, files?: { name: string, content: string, ext: string }[], image?: string, audioBuffer?: AudioBuffer | null, isPlaying?: boolean }[]>([
    { role: 'assistant', content: "SUBSTRATA Design Advisor online. Tell me what you want to build — I'll help you decompose it into subsystems, pick components, and design the parts. When you're ready, I'll trigger a full blueprint. What's your project idea?" }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Auto-resize textarea
  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  // When a new blueprint is generated, add a message with downloadable files
  const prevProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (protoProject && protoProject.id !== prevProjectRef.current) {
      prevProjectRef.current = protoProject.id;
      const files: { name: string, content: string, ext: string }[] = [];
      if (protoProject.openscadCode && !protoProject.openscadCode.startsWith('//')) {
        files.push({ name: `${protoProject.name || 'design'}.scad`, content: protoProject.openscadCode, ext: 'scad' });
      }
      if (protoProject.svgDesign) {
        files.push({ name: `${protoProject.name || 'design'}.svg`, content: protoProject.svgDesign, ext: 'svg' });
      }
      if (protoProject.wiringDiagram && protoProject.wiringDiagram !== 'No electronics in this design') {
        files.push({ name: `${protoProject.name || 'design'}_wiring.txt`, content: protoProject.wiringDiagram, ext: 'txt' });
      }
      if (protoProject.code) {
        files.push({ name: `${protoProject.name || 'firmware'}.ino`, content: protoProject.code, ext: 'ino' });
      }
      if (files.length > 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Blueprint for "${protoProject.name}" is ready! Here are your design files:`,
          files
        }]);
      }
    }
  }, [protoProject]);

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          // Convert to base64 for transcription
          const buf = await blob.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const transcribed = await transcribeSpokenPrompt(b64);
          if (transcribed) setInput(prev => (prev ? prev + ' ' : '') + transcribed);
          toast.success('Voice transcribed!');
        } catch {
          toast.error('Voice transcription failed');
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecordingVoice(true);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopVoiceRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecordingVoice(false);
  };

  // Per-message TTS toggle
  const toggleMessageAudio = async (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg || msg.role !== 'assistant') return;

    if (msg.isPlaying) {
      cancelSpeech();
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, isPlaying: false } : m));
      return;
    }

    // Stop any currently playing message
    setMessages(prev => prev.map(m => ({ ...m, isPlaying: false })));
    cancelSpeech();

    // Generate audio if not cached
    let buf = msg.audioBuffer;
    if (!buf) {
      try {
        buf = await generateAudioBuffer(msg.content);
        setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, audioBuffer: buf } : m));
      } catch {
        toast.error('TTS generation failed');
        return;
      }
    }
    if (!buf) return;

    const source = playBuffer(buf);
    setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, isPlaying: true } : m));
    source.onended = () => {
      setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, isPlaying: false } : m));
    };
  };

  const sendMessage = async () => {
    if (!input.trim() && !pendingImage) return;
    const userMsg = input;
    const userImage = pendingImage;
    const newMessages = [...messages, { role: 'user' as const, content: userMsg, image: userImage || undefined }];
    setMessages(newMessages);
    setInput('');
    setPendingImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsThinking(true);

    try {
      const result = await consultLaserExpert(userMsg, messages, useDeepThinking, userImage || undefined);
      const advisorText = result.text;
      
      setMessages(prev => [...prev, { role: 'assistant', content: advisorText, audioBuffer: null, isPlaying: false }]);

      // Handle tool calls
      if (result.calls && result.calls.length > 0) {
        for (const call of result.calls) {
           if (call.name === 'save_material_preset') {
             const args = call.args as any;
             onSavePreset(args.name, {
               engraved: true,
               power: Number(args.power) || 80,
               speed: Number(args.speed) || 1000,
               passes: Number(args.passes) || 1,
               mode: (args.mode as any) || 'M4',
               quality: 10
             });
           } else if (call.name === 'generate_blueprint') {
             const args = call.args as any;
             onBuildBlueprint(args.projectDescription);
           }
        }
      }

      // No autoplay — user clicks play button per message
    } catch (e) {
      toast.error("Advice consultation failed");
    } finally {
      setIsThinking(false);
    }
  };

  const handleManualBuild = () => {
    const context = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const lastAssistant = messages.filter(m => m.role === 'assistant').pop()?.content || '';
    onBuildBlueprint(lastAssistant.length > 50 ? lastAssistant : context.slice(-2000));
  };

  return (
    <div className="flex flex-col h-full glass-panel border-white/10 overflow-hidden rounded-2xl shadow-2xl shadow-cyan-500/10">
      <div className="bg-black/40 px-4 py-2 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-laser-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Design Advisor</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} group/msg`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed relative ${
                m.role === 'user' 
                  ? 'bg-laser-accent text-black font-medium rounded-tr-none shadow-md' 
                  : 'bg-white/5 text-white border border-white/10 rounded-tl-none backdrop-blur-sm shadow-sm'
              }`}>
                {/* Show attached image if present */}
                {m.image && (
                  <img src={m.image} alt="Attached" className="max-w-full max-h-32 rounded-lg mb-2 border border-white/10" />
                )}
                {/* Render message content — detect and inline-display code blocks */}
                {(() => {
                  const content = m.content;
                  // Check for OpenSCAD or SVG code blocks in assistant messages
                  if (m.role === 'assistant') {
                    const codeBlockRegex = /```(?:openscad|svg|scad)\n([\s\S]*?)```/g;
                    const parts: (string | { type: 'code'; lang: string; code: string })[] = [];
                    let lastIdx = 0;
                    let match;
                    while ((match = codeBlockRegex.exec(content)) !== null) {
                      if (match.index > lastIdx) parts.push(content.slice(lastIdx, match.index));
                      parts.push({ type: 'code', lang: match[0].startsWith('```svg') ? 'svg' : 'openscad', code: match[1] });
                      lastIdx = match.index + match[0].length;
                    }
                    if (lastIdx < content.length) parts.push(content.slice(lastIdx));
                    if (parts.length > 1 || (parts.length === 1 && typeof parts[0] !== 'string')) {
                      return parts.map((p, j) => typeof p === 'string' ? <span key={j}>{p}</span> : (
                        <div key={j} className="my-2 rounded-lg border border-white/10 overflow-hidden">
                          <div className="bg-white/5 px-2 py-1 text-[8px] uppercase tracking-widest text-white/40 font-bold">{p.lang}</div>
                          {p.lang === 'svg' ? (
                            <div className="bg-white rounded-b-lg p-3" dangerouslySetInnerHTML={{ __html: sanitizeSvg(p.code) }} />
                          ) : (
                            <pre className="p-2 text-[10px] font-mono text-blue-300 overflow-x-auto max-h-32">{p.code}</pre>
                          )}
                        </div>
                      ));
                    }
                  }
                  return content;
                })()}
                {/* TTS play/pause button for assistant messages */}
                {m.role === 'assistant' && i > 0 && (
                  <button
                    onClick={() => toggleMessageAudio(i)}
                    className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white/60 hover:text-laser-accent hover:border-laser-accent transition-colors"
                    title={m.isPlaying ? 'Pause audio' : 'Play this response'}
                  >
                    {m.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                )}
                {/* Restart from here button */}
                {i > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMessages(messages.slice(0, i + 1));
                      if (m.role === 'user') setInput(m.content);
                      toast.info(`Restarted from message ${i + 1}`);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/80 border border-white/20 items-center justify-center text-white/50 hover:text-laser-accent hover:border-laser-accent transition-colors hidden group-hover/msg:flex"
                    title="Go back to this point in the conversation and continue from here"
                  >
                    <CornerUpLeft className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {m.files && m.files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[90%]">
                  {m.files.map((f, j) => (
                    <button
                      key={j}
                      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-white/70 hover:text-white transition-colors group"
                      onClick={() => {
                        const blob = new Blob([f.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = f.name;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Downloaded ${f.name}`);
                      }}
                    >
                      <Download className="w-3 h-3 text-laser-accent group-hover:scale-110 transition-transform" />
                      <span className="font-mono">{f.name}</span>
                      <span className="text-[7px] uppercase tracking-wider text-white/30">{f.ext}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isThinking && (
             <div className="flex justify-start">
               <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-laser-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 bg-laser-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-laser-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
               </div>
             </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="p-2.5 border-t border-white/10 bg-black/30 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${useDeepThinking ? 'bg-laser-accent animate-pulse shadow-[0_0_8px_#00f2ff]' : 'bg-white/20'}`} />
                <Label className="text-[9px] font-bold uppercase tracking-widest text-white/40">Deep Think</Label>
            </div>
            <div 
                className={`w-8 h-4 rounded-full transition-colors cursor-pointer flex items-center p-0.5 ${useDeepThinking ? 'bg-laser-accent' : 'bg-white/10'}`}
                onClick={() => setUseDeepThinking(!useDeepThinking)}
                title="When on, the AI thinks longer and gives more detailed answers"
            >
                <motion.div 
                animate={{ x: useDeepThinking ? 16 : 0 }} 
                className={`w-3 h-3 rounded-full shadow-sm ${useDeepThinking ? 'bg-black' : 'bg-white'}`} 
                />
            </div>
        </div>
        {/* Pending image preview */}
        {pendingImage && (
          <div className="relative inline-block self-start">
            <img src={pendingImage} alt="Attached" className="max-h-16 rounded-lg border border-white/10" />
            <button onClick={() => setPendingImage(null)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px]">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        <div className="flex gap-1.5 items-end">
            {/* Hidden file input */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {/* Image upload button */}
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/40 hover:text-white" onClick={() => imageInputRef.current?.click()} title="Attach an image">
              <Paperclip className="w-3.5 h-3.5" />
            </Button>
            {/* Camera capture button */}
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-white/40 hover:text-white" 
              onClick={() => { const inp = imageInputRef.current; if (inp) { inp.setAttribute('capture', 'environment'); inp.click(); inp.removeAttribute('capture'); } }}
              title="Take a photo">
              <Camera className="w-3.5 h-3.5" />
            </Button>
            {/* Voice recording button */}
            <Button variant="ghost" size="icon" className={`h-9 w-9 shrink-0 ${isRecordingVoice ? 'text-red-400 animate-pulse bg-red-400/10' : 'text-white/40 hover:text-white'}`} 
              onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
              title={isRecordingVoice ? 'Stop recording' : 'Record voice message'}>
              <Mic className="w-3.5 h-3.5" />
            </Button>
            {/* Growing textarea */}
            <textarea
              ref={textareaRef}
              placeholder="Describe your project idea, paste a link, or attach an image..."
              className="flex-1 min-h-[36px] max-h-[120px] resize-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[11px] text-white placeholder:text-white/30 focus:outline-none focus:border-laser-accent/50 shadow-inner overflow-y-auto"
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              rows={1}
            />
            <Button className="accent-btn h-9 px-3 shrink-0 shadow-lg shadow-cyan-500/20 text-[10px]" onClick={sendMessage} title="Send your message to the AI advisor">
            <Zap className="w-3 h-3" />
            </Button>
        </div>
        <Button 
          variant="outline" 
          className="w-full h-8 text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 hover:text-blue-200"
          onClick={handleManualBuild}
          disabled={messages.length < 2}
          title="Take the conversation so far and generate a full 3D design from it"
        >
          <Wrench className="w-3 h-3 mr-1.5" /> Build Blueprint from Discussion
        </Button>
      </div>
    </div>
  );
}

function MaintenanceDashboard({ selectedPrinter, selectedLaser, onChangePrinter, onChangeLaser }: {
  selectedPrinter: string; selectedLaser: string;
  onChangePrinter: (v: string) => void; onChangeLaser: (v: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'laser' | 'printer'>('laser');
  const laser = LASER_DATABASE[selectedLaser];
  const printer = PRINTER_DATABASE[selectedPrinter];
  const machine = activeTab === 'laser' ? laser : printer;
  const machineName = machine?.name || (activeTab === 'laser' ? selectedLaser : selectedPrinter);
  const isLaser = activeTab === 'laser';
  const isCO2 = laser?.type?.includes('CO2');
  const isDiode = laser?.type?.includes('Diode');
  const isFDM = printer?.type?.includes('FDM');
  const isResin = printer?.type?.includes('Resin') || printer?.type?.includes('MSLA');

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Machine Selector */}
      <div className="space-y-3">
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5">
          <button onClick={() => setActiveTab('laser')}
            className={`flex-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'laser' ? 'bg-laser-accent text-black' : 'text-white/40 hover:text-white/60'}`}>
            Laser Engraver
          </button>
          <button onClick={() => setActiveTab('printer')}
            className={`flex-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'printer' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'}`}>
            3D Printer
          </button>
        </div>
        <select className="w-full bg-black/40 border border-white/10 text-xs text-white/80 rounded-lg px-3 py-2 outline-none focus:border-laser-accent/50"
          value={isLaser ? selectedLaser : selectedPrinter}
          onChange={e => isLaser ? onChangeLaser(e.target.value) : onChangePrinter(e.target.value)}>
          {Object.keys(isLaser ? LASER_DATABASE : PRINTER_DATABASE).map(k => (
            <option key={k} value={k}>{(isLaser ? LASER_DATABASE : PRINTER_DATABASE)[k].name}</option>
          ))}
        </select>
        {/* Machine specs card */}
        <div className="glass-panel border-white/10 p-3 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            {isLaser ? <Zap className="w-4 h-4 text-laser-accent" /> : <Printer className="w-4 h-4 text-blue-400" />}
            <div>
              <p className="text-sm font-bold text-white/90">{machineName}</p>
              <p className="text-[9px] text-white/40 uppercase font-bold">{isLaser ? laser?.type : printer?.type}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {isLaser ? (<>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Work Area</p><p className="text-white/80 font-bold">{laser?.workArea}</p></div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Power</p><p className="text-white/80 font-bold">{laser?.power}</p></div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Wavelength</p><p className="text-white/80 font-bold">{laser?.wavelength}</p></div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Software</p><p className="text-white/80 font-bold">{laser?.software}</p></div>
            </>) : (<>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Build Vol.</p><p className="text-white/80 font-bold">{printer?.buildVolume}</p></div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Layer Height</p><p className="text-white/80 font-bold">{printer?.layerHeight}</p></div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Nozzle</p><p className="text-white/80 font-bold">{printer?.nozzle}</p></div>
              <div className="bg-white/5 p-1.5 rounded border border-white/5"><p className="text-white/40 text-[8px] uppercase">Connectivity</p><p className="text-white/80 font-bold">{printer?.connectivity}</p></div>
            </>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(isLaser ? laser?.materials : printer?.materials)?.map(m => (
              <span key={m} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/5">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="glass-panel border-white/10 overflow-hidden">
          <div className="p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                <ShieldAlert className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-bold text-[13px] tracking-tight text-white/90">Safety</h4>
                <p className="text-[9px] text-white/40 uppercase font-bold">Optimal</p>
              </div>
            </div>
            <div className="space-y-1">
              {isLaser ? (<>
                <div className="flex justify-between text-[10px]"><span className="text-white/60">Goggles ({isDiode ? '445nm OD5+' : isCO2 ? '10600nm OD6+' : 'Rated'})</span><span className="text-green-400 font-bold">VERIFIED</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-white/60">Exhaust / Ventilation</span><span className="text-green-400 font-bold">ACTIVE</span></div>
                {isCO2 && <div className="flex justify-between text-[10px]"><span className="text-white/60">Water Cooling Loop</span><span className="text-green-400 font-bold">OK</span></div>}
                <div className="flex justify-between text-[10px]"><span className="text-white/60">Fire Extinguisher Nearby</span><span className="text-yellow-400 font-bold">CHECK</span></div>
              </>) : (<>
                <div className="flex justify-between text-[10px]"><span className="text-white/60">Ventilation ({isResin ? 'Resin Fumes' : 'ABS/ASA Fumes'})</span><span className="text-green-400 font-bold">OK</span></div>
                {isResin && <div className="flex justify-between text-[10px]"><span className="text-white/60">Nitrile Gloves</span><span className="text-green-400 font-bold">VERIFIED</span></div>}
                <div className="flex justify-between text-[10px]"><span className="text-white/60">Build Plate Adhesion</span><span className="text-green-400 font-bold">GOOD</span></div>
              </>)}
            </div>
          </div>
        </Card>

        <Card className="glass-panel border-white/10 overflow-hidden">
          <div className="p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-laser-accent/10 rounded-lg">
                <Wrench className="w-3.5 h-3.5 text-laser-accent" />
              </div>
              <div>
                <h4 className="font-bold text-[13px] tracking-tight text-white/90">Mainten.</h4>
                <p className="text-[9px] text-white/40 uppercase font-bold text-laser-accent">In 12h</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[9px] uppercase font-bold text-white/40 px-0.5">
                  <span>{isLaser ? 'Lens' : isResin ? 'FEP Film' : 'Nozzle'}</span>
                  <span>75%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-laser-accent w-3/4" />
                </div>
              </div>
              {isLaser && (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] uppercase font-bold text-white/40 px-0.5">
                    <span>{isCO2 ? 'Mirrors' : 'Focus Module'}</span>
                    <span>90%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 w-[90%]" />
                  </div>
                </div>
              )}
              {!isLaser && (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] uppercase font-bold text-white/40 px-0.5">
                    <span>{isResin ? 'UV LCD Screen' : 'Belts/Rails'}</span>
                    <span>85%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 w-[85%]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="glass-panel border-white/10 overflow-hidden">
          <div className="p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-[13px] tracking-tight text-white/90">Stats</h4>
                <p className="text-[9px] text-white/40 uppercase font-bold">42.5h</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <p className="text-[7px] text-white/40 uppercase font-bold">Safe</p>
                <p className="text-sm font-bold text-white/90">98%</p>
              </div>
              <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                <p className="text-[7px] text-white/40 uppercase font-bold">{isLaser ? 'Burns' : 'Prints'}</p>
                <p className="text-sm font-bold text-white/90">142</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Troubleshooting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold tracking-tight text-white/90 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Troubleshooting — {machineName}
          </h3>
          
          <Accordion className="space-y-3">
            <AccordionItem value="connection" className="glass-panel border-white/10 px-4 rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">{isLaser ? 'Link / Discovery' : 'Connection / Slicing'}</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none mt-1">Difficulty: Low</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-white/60 text-xs space-y-3">
                {isLaser ? (<>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">1. Driver Check:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Ensure CH340 or CP210x serial drivers are installed. For {machineName} on Windows, check "Ports (COM & LPT)" in Device Manager.</li>
                      <li>On Mac, check <code className="text-laser-accent bg-laser-accent/10 px-1 rounded">/dev/cu.usbserial-*</code> using the <code className="text-laser-accent bg-laser-accent/10 px-1 rounded">ls /dev/cu.*</code> command.</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">2. Cable Path:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Avoid USB hubs. Low-power hubs cause serial dropout during high-speed moves.</li>
                      <li>Replace the standard cable with a shielded one if EMF interference is suspected from the laser module.</li>
                    </ul>
                  </div>
                  <div className="bg-laser-accent/5 border border-laser-accent/10 p-4 rounded-lg flex gap-3">
                    <HelpCircle className="w-5 h-5 text-laser-accent shrink-0" />
                    <p className="text-xs text-laser-accent/80 italic">Tip: If "Resource Busy" errors occur, close Google Chrome or other browsers as they may claim the Serial API port. Supported software: {laser?.software || 'LaserGRBL / LightBurn'}.</p>
                  </div>
                </>) : (<>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">1. Connection Check:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{machineName} connects via {printer?.connectivity}. Ensure the correct interface is active.</li>
                      {isFDM && <li>If using Wi-Fi, ensure the printer and computer are on the same network. Try USB/SD as fallback.</li>}
                      {isResin && <li>USB drives must be FAT32 formatted. Large STL files should be pre-sliced to avoid timeouts.</li>}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">2. Slicer Settings:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Layer height range: {printer?.layerHeight}. Start with 0.2mm for speed, 0.08mm for detail.</li>
                      {isResin && <li>Use the manufacturer's resin profile. Exposure times vary between standard and ABS-like resins.</li>}
                      {isFDM && <li>Nozzle: {printer?.nozzle}. Verify nozzle temperature matches filament spec (PLA: 200-215°C, PETG: 230-250°C).</li>}
                    </ul>
                  </div>
                </>)}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quality" className="glass-panel border-white/10 px-4 rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">{isLaser ? 'Burn Quality' : 'Print Quality'}</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none mt-1">Difficulty: Med</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-white/60 text-xs space-y-3">
                {isLaser ? (<>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">1. Focus Adjustment:</p>
                    <p>{isDiode ? `${machineName} uses a fixed-focus or adjustable-focus diode. Use the included measurement sheet or spacer to set exact focal distance. If the beam "spreads," the focus is off — you get wide, fuzzy lines instead of sharp ones.`
                      : `${machineName} is a CO2 laser. Focus the beam using the Z-axis or manual focus jig. A defocused beam wastes power and scorches wide paths.`}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">2. Speed vs. Power:</p>
                    <p>For hardwoods on {machineName} ({laser?.power}), start with 80-90% power at moderate speed. If scorching occurs, increase speed and use multiple passes instead of one high-power pass.</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg flex gap-3">
                    <Fan className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-400/80 italic">Air Assist: {isCO2 ? 'CO2 lasers need strong air assist for cutting. Use a compressor (not aquarium pump) for clean edges.' : 'Use air assist for plywood to prevent edge charring. For leather, use low pressure to avoid driving soot into the grain.'}</p>
                  </div>
                </>) : (<>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">1. {isResin ? 'Layer Adhesion / Delamination' : 'First Layer Issues'}:</p>
                    {isResin ? (
                      <p>If layers separate or the print falls off the build plate, increase bottom exposure time by 5-10s. Ensure the FEP film is clean and tight. Shake the resin bottle before filling.</p>
                    ) : (
                      <p>If the first layer doesn&#39;t stick, level the bed and adjust Z-offset. Clean the build surface with IPA. For PLA use 60°C bed temp, PETG use 80°C.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">2. {isResin ? 'Resin Exposure Tuning' : 'Stringing & Retraction'}:</p>
                    {isResin ? (
                      <p>Overexposure causes bloating. Underexposure causes fragile parts. Print a resin calibration test (XP2 validation matrix) to find optimal exposure for your resin brand.</p>
                    ) : (
                      <p>If thin strings appear between parts, increase retraction distance (start 1mm for direct drive, 5mm for bowden). Reduce travel temperature by 5-10°C.</p>
                    )}
                  </div>
                </>)}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alarms" className="glass-panel border-white/10 px-4 rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">{isLaser ? 'GRBL Alarms' : 'Error Recovery'}</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none mt-1">Difficulty: Expert</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-white/60 text-xs space-y-3">
                {isLaser ? (<>
                  <p>GRBL Alarm 2 = machine exceeded its soft limit (software boundary). Common on {machineName} with {laser?.workArea} work area.</p>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">Solution:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Run the Home command ($H) to synchronize machine and work coordinates.</li>
                      <li>Check $130 (X Max Travel) and $131 (Y Max Travel). {machineName} area is {laser?.workArea}.</li>
                      <li>In {laser?.software || 'your control software'}, ensure your design fits within the bounding box.</li>
                    </ul>
                  </div>
                </>) : (<>
                  <p>{isResin ? 'Resin printers can fail mid-print due to FEP adhesion pulling the part off the build plate. The screen may also show "print failed" if the USB is disconnected.'
                    : 'FDM printers may pause with thermal runaway errors, communication timeouts, or stepper skip alarms.'}</p>
                  <div className="space-y-2">
                    <p className="font-bold text-white/80">Common Fixes:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {isResin ? (<>
                        <li>Clean and re-level the build plate. Use a metal scraper on the plate surface.</li>
                        <li>Replace the FEP film if it shows clouding or punctures. Stretch it evenly with the correct tension.</li>
                        <li>Warm the resin to 25-30°C in cold environments for proper curing.</li>
                      </>) : (<>
                        <li>Thermal runaway: Check thermistor wiring. Loose connection = sudden temperature drop = safety shutdown.</li>
                        <li>Stepper skipping: Reduce print speed or increase stepper driver current (if accessible). Check belt tension.</li>
                        <li>Communication timeout: Use SD/USB drive instead of USB tethering for long prints.</li>
                      </>)}
                    </ul>
                  </div>
                </>)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Procedures panel */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Procedures — {machineName}</h3>
          <div className="space-y-3">
            {isLaser ? (<>
              <div className="glass-panel border-white/10 p-4 rounded-xl space-y-2">
                <div className="flex gap-3">
                  <div className="bg-laser-accent/20 p-1.5 rounded-lg h-fit"><Wind className="w-3.5 h-3.5 text-laser-accent" /></div>
                  <div>
                    <p className="text-xs font-bold text-white/90">{isCO2 ? 'Clean Mirrors & Lens' : 'Fan Intake'}</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">{isCO2 ? 'Wipe mirrors and focus lens with lens cleaner. Dirty optics cut power by 30%+.' : 'Clear dust from fan to prevent throttling and overheating.'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-[9px] font-bold uppercase tracking-wider border-white/10 bg-white/5 h-8">Done</Button>
              </div>
              <div className="glass-panel border-white/10 p-4 rounded-xl space-y-2">
                <div className="flex gap-3">
                  <div className="bg-purple-500/20 p-1.5 rounded-lg h-fit"><History className="w-3.5 h-3.5 text-purple-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white/90">Belts & Rails</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">Check belt tension and lubricate linear rails. Loose belts = wobbly lines.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-[9px] font-bold uppercase tracking-wider border-white/10 bg-white/5 h-8">Done</Button>
              </div>
            </>) : (<>
              <div className="glass-panel border-white/10 p-4 rounded-xl space-y-2">
                <div className="flex gap-3">
                  <div className="bg-laser-accent/20 p-1.5 rounded-lg h-fit"><Wrench className="w-3.5 h-3.5 text-laser-accent" /></div>
                  <div>
                    <p className="text-xs font-bold text-white/90">{isResin ? 'Clean Resin Vat' : 'Clean Nozzle'}</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">{isResin ? 'Filter resin back into the bottle. Wipe FEP film gently. Check for cured debris.' : 'Do a cold pull (nylon) to remove burnt filament. Prevents clogs and under-extrusion.'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-[9px] font-bold uppercase tracking-wider border-white/10 bg-white/5 h-8">Done</Button>
              </div>
              <div className="glass-panel border-white/10 p-4 rounded-xl space-y-2">
                <div className="flex gap-3">
                  <div className="bg-purple-500/20 p-1.5 rounded-lg h-fit"><History className="w-3.5 h-3.5 text-purple-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-white/90">{isResin ? 'Level Build Plate' : 'Bed Leveling'}</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">{isResin ? 'Re-level the build plate every 5-10 prints to maintain adhesion.' : 'Run auto-level or manually check 4 corners with paper. Good first layer = good print.'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-[9px] font-bold uppercase tracking-wider border-white/10 bg-white/5 h-8">Done</Button>
              </div>
            </>)}

            <Card className={`overflow-hidden border-none shadow-[0_5px_15px_rgba(0,242,255,0.2)] ${isLaser ? 'bg-laser-accent' : 'bg-blue-600'}`}>
              <div className={`p-3 ${isLaser ? 'text-black' : 'text-white'}`}>
                <div className="flex justify-between items-start mb-1">
                  <Zap className="w-4 h-4" />
                  <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded ${isLaser ? 'bg-black/10' : 'bg-black/20'}`}>Firmware</span>
                </div>
                <p className="text-[10px] font-black leading-tight mb-0.5">Check for Updates</p>
                <p className={`text-[8px] font-bold mb-2 leading-tight ${isLaser ? 'opacity-70' : 'opacity-70'}`}>Keep {machineName} firmware current for stability.</p>
                <Button className={`w-full font-bold h-7 text-[9px] ${isLaser ? 'bg-black text-white hover:bg-black/80' : 'bg-white text-blue-600 hover:bg-white/90'}`}>Check Update</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
