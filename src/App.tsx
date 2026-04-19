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
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, CloudflareUser } from './lib/auth';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
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
import { processImageForLaser, ImageProcessOptions } from './lib/imageProcessor';
import { 
  generateLaserDesign, 
  consultLaserExpert, 
  analyzeLaserMaterial,
  getSmartSettings,
  transcribeSpokenPrompt,
  generateProjectBlueprint
} from './services/geminiService';
import { speakText, cancelSpeech } from './services/ttsService';
import { ACMER_S1_PARAMETERS, ACMER_S1_MANUAL_SUMMARY, PROJECT_TEMPLATES, LaserSettings } from './constants';
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
  }

  return primitives;
}

function extractPrimitives(body: string, moduleName: string, color: string, out: ParsedPrimitive[], seedOffset: number) {
  // Track transform stack for nested scopes
  const lines = body.split('\n');
  let currentTranslate: [number, number, number] = [0, 0, 0];
  let currentRotation: [number, number, number] = [0, 0, 0];
  let currentColor = color;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Parse color
    const colorMatch = trimmed.match(/color\(\s*"(\w+)"\s*\)/) || trimmed.match(/color\(\s*\[([\d.,\s]+)\]\s*\)/);
    if (colorMatch) {
      const namedColors: Record<string, string> = {
        red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
        orange: '#f97316', purple: '#a855f7', cyan: '#06b6d4', pink: '#ec4899',
        white: '#f8fafc', gray: '#6b7280', black: '#1e293b', silver: '#94a3b8'
      };
      if (colorMatch[1] && namedColors[colorMatch[1].toLowerCase()]) {
        currentColor = namedColors[colorMatch[1].toLowerCase()];
      }
    }

    // Parse translate
    const translateMatch = trimmed.match(/translate\(\[([^\]]+)\]\)/);
    if (translateMatch) {
      const vals = translateMatch[1].split(',').map(v => parseFloat(v.trim()) || 0);
      const maxVal = Math.max(1, ...vals.map(Math.abs));
      const scale = maxVal > 10 ? maxVal / 5 : 1;
      currentTranslate = [(vals[0] || 0) / scale, (vals[2] || 0) / scale, (vals[1] || 0) / scale];
    }

    // Parse rotate
    const rotateMatch = trimmed.match(/rotate\(\[([^\]]+)\]\)/);
    if (rotateMatch) {
      const vals = rotateMatch[1].split(',').map(v => (parseFloat(v.trim()) || 0) * Math.PI / 180);
      currentRotation = [vals[0] || 0, vals[2] || 0, vals[1] || 0];
    }

    // Parse cube — support both cube([x,y,z]) and cube(size)
    const cubeMatch = trimmed.match(/cube\(\[([^\]]+)\]/) || trimmed.match(/cube\((\d[\d.]*)\)/);
    if (cubeMatch) {
      let dims: number[];
      if (cubeMatch[1].includes(',')) {
        dims = cubeMatch[1].split(',').map(v => parseFloat(v.trim()) || 1);
      } else {
        const s = parseFloat(cubeMatch[1]) || 1;
        dims = [s, s, s];
      }
      const maxDim = Math.max(...dims);
      const scale = maxDim > 8 ? maxDim / 4 : 1;
      out.push({
        type: 'cube',
        args: [(dims[0] || 1) / scale, (dims[2] || dims[0] || 1) / scale, (dims[1] || dims[0] || 1) / scale],
        position: [...currentTranslate],
        rotation: [...currentRotation],
        color: currentColor,
        label: moduleName
      });
      currentTranslate = [0, 0, 0];
      currentRotation = [0, 0, 0];
      currentColor = color;
    }

    // Parse cylinder — multiple syntax variants
    const cylMatch = trimmed.match(/cylinder\(([^)]+)\)/);
    if (cylMatch && !cubeMatch) {
      const args = cylMatch[1];
      let r = 0.5, r2 = 0.5, h = 1, segments = 24;

      // Named params
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

      // Positional params fallback: cylinder(h, r) or cylinder(h, r1, r2)
      if (!rMatch && !r1Match && !dMatch && !d1Match && !hMatch) {
        const positional = args.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (positional.length >= 2) { h = positional[0]; r = r2 = positional[1]; }
        if (positional.length >= 3) { r2 = positional[2]; }
      }

      const scale = Math.max(1, Math.max(r * 2, r2 * 2, h) / 4);
      out.push({
        type: 'cylinder',
        args: [r / scale, r2 / scale, h / scale, segments],
        position: [...currentTranslate],
        rotation: [...currentRotation],
        color: currentColor,
        label: moduleName
      });
      currentTranslate = [0, 0, 0];
      currentRotation = [0, 0, 0];
      currentColor = color;
    }

    // Parse sphere
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

      const scale = Math.max(1, r / 2);
      out.push({
        type: 'sphere',
        args: [r / scale, segs, segs],
        position: [...currentTranslate],
        rotation: [...currentRotation],
        color: currentColor,
        label: moduleName
      });
      currentTranslate = [0, 0, 0];
      currentRotation = [0, 0, 0];
      currentColor = color;
    }
  }
}

