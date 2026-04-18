import React, { useState, useRef, Suspense } from 'react';
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
  Zap
} from 'lucide-react';
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
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'sonner';

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
}

interface PrototypeProject {
  id: string;
  name: string;
  description: string;
  parts: Part[];
  schematics: string;
  code: string;
  printingFiles: string[];
  status: 'ideation' | 'generating' | 'ready';
}

export const PrototypingStudio = ({ designStyle = 'minimalist' }: { designStyle?: string }) => {
  const [prompt, setPrompt] = useState('');
  const [currentProject, setCurrentProject] = useState<PrototypeProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('design');
  const [selectedPrinter, setSelectedPrinter] = useState('Saturn 3 Ultra');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const aiRef = useRef(new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

  const [sortMode, setSortMode] = useState<'fastest' | 'cheapest' | 'none'>('none');

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

  const handleGeneratePrototype = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your prototype idea");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);
    
    try {
      const response = await aiRef.current.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `You are an expert industrial designer and robotics engineer at GANTASMO. 
        Project description: ${prompt}
        Configured Primary Printer: ${selectedPrinter}
        Preferred Design Style: ${designStyle}
        
        Generate a complete prototyping blueprint. 
        Focus on ${designStyle === 'organic' ? 'fluid, natural curves and voronoi-like patterns' : 
                designStyle === 'classical' ? 'balanced, symmetrical, and ornate traditional details' : 
                designStyle === 'deconstructivist' ? 'fragmented, non-rectilinear shapes and chaotic complexity' : 
                'clean lines and stark contrast'}.

        For the BOM (parts list), provide realistic hardware components available from Amazon, McMaster-Carr, Grainger, Pololu, or Adafruit.
        In the 'printingFiles' field, list specifically named STL files needed for a ${selectedPrinter}.
        
        Return exactly as JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              parts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    source: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    speed: { type: Type.STRING, description: "One of: Today, Tomorrow, 2-3 Days, 1-Week" },
                    category: { type: Type.STRING },
                    specs: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ["name", "source", "price", "speed"]
                }
              },
              schematics: { type: Type.STRING },
              code: { type: Type.STRING },
              printingFiles: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ["name", "description", "parts", "code", "printingFiles"]
          }
        }
      });

      const data = JSON.parse(response.text);
      setGenerationProgress(80);
      
      const newProject: PrototypeProject = {
        id: `proto_${Date.now()}`,
        name: data.name,
        description: data.description,
        parts: data.parts.map((p: any) => ({ ...p, id: p.id || Math.random().toString(36).substr(2, 9) })),
        schematics: data.schematics || "Generative schematic plan initiated...",
        code: data.code,
        printingFiles: data.printingFiles || ["frame_a.stl", "housing_b.stl"],
        status: 'ready'
      };

      setCurrentProject(newProject);
      setGenerationProgress(100);
      toast.success("Prototype Blueprint Generated!");
    } catch (error) {
      console.error(error);
      toast.error("Generation failed. Please check AI settings.");
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
              onClick={handleGeneratePrototype}
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
                  Fabrication Files
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

                  {/* Overlay for 3D controls */}
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <Card className="bg-black/80 backdrop-blur-md border border-white/10 p-2 flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white"><Layers className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white"><Settings2 className="w-4 h-4" /></Button>
                      <Separator orientation="vertical" className="h-8 bg-white/10" />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300"><Printer className="w-4 h-4" /></Button>
                    </Card>
                  </div>

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

              <TabsContent value="fabrication" className="m-0 h-full p-6">
                <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <Card className="bg-black/40 border-white/10 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <FileCode className="w-5 h-5 text-orange-400" />
                      </div>
                      <h4 className="font-bold text-white">SLA Print Parameters</h4>
                    </div>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/40">LAYER HEIGHT</span>
                        <span className="text-white">0.05 mm</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/40">EXPOSURE TIME</span>
                        <span className="text-white">2.5 s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">PROJECTED TIME</span>
                        <span className="text-white">8h 42m</span>
                      </div>
                    </div>
                    <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-10 rounded-lg">
                      SEND TO SATURN 3
                    </Button>
                  </Card>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Output Files</h4>
                    {currentProject?.printingFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-3 bg-white/5 border rounded-xl transition-all cursor-pointer ${selectedFile === file ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:bg-white/10'}`}
                        onClick={() => setSelectedFile(file)}
                      >
                        <div className="flex items-center gap-3">
                          <FileJson className={`w-4 h-4 ${selectedFile === file ? 'text-blue-400' : 'text-white/40'}`} />
                          <span className={`text-sm font-medium ${selectedFile === file ? 'text-white' : 'text-white/60'}`}>{file}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 text-[10px] text-blue-400 hover:text-blue-300">PREVIEW</Button>
                          <Button size="sm" variant="ghost" className="h-8 text-[10px] text-white/40 hover:text-white">DL</Button>
                        </div>
                      </div>
                    ))}
                    {selectedFile && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-slate-900/80 border border-blue-500/30 rounded-xl font-mono text-[10px] text-blue-200/60"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="uppercase tracking-widest text-blue-400 font-bold">Virtual Inspector: {selectedFile}</span>
                          <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => setSelectedFile(null)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                        <p className="mb-1 uppercase"># SUBSTRATA GEOMETRY KERNEL</p>
                        <p className="mb-1">SOLID {selectedFile.replace('.stl', '').toUpperCase()}</p>
                        <p className="mb-1">  FACET NORMAL 0.000 0.000 1.000</p>
                        <p className="mb-1">    OUTER LOOP</p>
                        <p className="mb-1">      VERTEX 1.250 12.00 0.000</p>
                        <p className="mb-1">      VERTEX 1.450 12.50 0.000</p>
                        <p className="mb-1">      VERTEX 1.150 12.90 0.000</p>
                        <p>...</p>
                        <p className="mt-2 text-blue-400 animate-pulse">» READY FOR {selectedPrinter.toUpperCase()}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
