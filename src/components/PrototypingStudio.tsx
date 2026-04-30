import React, { useState, useRef, useEffect, Suspense } from 'react';
import {
  Box,
  Cpu,
  ShoppingCart,
  Search,
  Wand2,
  FileJson,
  ListTodo,
  Printer,
  Layers,
  Settings2,
  Package,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Terminal,
  FileCode,
  Zap,
  Wrench,
  ClipboardList,
  Cable,
  Scissors,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  ScanSearch,
  Building2,
} from 'lucide-react';
import { generateValidationReport, validateOpenSCADForPrinting, type ValidationReport } from '../lib/meshValidator';
import { LayerManager } from '../lib/layerSystem';
import type { Layer, LayerCategory } from '../lib/layerSystem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { generateProjectBlueprint } from '../services/geminiService';
import { DESIGN_TEMPLATES } from '../designDatabase';

// Simplified 3D Component for Visualization
const PrototypePreview = ({ type }: { type: string }) => {
  return (
    <mesh castShadow receiveShadow>
      {type === 'robot' ? (
        <group>
          <boxGeometry args={[1, 0.5, 2]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
          {/* Leg surrogates */}
          {[...Array(12)].map((_, i) => (
            <mesh key={i} position={[i % 2 === 0 ? 0.6 : -0.6, -0.2, (i / 2) * 0.4 - 1.2]}>
              <boxGeometry args={[0.3, 0.8, 0.1]} />
              <meshStandardMaterial color="#1e40af" />
            </mesh>
          ))}
        </group>
      ) : (
        <sphereGeometry args={[1, 32, 32]} />
      )}
      <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

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

export const PrototypingStudio = ({ designStyle = 'minimalist', advisorContext = '', autoPrompt = '' }: { designStyle?: string; advisorContext?: string; autoPrompt?: string }) => {
  const [prompt, setPrompt] = useState('');
  const [currentProject, setCurrentProject] = useState<PrototypeProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('design');
  const [selectedPrinter, setSelectedPrinter] = useState('Saturn 3 Ultra');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeDesignTab, setActiveDesignTab] = useState<'openscad' | 'svg' | 'wiring'>('openscad');

  const [sortMode, setSortMode] = useState<'fastest' | 'cheapest' | 'none'>('none');

  // ── 3D file import + validation ────────────────────────────────────────────
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [importedModelName, setImportedModelName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Layer panel ────────────────────────────────────────────────────────────
  const [layerManager] = useState(() => new LayerManager('empty'));
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layerTick, setLayerTick] = useState(0);

  // Auto-fill prompt from advisor context
  useEffect(() => {
    if (autoPrompt && autoPrompt !== prompt) {
      setPrompt(autoPrompt);
      // Auto-generate if we have a prompt from the advisor
      handleGeneratePrototype(autoPrompt);
    }
  }, [autoPrompt]);

  const sortedParts = React.useMemo(() => {
    if (!currentProject) return [];
    let list = [...currentProject.parts];
    if (sortMode === 'cheapest') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortMode === 'fastest') {
      const speedWeight = { 'Today': 0, 'Tomorrow': 1, '2-3 Days': 2, '1-Week': 3, '2-Weeks': 4 };
      list.sort((a, b) => (speedWeight[a.speed as keyof typeof speedWeight] || 99) - (speedWeight[b.speed as keyof typeof speedWeight] || 99));
    }
    return list;
  }, [currentProject, sortMode]);

  const handleImport3DFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['stl', 'glb', 'obj'].includes(ext)) {
      toast.error('Unsupported format — import STL, GLB, or OBJ');
      return;
    }
    const buffer = await file.arrayBuffer();
    const report = generateValidationReport(buffer, file.name);
    if (currentProject?.openscadCode) {
      const scad = validateOpenSCADForPrinting(currentProject.openscadCode);
      report.warnings.push(...scad.warnings);
      report.printabilityNotes.push(...scad.dfmIssues);
    }
    if (currentProject) {
      layerManager.autoAssignAll(currentProject.parts.map((p: Part) => p.name));
      setLayerTick((t: number) => t + 1);
    }
    setImportedModelName(file.name);
    setValidationReport(report);
    setShowValidation(true);
    if (report.overallScore === 'fail') toast.error(`Validation FAILED: ${report.errors[0]}`);
    else if (report.overallScore === 'warn') toast.warning(`Imported with ${report.warnings.length} warning(s) — see Validate panel`);
    else toast.success(`${file.name} validated ✓`);
    e.target.value = '';
  };

  const handleGeneratePrototype = async (overridePrompt?: string) => {
    const activePrompt = overridePrompt || prompt;
    if (!activePrompt.trim()) {
      toast.error("Please describe your prototype idea");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);
    
    try {
      setGenerationProgress(20);
      const progressInterval = setInterval(() => {
        setGenerationProgress(p => Math.min(p + 5, 85));
      }, 2000);

      const data = await generateProjectBlueprint(activePrompt, designStyle, selectedPrinter, advisorContext);
      
      clearInterval(progressInterval);
      setGenerationProgress(90);
      
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

      setCurrentProject(newProject);
      setGenerationProgress(100);
      toast.success("Blueprint Generated — Design files ready!");
    } catch (error) {
      console.error(error);
      toast.error("Generation failed. Please try again.");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Prototyping Studio</h2>
            <p className="text-xs text-white/40 font-mono">GEN-AI HARDWARE ENGINE</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white/5 text-blue-300 border-blue-500/30">
            <Zap className="w-3 h-3 mr-1" /> ACTIVE ENGINE
          </Badge>
          <Separator orientation="vertical" className="h-4 bg-white/10" />
          <select 
            className="bg-black/40 border border-white/10 text-xs text-white/60 rounded px-2 py-1 outline-none focus:border-blue-500/50"
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
          >
            <option>Saturn 3 Ultra (Resin)</option>
            <option>Formbot T-Rex 2 (FDM)</option>
            <option>Custom Industrial Slicer</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Generation & Input */}
        <div className="w-1/3 border-r border-white/5 flex flex-col p-4 gap-4 bg-black/20">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Design Objectives</label>
              <textarea 
                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all resize-none"
                placeholder="e.g., I want to design a centipede robot with realistic wavelike oscillations of the legs..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-900/20 group"
              onClick={() => handleGeneratePrototype()}
              disabled={isGenerating}
            >
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
                    <span>SYNTHESIZING...</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span>GENERATE BLUEPRINT</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>PROCESSING LAYERS</span>
                  <span>{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="h-1 bg-white/5" />
              </div>
            )}
          </div>

          <Separator className="bg-white/5 my-2" />

          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Studio Assets</label>
              <Card className="p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer border-l-4 border-l-blue-500">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Centipede Core Frame</p>
                    <p className="text-[9px] text-white/40 uppercase">3D Library • SLA PRINTABLE</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Box className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-xs font-semibold text-white">Servo Joint Assembly</p>
                    <p className="text-[9px] text-white/40 uppercase">3D Library • FDM PRINTABLE</p>
                  </div>
                </div>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel: Workspace */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="flex-1 flex flex-col">
            <div className="px-4 border-b border-white/5 bg-black/10 flex items-center justify-between h-12">
              <TabsList className="bg-transparent gap-4 p-0">
                <TabsTrigger 
                  value="design" 
                  className="bg-transparent border-none text-white/40 data-[state=active]:text-blue-400 font-bold uppercase tracking-widest text-[10px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400"
                >
                  3D Workspace
                </TabsTrigger>
                <TabsTrigger 
                  value="bom" 
                  className="bg-transparent border-none text-white/40 data-[state=active]:text-blue-400 font-bold uppercase tracking-widest text-[10px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400"
                >
                  Bill of Materials
                </TabsTrigger>
                <TabsTrigger 
                  value="fabrication" 
                  className="bg-transparent border-none text-white/40 data-[state=active]:text-blue-400 font-bold uppercase tracking-widest text-[10px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400"
                >
                  Fabrication & Design Files
                </TabsTrigger>
                <TabsTrigger 
                  value="code" 
                  className="bg-transparent border-none text-white/40 data-[state=active]:text-blue-400 font-bold uppercase tracking-widest text-[10px] h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-400"
                >
                  Control Code
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <RefreshCw className="w-3 h-3 mr-1" /> SYNC CLOUD
                </Button>
                <Button size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-500 text-white">
                  <ShoppingCart className="w-3 h-3 mr-1" /> EXPORT ALL
                </Button>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
              <TabsContent value="design" className="m-0 h-full">
                <div className="absolute inset-0 bg-slate-950">
                  <Canvas shadows>
                    <PerspectiveCamera makeDefault position={[5, 5, 5]} />
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
                    <Suspense fallback={null}>
                      <Stage environment="city" intensity={0.5}>
                        <PrototypePreview type={currentProject ? 'robot' : 'sphere'} />
                      </Stage>
                      <Environment preset="city" />
                    </Suspense>
                    <Grid 
                      infiniteGrid 
                      fadeDistance={30} 
                      fadeStrength={5} 
                      sectionSize={1.5} 
                      sectionColor="#3b82f6" 
                      sectionThickness={1.5} 
                      cellColor="#1e293b" 
                    />
                  </Canvas>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.glb,.obj"
                    className="hidden"
                    onChange={handleImport3DFile}
                  />

                  {/* Overlay toolbar */}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <Card className="bg-black/80 backdrop-blur-md border border-white/10 p-2 flex gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className={`h-8 w-8 transition-colors ${showLayerPanel ? 'text-blue-400 bg-blue-500/10' : 'text-white/60 hover:text-white'}`}
                        title="Layer Manager"
                        onClick={() => setShowLayerPanel(v => !v)}
                      >
                        <Layers className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className={`h-8 w-8 transition-colors ${showValidation ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/60 hover:text-white'}`}
                        title="Validation Report"
                        onClick={() => setShowValidation(v => !v)}
                      >
                        <ScanSearch className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white"><Settings2 className="w-4 h-4" /></Button>
                      <Separator orientation="vertical" className="h-8 bg-white/10" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300"><Printer className="w-4 h-4" /></Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-purple-400 hover:text-purple-300"
                        title="Import STL / GLB / OBJ and validate"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </Card>
                  </div>

                  {/* layerTick read here so React re-renders the panel on visibility toggle */}
                  {showLayerPanel && layerTick >= 0 && (
                    <div className="absolute top-4 right-4 w-64 max-h-[70%] overflow-y-auto bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-3 z-10 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Layers</span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-5 w-5 text-white/40 hover:text-white"
                            onClick={() => { layerManager.setAllVisible('all', true); setLayerTick(t => t + 1); }}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 text-white/40 hover:text-white"
                            onClick={() => { layerManager.setAllVisible('all', false); setLayerTick(t => t + 1); }}>
                            <EyeOff className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {Object.entries(
                        layerManager.getAllLayers().reduce<Record<string, Layer[]>>((acc, l) => {
                          if (!acc[l.category]) acc[l.category] = [];
                          acc[l.category].push(l);
                          return acc;
                        }, {})
                      ).map(([cat, catLayers]) => catLayers.length === 0 ? null : (
                        <div key={cat}>
                          <button
                            className="w-full text-left text-[9px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors py-1"
                            onClick={() => { layerManager.toggleCategory(cat as LayerCategory); setLayerTick((t: number) => t + 1); }}
                          >
                            {cat}
                          </button>
                          {catLayers.map(layer => (
                            <div key={layer.name} className="flex items-center gap-2 py-0.5 group">
                              <button
                                className="flex-shrink-0 w-3 h-3 rounded-sm border border-white/20"
                                style={{ backgroundColor: layer.visible ? layer.color : 'transparent' }}
                                onClick={() => { layerManager.setVisibility(layer.name, !layer.visible); setLayerTick((t: number) => t + 1); }}
                              />
                              <span className={`text-[10px] font-mono flex-1 truncate transition-colors ${layer.visible ? 'text-white/70' : 'text-white/25'}`}>
                                {layer.name}
                              </span>
                              <span className="text-[9px] text-white/20 truncate hidden group-hover:block">{layer.description}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {layerManager.getAllLayers().length === 0 && (
                        <p className="text-[10px] text-white/30 text-center py-4">Import a file or generate a project to auto-assign layers</p>
                      )}
                    </div>
                  )}

                  {/* Validation Report Panel */}
                  {showValidation && validationReport && (
                    <div className="absolute top-4 left-4 w-80 max-h-[75%] overflow-y-auto bg-black/90 backdrop-blur-md border border-white/10 rounded-xl z-10">
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          {validationReport.overallScore === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {validationReport.overallScore === 'warn' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                          {validationReport.overallScore === 'fail' && <XCircle className="w-4 h-4 text-red-400" />}
                          <span className="text-xs font-bold text-white truncate max-w-[160px]">{importedModelName}</span>
                        </div>
                        <button className="text-white/30 hover:text-white transition-colors" onClick={() => setShowValidation(false)}>✕</button>
                      </div>
                      <div className="p-3 space-y-3">
                        {/* File info */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-white/50">
                          <span>Type</span><span className="text-white/80 uppercase">{validationReport.fileType}</span>
                          <span>Size</span><span className="text-white/80">{(validationReport.fileSizeBytes / 1024).toFixed(1)} KB</span>
                          {validationReport.triangleCount && <><span>Triangles</span><span className="text-white/80">{validationReport.triangleCount.toLocaleString()}</span></>}
                          {validationReport.boundingBoxMm && (
                            <><span>Bounds</span><span className="text-white/80">{validationReport.boundingBoxMm.x.toFixed(1)}×{validationReport.boundingBoxMm.y.toFixed(1)}×{validationReport.boundingBoxMm.z.toFixed(1)} mm</span></>
                          )}
                        </div>

                        {/* File signature */}
                        <div className={`text-[10px] px-2 py-1 rounded font-mono ${validationReport.signatureCheck.mismatch ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                          {validationReport.signatureCheck.mismatch
                            ? `⚠ Signature mismatch: detected ${validationReport.signatureCheck.detectedType}`
                            : `✓ File signature valid (${validationReport.signatureCheck.detectedType})`}
                        </div>

                        {/* Errors */}
                        {validationReport.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">Errors</p>
                            {validationReport.errors.map((e, i) => (
                              <p key={i} className="text-[10px] text-red-300 flex gap-1"><XCircle className="w-3 h-3 shrink-0 mt-0.5" />{e}</p>
                            ))}
                          </div>
                        )}

                        {/* Warnings */}
                        {validationReport.warnings.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-400">Warnings</p>
                            {validationReport.warnings.map((w, i) => (
                              <p key={i} className="text-[10px] text-yellow-300 flex gap-1"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{w}</p>
                            ))}
                          </div>
                        )}

                        {/* Printability */}
                        {validationReport.printabilityNotes.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Printability</p>
                            {validationReport.printabilityNotes.map((n, i) => (
                              <p key={i} className="text-[10px] text-blue-300 flex gap-1"><Building2 className="w-3 h-3 shrink-0 mt-0.5" />{n}</p>
                            ))}
                          </div>
                        )}

                        {validationReport.overallScore === 'pass' && validationReport.errors.length === 0 && validationReport.warnings.length === 0 && (
                          <p className="text-[10px] text-emerald-400 text-center py-1">All checks passed — model looks clean</p>
                        )}
                      </div>
                    </div>
                  )}

                  {!currentProject && !isGenerating && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="max-w-md text-center p-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl animate-pulse">
                        <Box className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <h3 className="text-white/40 font-bold uppercase tracking-widest">Awaiting Generator</h3>
                        <p className="text-white/20 text-xs mt-2">Describe your hardware vision to populate the 3D studio</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="bom" className="m-0 h-full p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">Bill of Materials</h3>
                      <p className="text-sm text-white/40">Sourcing optimized for Fast Delivery & Low Cost</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={sortMode === 'fastest' ? 'default' : 'outline'} 
                        className={`text-xs ${sortMode === 'fastest' ? 'bg-blue-600' : 'bg-white/5 border-white/10 text-white'}`}
                        onClick={() => setSortMode(sortMode === 'fastest' ? 'none' : 'fastest')}
                      >
                        FASTEST SHIP
                      </Button>
                      <Button 
                        size="sm" 
                        variant={sortMode === 'cheapest' ? 'default' : 'outline'} 
                        className={`text-xs ${sortMode === 'cheapest' ? 'bg-blue-600' : 'bg-white/5 border-white/10 text-white'}`}
                        onClick={() => setSortMode(sortMode === 'cheapest' ? 'none' : 'cheapest')}
                      >
                        CHEAPEST
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {sortedParts.map((part) => (
                      <Card key={part.id} className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-black/40 rounded-lg">
                              <Package className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{part.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 text-[10px] px-1.5 py-0">{part.source}</Badge>
                                <span className="text-[10px] text-white/40 font-mono">{part.specs}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-mono text-white">${part.price.toFixed(2)}</p>
                              <p className="text-[10px] text-green-400 font-bold">{part.speed}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-4 h-4 text-white/40" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {!currentProject && (
                      <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-2xl">
                        <ListTodo className="w-12 h-12 text-white/5 mx-auto mb-4" />
                        <p className="text-white/20 text-sm font-mono tracking-widest">NO PARTS GENERATED YET</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="code" className="m-0 h-full p-4 overflow-hidden">
                <div className="h-full bg-slate-950 rounded-xl border border-white/5 flex flex-col font-mono text-xs overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="text-white/60">main_control.py</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-white/40 hover:text-white"><Copy className="w-3 h-3 mr-1" /> Copy Code</Button>
                  </div>
                  <pre className="flex-1 p-4 text-blue-300 overflow-auto">
                    {currentProject?.code || "# Awaiting project generation..."}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="fabrication" className="m-0 h-full overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-white/5 flex gap-2">
                  <Button 
                    size="sm" 
                    variant={activeDesignTab === 'openscad' ? 'default' : 'ghost'} 
                    className={`text-[10px] uppercase tracking-widest font-bold ${activeDesignTab === 'openscad' ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}
                    onClick={() => setActiveDesignTab('openscad')}
                  >
                    <Box className="w-3 h-3 mr-1.5" /> OpenSCAD (3D Parts)
                  </Button>
                  <Button 
                    size="sm" 
                    variant={activeDesignTab === 'svg' ? 'default' : 'ghost'}
                    className={`text-[10px] uppercase tracking-widest font-bold ${activeDesignTab === 'svg' ? 'bg-green-600 text-white' : 'text-white/40 hover:text-white'}`}
                    onClick={() => setActiveDesignTab('svg')}
                  >
                    <Scissors className="w-3 h-3 mr-1.5" /> SVG (Laser Cut)
                  </Button>
                  <Button 
                    size="sm" 
                    variant={activeDesignTab === 'wiring' ? 'default' : 'ghost'}
                    className={`text-[10px] uppercase tracking-widest font-bold ${activeDesignTab === 'wiring' ? 'bg-yellow-600 text-white' : 'text-white/40 hover:text-white'}`}
                    onClick={() => setActiveDesignTab('wiring')}
                  >
                    <Cable className="w-3 h-3 mr-1.5" /> Wiring Diagram
                  </Button>
                  <div className="flex-1" />
                  {currentProject && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] bg-white/5 border-white/10 text-white/60 hover:text-white"
                      onClick={() => {
                        const content = activeDesignTab === 'openscad' ? currentProject.openscadCode : 
                                       activeDesignTab === 'svg' ? currentProject.svgDesign :
                                       currentProject.wiringDiagram;
                        navigator.clipboard.writeText(content);
                        toast.success('Copied to clipboard!');
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                  )}
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <div className="h-full bg-slate-950 rounded-xl border border-white/5 flex flex-col overflow-hidden">
                    {activeDesignTab === 'openscad' && (
                      <>
                        <div className="px-4 py-2 bg-blue-500/5 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] text-blue-300 font-mono">3D Printable Parts — OpenSCAD Code</span>
                          </div>
                          <span className="text-[9px] text-white/30">Paste into OpenSCAD to generate STL files</span>
                        </div>
                        <pre className="flex-1 p-4 text-blue-300 font-mono text-xs overflow-auto whitespace-pre-wrap">
                          {currentProject?.openscadCode || '// Generate a blueprint to see OpenSCAD code for custom 3D parts\n// Each part will be a separate module you can render to STL'}
                        </pre>
                      </>
                    )}
                    {activeDesignTab === 'svg' && (
                      <>
                        <div className="px-4 py-2 bg-green-500/5 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Scissors className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-[10px] text-green-300 font-mono">Laser Cut Parts — SVG Markup</span>
                          </div>
                          <span className="text-[9px] text-white/30">Load into laser software or open in browser</span>
                        </div>
                        <pre className="flex-1 p-4 text-green-300 font-mono text-xs overflow-auto whitespace-pre-wrap">
                          {currentProject?.svgDesign || '<!-- Generate a blueprint to see SVG paths for laser-cut parts -->\n<!-- Dimensions in mm, kerf compensation included -->'}
                        </pre>
                      </>
                    )}
                    {activeDesignTab === 'wiring' && (
                      <>
                        <div className="px-4 py-2 bg-yellow-500/5 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cable className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-[10px] text-yellow-300 font-mono">Wiring Diagram — Pin Connections</span>
                          </div>
                          <span className="text-[9px] text-white/30">Every connection: component pin → wire → destination</span>
                        </div>
                        <pre className="flex-1 p-4 text-yellow-200 font-mono text-xs overflow-auto whitespace-pre-wrap">
                          {currentProject?.wiringDiagram || '# Generate a blueprint to see wiring diagram\n# Shows every pin connection for the electronics'}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
                {currentProject && currentProject.assemblySteps.length > 0 && (
                  <div className="px-4 pb-4">
                    <Card className="bg-black/40 border-white/10 p-4 max-h-48 overflow-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="w-4 h-4 text-purple-400" />
                        <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Assembly Steps</h4>
                      </div>
                      <div className="space-y-2">
                        {currentProject.assemblySteps.map((step, idx) => (
                          <div key={idx} className="flex gap-3 text-xs">
                            <span className="text-purple-400 font-mono font-bold w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                            <span className="text-white/70">{step}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Design Notes Footer */}
      {currentProject?.designNotes && (
        <div className="border-t border-white/5 px-6 py-3 bg-black/20">
          <details className="group">
            <summary className="text-[10px] font-bold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white/60 transition-colors flex items-center gap-2">
              <Wrench className="w-3 h-3" /> Design Rationale & Notes
              <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-xs text-white/50 mt-2 whitespace-pre-wrap max-h-32 overflow-auto">{currentProject.designNotes}</p>
          </details>
        </div>
      )}

      {/* Community References */}
      {currentProject?.communityRefs && currentProject.communityRefs.length > 0 && (
        <div className="border-t border-white/5 px-6 py-2 bg-black/20 flex items-center gap-3 flex-wrap">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">References:</span>
          {currentProject.communityRefs.map((ref, idx) => (
            <span key={idx} className="text-[10px] text-blue-400/60 font-mono">{ref}</span>
          ))}
        </div>
      )}
    </div>
  );
};