const PrototypePreview = ({ openscadCode, parts }: { openscadCode: string; parts: Part[] }) => {
  const primitives = useMemo(() => {
    const parsed = parseOpenSCAD(openscadCode);
    if (parsed.length > 0) return parsed;
    // Smarter fallback: generate varied geometry from parts list with spatial layout
    if (parts.length === 0) return [];
    const results: ParsedPrimitive[] = [];
    // Group parts by category for spatial organization
    const categories = [...new Set(parts.map(p => p.category))];
    parts.forEach((part, i) => {
      const catIdx = categories.indexOf(part.category);
      const row = Math.floor(i / 4);
      const col = i % 4;
      const isFab = part.fabrication === '3d_print';
      const isLaser = part.fabrication === 'laser_cut';
      const isElec = part.category === 'Electronics' || part.category === 'Sensor';
      const isPower = part.category === 'Power';
      // Choose geometry by type
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

  return (
    <group>
      {primitives.map((prim, i) => (
        <group key={i} position={prim.position} rotation={prim.rotation}>
          <mesh
            castShadow
            receiveShadow
            onPointerOver={() => setHovered(i)}
            onPointerOut={() => setHovered(null)}
            scale={hovered === i ? 1.05 : 1}
          >
            {prim.type === 'cube' && <boxGeometry args={prim.args as [number, number, number]} />}
            {prim.type === 'cylinder' && <cylinderGeometry args={prim.args as [number, number, number, number]} />}
            {prim.type === 'sphere' && <sphereGeometry args={prim.args as [number, number, number]} />}
            <meshPhysicalMaterial
              color={prim.color}
              metalness={0.4}
              roughness={0.35}
              clearcoat={0.3}
              clearcoatRoughness={0.2}
              transparent
              opacity={hovered === i ? 1 : 0.88}
            />
          </mesh>
          {/* Wireframe edges */}
          <mesh>
            {prim.type === 'cube' && <boxGeometry args={prim.args as [number, number, number]} />}
            {prim.type === 'cylinder' && <cylinderGeometry args={prim.args as [number, number, number, number]} />}
            {prim.type === 'sphere' && <sphereGeometry args={prim.args as [number, number, number]} />}
            <meshBasicMaterial color={prim.color} wireframe opacity={0.15} transparent />
          </mesh>
        </group>
      ))}
      {/* Ground plane */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.5} />
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
  const [engineeringMode, setEngineeringMode] = useState<'laser' | 'prototype'>('prototype');
  const [designStyle, setDesignStyle] = useState<'minimalist' | 'deconstructivist' | 'classical' | 'organic'>('minimalist');
  const [isAdvisorMuted, setIsAdvisorMuted] = useState(false);
  const [advisorCollapsed, setAdvisorCollapsed] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
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
  const [selectedPrinter, setSelectedPrinter] = useState('Saturn 3 Ultra');
  const [bomSortMode, setBomSortMode] = useState<'fastest' | 'cheapest' | 'none'>('none');
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
      const result = await generateLaserDesign(designPrompt, designStyle);
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

  const startRecording = async () => {
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
      setIsTranscribing(true); // Shared state for recording UI
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
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

      const data = await generateProjectBlueprint(activePrompt, designStyle, selectedPrinter, '');
      
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
        // In a real app we'd parse this for power/speed
    } catch (e) {
        toast.error("Analysis failed");
    } finally {
        setIsAnalyzing(false);
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
                <div className="col-span-full pt-4 pb-2 flex items-center justify-between border-t border-white/5 mt-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40">Stock Image Library</h3>
                  {user && <Button variant="ghost" size="sm" onClick={handleClaimAllTemplates} className="text-[10px] font-bold uppercase text-laser-accent hover:bg-laser-accent/10 h-7"><Plus className="w-3 h-3 mr-1" /> Add All</Button>}
                </div>
                {PROJECT_TEMPLATES.map(template => (
                  <Card key={template.id} className="group overflow-hidden glass-panel border-white/10 cursor-pointer hover:shadow-cyan-500/10 transition-all"
                    onClick={() => { setOriginalImage(template.image); setShowLibrary(false); toast.info(`Loaded ${template.name}`); }}>
                    <div className="aspect-square relative flex items-center justify-center bg-black/20">
                      <img src={template.image} alt={template.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                    </div>
                    <div className="p-3 border-t border-white/10">
                      <p className="text-xs font-bold uppercase tracking-tight text-white">{template.name}</p>
                      <span className="text-[9px] text-white/50">{template.category}</span>
                    </div>
                  </Card>
                ))}
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
              <div className="p-4"><MaintenanceDashboard /></div>
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
      </AnimatePresence>

      {/* ═══════ TOOLBAR ═══════ */}
      <header className="h-10 shrink-0 px-3 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-laser-accent p-1 rounded shadow-[0_0_15px_rgba(0,242,255,0.4)]">
              <Layers className="text-black w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-[11px] font-black tracking-tighter leading-none text-white uppercase">SUBSTRATA</h1>
              <p className="text-[7px] font-bold tracking-[0.15em] text-laser-accent/70 uppercase leading-none">by GANTASMO</p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />

          {/* Mode switcher */}
          <div className="flex bg-white/5 rounded-md border border-white/5 p-0.5">
            <button onClick={() => setEngineeringMode('prototype')} className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all ${engineeringMode === 'prototype' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/70'}`}>3D Prototype</button>
            <button onClick={() => setEngineeringMode('laser')} className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-all ${engineeringMode === 'laser' ? 'bg-laser-accent text-black' : 'text-white/40 hover:text-white/70'}`}>Laser Studio</button>
          </div>

          {/* Design style */}
          <div className="hidden md:flex gap-0.5 ml-2">
            {(['minimalist', 'deconstructivist', 'classical', 'organic'] as const).map(s => (
              <button key={s} onClick={() => setDesignStyle(s)}
                className={`px-2 py-1 text-[8px] font-black uppercase tracking-tight rounded transition-all border ${designStyle === s ? (engineeringMode === 'laser' ? 'bg-laser-accent text-black border-laser-accent' : 'bg-blue-600 text-white border-blue-600') : 'bg-transparent text-white/30 border-transparent hover:text-white/50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowLibrary(true)} className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
            <Library className="w-3.5 h-3.5" /> Library
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowMaintenance(true)} className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
            <Settings className="w-3.5 h-3.5" /> Maint.
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDocs(true)} className="h-7 text-[9px] font-bold uppercase text-white/50 hover:text-white hover:bg-white/10 gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Docs
          </Button>
          <Separator orientation="vertical" className="h-5 bg-white/10 mx-1" />
          <Button size="sm" className="accent-btn h-7 text-[9px] shadow-[0_0_12px_rgba(0,242,255,0.2)]" onClick={handleSaveProject}>
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          {user ? (
            <Button variant="ghost" size="icon" onClick={logout} className="rounded-full overflow-hidden border border-white/10 h-7 w-7 hover:bg-white/10">
              {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-3.5 h-3.5" />}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={loginWithGoogle} className="h-7 text-[9px] border border-white/10 text-white/60 hover:text-white gap-1">
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
        <button onClick={() => setAdvisorCollapsed(!advisorCollapsed)}
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
                        <Button size="sm" variant="secondary" onClick={() => setIsAdvancedEditorOpen(true)} className="bg-laser-accent/90 text-black hover:bg-laser-accent font-bold h-7 text-[10px]">
                          <Edit2 className="w-3 h-3 mr-1" /> Studio
                        </Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20 text-laser-accent" onClick={handleExportRaster} title="Export PNG"><FileImage className="w-3 h-3" /></Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20 text-laser-accent" onClick={handleExportVector} title="Export SVG"><FileCode className="w-3 h-3" /></Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20" onClick={() => { setOriginalImage(null); setProcessedImage(null); }}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                        <Button size="icon" variant="secondary" className="glass-panel h-7 w-7 hover:bg-white/20" onClick={handleAnalyzeMaterial} disabled={isAnalyzing}>
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
                          onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}>
                          {isTranscribing ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" className="h-8 w-8 accent-btn" onClick={handleGenerate} disabled={isGenerating || !designPrompt}>
                          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <p className="text-[9px] text-white/30 mt-0.5 pr-1">Presets:</p>
                    {['Tribal Mask', 'Sacred Geometry', 'Minimalist Cat', 'Floral Frame'].map(p => (
                      <button key={p} onClick={() => setDesignPrompt(p)} className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 glass-panel border-white/10 text-white/60 hover:border-laser-accent hover:text-laser-accent transition-colors">{p}</button>
                    ))}
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
                      <PrototypePreview openscadCode={protoProject?.openscadCode || ''} parts={protoProject?.parts || []} />
                    </Stage>
                    <Environment preset="city" />
                  </Suspense>
                  <Grid infiniteGrid fadeDistance={30} fadeStrength={5} sectionSize={1.5} sectionColor="#3b82f6" sectionThickness={1.5} cellColor="#1e293b" />
                </Canvas>

                {/* 3D overlay controls */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <Card className="bg-black/80 backdrop-blur-md border border-white/10 p-1.5 flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white"><Layers className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white"><Settings2 className="w-3.5 h-3.5" /></Button>
                    <Separator orientation="vertical" className="h-7 bg-white/10" />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300"><Printer className="w-3.5 h-3.5" /></Button>
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
          </div>

          {/* ─── BOTTOM: Output Tabs (progressive reveal) ─── */}
          <div className="shrink-0 border-t border-white/10 bg-black/30">
            {/* Tab bar */}
            <div className="h-9 px-3 flex items-center gap-1 border-b border-white/5 overflow-x-auto">
              {[
                { id: '3d', label: '3D Workspace', icon: Box, ready: true },
                { id: 'bom', label: 'Bill of Materials', icon: ListTodo, ready: !!protoProject },
                { id: 'fabrication', label: 'Design Files', icon: FileCode, ready: !!protoProject },
                { id: 'code', label: 'Control Code', icon: Terminal, ready: !!protoProject },
                { id: 'assembly', label: 'Assembly', icon: ClipboardList, ready: !!(protoProject && protoProject.assemblySteps.length > 0) },
              ].map(tab => (
                <button key={tab.id} onClick={() => tab.ready && setActiveOutputTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-t transition-all whitespace-nowrap
                    ${activeOutputTab === tab.id ? 'bg-white/10 text-blue-400 border-b-2 border-blue-400' : tab.ready ? 'text-white/40 hover:text-white/60 hover:bg-white/5' : 'text-white/15 cursor-not-allowed'}`}>
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                  {isProtoGenerating && !tab.ready && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-1" />}
                </button>
              ))}
              <div className="flex-1" />
              {protoProject && (
                <Button size="sm" className="h-6 text-[9px] bg-blue-600 hover:bg-blue-500 text-white">
                  <ShoppingCart className="w-3 h-3 mr-1" /> Export All
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
                      <Button size="sm" variant={bomSortMode === 'fastest' ? 'default' : 'outline'} className={`h-5 text-[8px] ${bomSortMode === 'fastest' ? 'bg-blue-600' : 'bg-white/5 border-white/10 text-white/60'}`}
                        onClick={() => setBomSortMode(bomSortMode === 'fastest' ? 'none' : 'fastest')}>FASTEST</Button>
                      <Button size="sm" variant={bomSortMode === 'cheapest' ? 'default' : 'outline'} className={`h-5 text-[8px] ${bomSortMode === 'cheapest' ? 'bg-blue-600' : 'bg-white/5 border-white/10 text-white/60'}`}
                        onClick={() => setBomSortMode(bomSortMode === 'cheapest' ? 'none' : 'cheapest')}>CHEAPEST</Button>
                    </div>
                  </div>
                  {sortedParts.map(part => (
                    <div key={part.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">{part.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 text-[8px] px-1 py-0">{part.source}</Badge>
                            <span className="text-[9px] text-white/40 font-mono">{part.specs}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-white">${part.price.toFixed(2)}</p>
                        <p className="text-[9px] text-green-400 font-bold">{part.speed}</p>
                      </div>
                    </div>
                  ))}
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
                    <pre className="flex-1 p-3 text-xs font-mono overflow-auto whitespace-pre-wrap" style={{ color: activeDesignFileTab === 'openscad' ? '#93c5fd' : activeDesignFileTab === 'svg' ? '#86efac' : '#fde68a' }}>
                      {activeDesignFileTab === 'openscad' && (protoProject?.openscadCode || '// Generate a blueprint to see OpenSCAD code')}
                      {activeDesignFileTab === 'svg' && (protoProject?.svgDesign || '<!-- Generate a blueprint to see SVG paths -->')}
                      {activeDesignFileTab === 'wiring' && (protoProject?.wiringDiagram || '# Generate a blueprint to see wiring diagram')}
                    </pre>
                  ) : (
                    <div className="flex-1 overflow-auto p-3">
                      {activeDesignFileTab === 'svg' && (
                        protoProject?.svgDesign ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="bg-white rounded-lg p-4 shadow-lg max-w-full overflow-auto"
                              dangerouslySetInnerHTML={{ __html: sanitizeSvg(protoProject.svgDesign) }} />
                            <p className="text-[9px] text-white/30 uppercase tracking-widest">Laser-Cut SVG Profile — rendered from generated markup</p>
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
                          </div>
                        ) : (
                          <p className="text-center py-8 text-white/20 text-xs font-mono tracking-widest">GENERATE A BLUEPRINT TO SEE 3D PARTS</p>
                        )
                      )}
                      {activeDesignFileTab === 'wiring' && (
                        protoProject?.wiringDiagram ? (
                          <div className="space-y-2">
                            <p className="text-[9px] text-yellow-400/60 uppercase tracking-widest font-bold mb-2">Wiring Diagram</p>
                            {protoProject.wiringDiagram.split('\n').filter(l => l.trim()).map((line, i) => {
                              const isHeader = line.startsWith('#') || line.startsWith('==') || line.toUpperCase() === line.trim();
                              const isConnection = line.includes('→') || line.includes('->') || line.includes('-->');
                              return (
                                <div key={i} className={`text-xs font-mono px-2 py-0.5 rounded ${isHeader ? 'text-yellow-300 font-bold text-[10px] mt-2 border-b border-yellow-500/20 pb-1' : isConnection ? 'text-green-300 bg-green-900/20 border-l-2 border-green-500/40 pl-3' : 'text-white/50'}`}>
                                  {line}
                                </div>
                              );
                            })}
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
        <button onClick={() => setPropsCollapsed(!propsCollapsed)}
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/10 text-white/60 hover:text-laser-accent" onClick={() => setProcOptions(p => ({...p, rotate: (p.rotate + 90) % 360}))} title="Rotate"><RotateCw className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className={`h-7 w-7 hover:bg-white/10 ${procOptions.flipH ? 'bg-laser-accent/20 text-laser-accent' : 'text-white/60'}`} onClick={() => setProcOptions(p => ({...p, flipH: !p.flipH}))} title="Flip H"><FlipHorizontal className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className={`h-7 w-7 hover:bg-white/10 ${procOptions.flipV ? 'bg-laser-accent/20 text-laser-accent' : 'text-white/60'}`} onClick={() => setProcOptions(p => ({...p, flipV: !p.flipV}))} title="Flip V"><FlipVertical className="w-3.5 h-3.5" /></Button>
                    </div>
                  </section>

                  {/* Image Filters */}
                  <section className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Image Filters</h3>
                    <div className="p-2 glass-panel border-white/10 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { name: 'Draft', opts: { brightness: 0, contrast: 0.2, threshold: 128, dither: false, edgeDetection: false } },
                          { name: 'Fine', opts: { brightness: -0.1, contrast: 0.3, threshold: 120, dither: true, edgeDetection: false } },
                          { name: 'Contrast', opts: { brightness: 0, contrast: 0.8, threshold: 128, dither: true, edgeDetection: false } },
                          { name: 'Stencil', opts: { brightness: 0, contrast: 0.5, threshold: 150, dither: false, edgeDetection: true } },
                        ].map(style => (
                          <Button key={style.name} variant="outline" className="h-6 text-[8px] font-bold uppercase border-white/5 bg-black/20 hover:border-laser-accent/50"
                            onClick={() => setProcOptions(p => ({...p, ...style.opts}))}>{style.name}</Button>
                        ))}
                      </div>
                      {/* Toggles */}
                      {[
                        { label: 'Dithering', key: 'dither', color: 'laser-accent' },
                        { label: 'Invert', key: 'invert', color: 'laser-accent' },
                        { label: 'Cut Mode', key: 'edgeDetection', color: 'cyan-500' },
                      ].map(t => (
                        <div key={t.key} className="flex items-center justify-between">
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
                      <Button className="w-full bg-black text-white hover:bg-black/80 font-bold h-6 text-[8px]">Run Simulation</Button>
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
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, files?: { name: string, content: string, ext: string }[] }[]>([
    { role: 'assistant', content: "SUBSTRATA Design Advisor online. Tell me what you want to build — I'll help you decompose it into subsystems, pick components, and design the parts. When you're ready, I'll trigger a full blueprint. What's your project idea?" }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const result = await consultLaserExpert(userMsg, messages, useDeepThinking);
      const advisorText = result.text;
      
      setMessages(prev => [...prev, { role: 'assistant', content: advisorText }]);

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

      if (!isMuted) {
        await speakText(advisorText);
      }
    } catch (e) {
      toast.error("Advice consultation failed");
    } finally {
      setIsThinking(false);
    }
  };

  const handleManualBuild = () => {
    // Extract latest context from conversation
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
        <div className="flex items-center gap-1.5">
            <Button 
                variant="ghost" 
                size="icon" 
                className={`h-7 w-7 rounded-full ${isMuted ? 'text-red-400 bg-red-400/10' : 'text-laser-accent bg-laser-accent/10'}`}
                onClick={() => {
                   if (!isMuted) cancelSpeech();
                   onToggleMute();
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-laser-accent text-black font-medium rounded-tr-none shadow-md' 
                  : 'bg-white/5 text-white border border-white/10 rounded-tl-none backdrop-blur-sm shadow-sm'
              }`}>
                {m.content}
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
            >
                <motion.div 
                animate={{ x: useDeepThinking ? 16 : 0 }} 
                className={`w-3 h-3 rounded-full shadow-sm ${useDeepThinking ? 'bg-black' : 'bg-white'}`} 
                />
            </div>
        </div>
        <div className="flex gap-1.5">
            <Input 
            placeholder="Describe your project idea..." 
            className="glass-input h-9 shadow-inner border-white/10 text-[11px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button className="accent-btn h-9 px-3 shrink-0 shadow-lg shadow-cyan-500/20 text-[10px]" onClick={sendMessage}>
            <Zap className="w-3 h-3" />
            </Button>
        </div>
        <Button 
          variant="outline" 
          className="w-full h-8 text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-300 hover:from-blue-600/30 hover:to-purple-600/30 hover:text-blue-200"
          onClick={handleManualBuild}
          disabled={messages.length < 2}
        >
          <Wrench className="w-3 h-3 mr-1.5" /> Build Blueprint from Discussion
        </Button>
      </div>
    </div>
  );
}

function MaintenanceDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
              <div className="flex justify-between text-[10px]">
                <span className="text-white/60">Goggles</span>
                <span className="text-green-400 font-bold">VERIFIED</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-white/60">Exhaust</span>
                <span className="text-green-400 font-bold">ACTIVE</span>
              </div>
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
                  <span>Lens</span>
                  <span>75%</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-laser-accent w-3/4" />
                </div>
              </div>
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
                <p className="text-[7px] text-white/40 uppercase font-bold">Cuts</p>
                <p className="text-sm font-bold text-white/90">142</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold tracking-tight text-white/90 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Troubleshooting
          </h3>
          
          <Accordion className="space-y-3">
            <AccordionItem value="connection" className="glass-panel border-white/10 px-4 rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">Link / Discovery</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none mt-1">Difficulty: Low</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-white/60 text-xs space-y-3">
                 <div className="space-y-2">
                   <p className="font-bold text-white/80">1. Driver Check:</p>
                   <ul className="list-disc pl-5 space-y-1">
                     <li>Ensure CH340 or CP210x drivers are installed. For ACMER S1 on Windows, check "Ports (COM & LPT)" in Device Manager.</li>
                     <li>On Mac, check `/dev/cu.usbserial-*` using the `ls /dev/cu.*` command in terminal.</li>
                   </ul>
                 </div>
                 <div className="space-y-2">
                   <p className="font-bold text-white/80">2. Cable Path:</p>
                   <ul className="list-disc pl-5 space-y-1">
                     <li>Avoid USB hubs. Low-power hubs cause serial dropout during high-speed moves.</li>
                     <li>Replace the standard 1.5m cable with a shielded one if EMF interference is suspected from the laser module.</li>
                   </ul>
                 </div>
                 <div className="bg-laser-accent/5 border border-laser-accent/10 p-4 rounded-lg flex gap-3">
                    <HelpCircle className="w-5 h-5 text-laser-accent shrink-0" />
                    <p className="text-xs text-laser-accent/80 italic">Tip: If "Resource Busy" errors occur, close Google Chrome/other browsers as they might attempt to claim the Serial API port.</p>
                 </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quality" className="glass-panel border-white/10 px-4 rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">Burn Quality</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none mt-1">Difficulty: Med</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-white/60 text-xs space-y-3">
                 <div className="space-y-2">
                   <p className="font-bold text-white/80">1. Focal Point Drift:</p>
                   <p>The ACMER S1 fixed focus requires the 2mm acrylic measurement sheet. If the laser is too high, the beam "spreads," causing wide, unfocused soot lines instead of sharp engravings.</p>
                 </div>
                 <div className="space-y-2">
                   <p className="font-bold text-white/80">2. Speed vs. Power Ratio:</p>
                   <p>For hardwoods, use 90% power at 1000mm/min. If scorching occurs on plywood, increase speed to 2000mm/min and use 2 passes instead of 1 high-power pass.</p>
                 </div>
                 <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg flex gap-3">
                    <Fan className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-400/80 italic">Air Assist: Always use air assist for plywood to prevent edge charring. For engraving on leather, use low air pressure to prevent soot from being driven into the grain.</p>
                 </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alarms" className="glass-panel border-white/10 px-4 rounded-xl overflow-hidden shadow-sm">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">GRBL Alarm 2</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none mt-1">Difficulty: Expert</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-white/60 text-xs space-y-3">
                 <p>GRBL Alarm 2 usually means the machine reached its soft limit (software-calculated boundary).</p>
                 <div className="space-y-2">
                   <p className="font-bold text-white/80">Solution:</p>
                   <ul className="list-disc pl-5 space-y-1">
                     <li>Run the "Home" command ($H) to synchronize machine and work coordinates.</li>
                     <li>Check $130 (X Max Travel) and $131 (Y Max Travel). ACMER S1 is usually 130x130mm.</li>
                     <li>In LightBurn/LaserGRBL, ensure your design is within the (0,0) to (130,130) bounding box.</li>
                   </ul>
                 </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-1">Procedures</h3>
          <div className="space-y-3">
              <div className="glass-panel border-white/10 p-4 rounded-xl space-y-2">
                 <div className="flex gap-3">
                    <div className="bg-laser-accent/20 p-1.5 rounded-lg h-fit">
                        <Wind className="w-3.5 h-3.5 text-laser-accent" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white/90">Fan Intake</p>
                        <p className="text-[10px] text-white/50 leading-relaxed">Clear dust to prevent throttling.</p>
                    </div>
                 </div>
                 <Button variant="outline" size="sm" className="w-full text-[9px] font-bold uppercase tracking-wider border-white/10 bg-white/5 h-8">Done</Button>
              </div>

               <div className="glass-panel border-white/10 p-4 rounded-xl space-y-2">
                 <div className="flex gap-3">
                    <div className="bg-purple-500/20 p-1.5 rounded-lg h-fit">
                        <History className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white/90">Belts</p>
                        <p className="text-[10px] text-white/50 leading-relaxed">Check tension for "low bass note".</p>
                    </div>
                 </div>
                 <Button variant="outline" size="sm" className="w-full text-[9px] font-bold uppercase tracking-wider border-white/10 bg-white/5 h-8">Done</Button>
              </div>

              <Card className="bg-laser-accent overflow-hidden border-none shadow-[0_5px_15px_rgba(0,242,255,0.2)]">
                <div className="p-3 text-black">
                   <div className="flex justify-between items-start mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-[7px] font-black uppercase bg-black/10 px-1 py-0.5 rounded">Firmware</span>
                   </div>
                   <p className="text-[10px] font-black leading-tight mb-0.5">Update V2.3</p>
                   <p className="text-[8px] font-bold opacity-70 mb-2 leading-tight">Improved motor curves.</p>
                   <Button className="w-full bg-black text-white hover:bg-black/80 font-bold h-7 text-[9px]">Update</Button>
                </div>
              </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
