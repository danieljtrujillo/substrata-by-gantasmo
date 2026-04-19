/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Box,
  Settings, 
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
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  transcribeSpokenPrompt
} from './services/geminiService';
import { speakText, cancelSpeech } from './services/ttsService';
import { ACMER_S1_PARAMETERS, ACMER_S1_MANUAL_SUMMARY, PROJECT_TEMPLATES, LaserSettings } from './constants';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { AdvancedEditor } from './components/AdvancedEditor';
import { PrototypingStudio } from './components/PrototypingStudio';
import { DocumentationViewer } from './components/DocumentationViewer';
import { saveProject, getProjects, deleteProject, renameProject, LaserProject } from './services/projectService';

export default function App() {
  const [activeTab, setActiveTab] = useState('engineering');
  const [engineeringMode, setEngineeringMode] = useState<'laser' | 'prototype'>('prototype');
  const [designStyle, setDesignStyle] = useState<'minimalist' | 'deconstructivist' | 'classical' | 'organic'>('minimalist');
  const [isAdvisorMuted, setIsAdvisorMuted] = useState(false);
  const [advisorExpanded, setAdvisorExpanded] = useState(false);
  const [advisorAutoPrompt, setAdvisorAutoPrompt] = useState('');
  const [isAdvancedEditorOpen, setIsAdvancedEditorOpen] = useState(false);
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

  // Firebase State
  const [user, setUser] = useState<User | null>(null);
  const [savedProjects, setSavedProjects] = useState<LaserProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProjects();
      } else {
        setSavedProjects([]);
      }
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
    setActiveTab('design');
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
    // Switch to Engineering > Prototype mode 
    setActiveTab('engineering');
    setEngineeringMode('prototype');
    setAdvisorAutoPrompt(projectDescription);
    toast.success("Blueprint generation triggered from Advisor!");
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
    <div className="min-h-screen bg-transparent text-white font-sans selection:bg-laser-accent selection:text-black">
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
      <header className="px-4 py-2 border-b border-white/5 glass-panel !rounded-none sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-laser-accent p-1 rounded shadow-[0_0_15px_rgba(0,242,255,0.4)]">
            <Layers className="text-black w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tighter leading-none text-white uppercase">SUBSTRATA</h1>
            <p className="text-[8px] font-bold tracking-[0.2em] text-laser-accent opacity-80 uppercase leading-none mt-0.5">by GANTASMO</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold leading-none">{user.displayName}</p>
                <p className="text-[10px] text-white/60 leading-none mt-1">{user.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="rounded-full overflow-hidden border border-white/10 glass-panel h-8 w-8 hover:bg-white/10">
                {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={loginWithGoogle} className="gap-2 border-white/10 glass-panel hover:bg-white/10">
              <UserIcon className="w-4 h-4" /> Sign In
            </Button>
          )}
          <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
          <Button 
            size="sm" 
            className="accent-btn shadow-[0_0_20px_rgba(0,242,255,0.3)]"
            onClick={handleSaveProject}
          >
            <Save className="w-4 h-4" /> Save Project
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="glass-panel p-0.5 h-9 rounded-lg mb-4 flex border-white/10">
              <TabsTrigger value="engineering" className="px-4 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-laser-accent data-[state=active]:shadow-inner text-white/70 text-xs">
                <Cpu className="w-3.5 h-3.5 mr-1.5" /> Engineering
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="px-4 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-laser-accent data-[state=active]:shadow-inner text-white/70 text-xs">
                <Settings className="w-3.5 h-3.5 mr-1.5" /> Maintenance
              </TabsTrigger>
              <TabsTrigger value="library" className="px-4 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-laser-accent data-[state=active]:shadow-inner text-white/70 text-xs">
                <Library className="w-3.5 h-3.5 mr-1.5" /> Library
              </TabsTrigger>
              <TabsTrigger value="docs" className="px-4 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-laser-accent data-[state=active]:shadow-inner text-white/70 text-xs">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="engineering" className="m-0 focus-visible:outline-none">
              <Tabs value={engineeringMode} onValueChange={(v: any) => setEngineeringMode(v)} className="w-full">
                <div className="flex items-center justify-between mb-4 px-1">
                   <TabsList className="bg-white/5 p-1 h-8 border border-white/5 rounded-md">
                     <TabsTrigger value="prototype" className="px-3 h-6 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-blue-600 data-[state=active]:text-white">3D Prototype</TabsTrigger>
                     <TabsTrigger value="laser" className="px-3 h-6 text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-laser-accent data-[state=active]:text-black">Laser Studio</TabsTrigger>
                   </TabsList>
                   
                   <div className="flex gap-1">
                      {['minimalist', 'deconstructivist', 'classical', 'organic'].map((s) => (
                        <button 
                          key={s}
                          onClick={() => setDesignStyle(s as any)}
                          className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all border ${designStyle === s ? (engineeringMode === 'laser' ? 'bg-laser-accent text-black border-laser-accent' : 'bg-blue-600 text-white border-blue-600') : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'}`}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                </div>

                <TabsContent value="laser" className="m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="grid gap-4">
                    <Card className="glass-panel overflow-hidden border-white/10">
                      <div className="p-4 py-4 aspect-square max-h-[480px] relative flex items-center justify-center bg-black/20 group">
                        {processedImage ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                              src={processedImage} 
                              alt="Processed" 
                              className="max-w-full max-h-full shadow-2xl rounded-sm pixelated border border-white/20" 
                              style={{ imageRendering: procOptions.dither ? 'pixelated' : 'auto' }}
                            />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => setIsAdvancedEditorOpen(true)}
                                className="bg-laser-accent/90 text-black hover:bg-laser-accent font-bold"
                              >
                                <Edit2 className="w-4 h-4 mr-1" /> Open Studio
                              </Button>
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="glass-panel h-8 w-8 hover:bg-white/20 text-laser-accent"
                                onClick={handleExportRaster}
                                title="Export PNG"
                              >
                                <FileImage className="w-4 h-4" />
                              </Button>
                                  <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="glass-panel h-8 w-8 hover:bg-white/20 text-laser-accent"
                                    onClick={handleExportVector}
                                    title="Export SVG"
                                  >
                                    <FileCode className="w-4 h-4" />
                                  </Button>
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="glass-panel h-8 w-8 hover:bg-white/20"
                                onClick={() => { setOriginalImage(null); setProcessedImage(null); }}
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="glass-panel h-8 w-8 hover:bg-white/20"
                                onClick={handleAnalyzeMaterial}
                                disabled={isAnalyzing}
                              >
                                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-laser-accent" />}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center text-white/20">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Import your design</p>
                              <p className="text-xs text-white/40">JSON, SVG, PNG or JPEG up to 10MB</p>
                            </div>
                            <div className="flex gap-2 justify-center">
                              <Button variant="outline" className="relative group overflow-hidden border-white/20 glass-panel hover:bg-white/10 text-white">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                  onChange={handleFileUpload}
                                  accept="image/*"
                                />
                                <Upload className="w-4 h-4 mr-2" /> Upload Image
                              </Button>
                               <Button 
                                onClick={() => setEngineeringMode('laser')} 
                                className="accent-btn gap-2"
                              >
                                <Sparkles className="w-4 h-4" /> AI Generate
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
                    </Card>

                    <div className="grid gap-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-laser-accent" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Generative Synthesis <span className="text-laser-accent/50 ml-2">[{designStyle}]</span></h3>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input 
                            placeholder={`e.g. A ${designStyle} wolf head stencil...`} 
                            className="glass-input h-14 pr-24 shadow-inner text-base border-white/10"
                            value={designPrompt}
                            onChange={(e) => setDesignPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                          />
                          <div className="absolute right-2 top-2 flex gap-1">
                            <Button
                               size="icon"
                               variant="ghost"
                               className={`h-10 w-10 transition-colors ${isTranscribing ? 'text-red-400 bg-red-500/10' : 'text-white/40'}`}
                               onMouseDown={startRecording}
                               onMouseUp={stopRecording}
                               onTouchStart={startRecording}
                               onTouchEnd={stopRecording}
                            >
                               {isTranscribing ? <Mic className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                            </Button>
                            <Button 
                               size="icon"
                               className="h-10 w-10 accent-btn"
                               onClick={handleGenerate}
                               disabled={isGenerating || !designPrompt}
                            >
                               {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                       <div className="flex flex-wrap gap-2">
                         <p className="text-xs text-white/40 mt-1 pr-2">Quick presets:</p>
                        {['Tribal Mask', 'Sacred Geometry', 'Minimalist Cat', 'Floral Frame'].map(p => (
                          <button 
                            key={p} 
                            onClick={() => setDesignPrompt(p)}
                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 glass-panel border-white/10 text-white/70 hover:border-laser-accent hover:text-laser-accent transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="prototype" className="m-0 h-[720px] animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
                  <PrototypingStudio designStyle={designStyle} autoPrompt={advisorAutoPrompt} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="maintenance" className="m-0">
               <MaintenanceDashboard />
            </TabsContent>

            <TabsContent value="library" className="m-0">
               <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                   <Card 
                    className="aspect-square border-dashed border-2 border-white/20 glass-panel flex flex-col items-center justify-center text-white/20 hover:text-laser-accent hover:border-laser-accent transition-colors cursor-pointer group"
                    onClick={() => {
                      setOriginalImage(null);
                      setProcessedImage(null);
                      setDesignPrompt('');
                      setActiveTab('design');
                      toast.info("Started new project");
                    }}
                   >
                      <div className="bg-white/5 p-4 rounded-full group-hover:bg-laser-accent/10 transition-colors">
                        <Plus className="w-8 h-8 text-white/20 group-hover:text-laser-accent" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest mt-4">New Project</span>
                   </Card>

                   {/* User Saved Projects */}
                   {isLoadingProjects && (
                     <div className="col-span-full flex items-center justify-center py-12">
                       <RefreshCw className="w-8 h-8 animate-spin text-laser-accent" />
                     </div>
                   )}

                   {savedProjects.map(project => (
                     <Card 
                        key={project.id} 
                        className="group overflow-hidden glass-panel border-white/10 cursor-pointer hover:shadow-cyan-500/10 transition-all relative"
                        onClick={() => loadProject(project)}
                     >
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="h-7 w-7 bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 rounded flex items-center justify-center p-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="glass-panel border-white/10 text-white min-w-40" align="end">
                                <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={(e) => { e.stopPropagation(); loadProject(project); }}>
                                  <ChevronRight className="w-3.5 h-3.5" /> Open Project
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={(e) => handleRenameProject(project.id, e)}>
                                  <Edit2 className="w-3.5 h-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={(e) => handleDuplicateProject(project, e)}>
                                  <Copy className="w-3.5 h-3.5" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-laser-accent cursor-pointer" onClick={(e) => handleShareProject(project, e)}>
                                  <ExternalLink className="w-3.5 h-3.5" /> Share Data
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem className="gap-2 focus:bg-red-500/20 text-red-300 focus:text-red-200 cursor-pointer" onClick={(e) => handleDeleteProject(project.id, e)}>
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="aspect-square relative flex items-center justify-center bg-black/20">
                           <img 
                            src={project.processedImage || project.originalImage || ''} 
                            alt={project.name} 
                            className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" 
                            referrerPolicy="no-referrer" 
                          />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Button variant="secondary" size="sm" className="bg-white/90 text-black font-bold h-8 px-4 rounded-full">Open Project</Button>
                           </div>
                        </div>
                        <div className="p-4 border-t border-white/10">
                           <div className="flex justify-between items-center mb-1">
                              <p className="text-xs font-bold uppercase tracking-tight truncate flex-1 mr-2 text-white">{project.name}</p>
                              <div className="bg-laser-accent w-1.5 h-1.5 rounded-full shadow-[0_0_5px_#00f2ff]" title="My Project" />
                           </div>
                           <p className="text-[10px] text-white/40">Saved {new Date(project.updatedAt?.toMillis ? project.updatedAt.toMillis() : Date.now()).toLocaleDateString()}</p>
                        </div>
                     </Card>
                   ))}

                    {/* Templates Section */}
                    <div className="col-span-full pt-4 pb-2 flex items-center justify-between border-t border-white/5 mt-2">
                       <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40">Stock Image Library</h3>
                      {user && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleClaimAllTemplates}
                          className="text-[10px] font-bold uppercase text-laser-accent hover:bg-laser-accent/10 h-7"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add All to My Library
                        </Button>
                      )}
                    </div>

                   {PROJECT_TEMPLATES.map(template => (
                     <Card 
                        key={template.id} 
                        className="group overflow-hidden glass-panel border-white/10 cursor-pointer hover:shadow-cyan-500/10 transition-all"
                        onClick={() => {
                          setOriginalImage(template.image);
                          setActiveTab('design');
                          toast.info(`Loaded ${template.name} template`);
                        }}
                     >
                        <div className="aspect-square relative flex items-center justify-center bg-black/20">
                           <img src={template.image} alt={template.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Button variant="secondary" size="sm" className="bg-white/90 text-black font-bold">Use Template</Button>
                           </div>
                        </div>
                        <div className="p-4 border-t border-white/10">
                           <div className="flex justify-between items-center mb-1">
                              <p className="text-xs font-bold uppercase tracking-tight text-white">{template.name}</p>
                              <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-white/50">{template.category}</span>
                           </div>
                           <p className="text-[10px] text-white/40">Click to import and customize</p>
                        </div>
                     </Card>
                   ))}
               </div>
            </TabsContent>

            <TabsContent value="docs" className="m-0">
              <DocumentationViewer />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          {engineeringMode === 'laser' ? (
            <>
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-white/40" />
                    <h3 className="font-semibold tracking-tight uppercase text-[10px] text-white/60">Laser Parameters</h3>
                  </div>
                </div>

                <div className="p-2.5 glass-panel border-white/10 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Smart Presets</Label>
                    <Select onValueChange={applySmartSettings}>
                      <SelectTrigger className="glass-input border-white/10 bg-black/20 h-9 text-xs">
                        <SelectValue placeholder="Select Material" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-white/20">
                        {Object.keys(materialPresets).map(mat => (
                          <SelectItem key={mat} value={mat} className="text-xs text-white hover:bg-white/10">{mat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium">
                            <Label className="text-white/70">Power Output</Label>
                            <span className="bg-laser-accent/10 text-laser-accent px-1.5 py-0.5 rounded font-bold border border-laser-accent/20">{laserSettings.power}%</span>
                        </div>
                        <Slider 
                            value={[laserSettings.power]} 
                            onValueChange={(val: any) => {
                              const value = Array.isArray(val) ? val[0] : val;
                              setLaserSettings(s => ({...s, power: Number(value) || 0}));
                            }}
                            max={100} 
                            step={1} 
                            className="py-2 cyan-slider"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium">
                            <Label className="text-white/70">Speed</Label>
                            <span className="bg-laser-accent/10 text-laser-accent px-1.5 py-0.5 rounded font-bold border border-laser-accent/20">{laserSettings.speed} mm/min</span>
                        </div>
                        <Slider 
                            value={[laserSettings.speed]} 
                            onValueChange={(val: any) => {
                              const value = Array.isArray(val) ? val[0] : val;
                              setLaserSettings(s => ({...s, speed: Number(value) || 0}));
                            }}
                            max={5000} 
                            step={10} 
                            className="py-2 cyan-slider"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium">
                            <Label className="text-white/70">Passes</Label>
                            <span className="bg-laser-accent/10 text-laser-accent px-1.5 py-0.5 rounded font-bold border border-laser-accent/20">{laserSettings.passes}</span>
                        </div>
                        <Slider 
                            value={[laserSettings.passes]} 
                            onValueChange={(val: any) => {
                              const value = Array.isArray(val) ? val[0] : val;
                              setLaserSettings(s => ({...s, passes: Number(value) || 0}));
                            }}
                            max={10} 
                            step={1} 
                            className="py-2 cyan-slider"
                        />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Scissors className="w-4 h-4 text-white/40" />
                  <h3 className="font-semibold tracking-tight uppercase text-[10px] text-white/60">Canvas Editing</h3>
                </div>
                
                <div className="p-3 glass-panel border-white/10 flex justify-around">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-white/10 text-white/60 hover:text-laser-accent"
                    onClick={() => setProcOptions(p => ({...p, rotate: (p.rotate + 90) % 360}))}
                    title="Rotate 90°"
                   >
                     <RotateCw className="w-4 h-4" />
                   </Button>
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 hover:bg-white/10 ${procOptions.flipH ? 'bg-laser-accent/20 text-laser-accent' : 'text-white/60'}`}
                    onClick={() => setProcOptions(p => ({...p, flipH: !p.flipH}))}
                    title="Flip Horizontal"
                   >
                     <FlipHorizontal className="w-4 h-4" />
                   </Button>
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 hover:bg-white/10 ${procOptions.flipV ? 'bg-laser-accent/20 text-laser-accent' : 'text-white/60'}`}
                    onClick={() => setProcOptions(p => ({...p, flipV: !p.flipV}))}
                    title="Flip Vertical"
                   >
                     <FlipVertical className="w-4 h-4" />
                   </Button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Cpu className="w-4 h-4 text-white/40" />
                  <h3 className="font-semibold tracking-tight uppercase text-[10px] text-white/60">Image Filters</h3>
                </div>
                
                <div className="p-3 glass-panel border-white/10 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Filter Styles</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'Draft', opts: { brightness: 0, contrast: 0.2, threshold: 128, dither: false, edgeDetection: false } },
                        { name: 'Fine Fine', opts: { brightness: -0.1, contrast: 0.3, threshold: 120, dither: true, edgeDetection: false } },
                        { name: 'Contrast Hi', opts: { brightness: 0, contrast: 0.8, threshold: 128, dither: true, edgeDetection: false } },
                        { name: 'Stencil', opts: { brightness: 0, contrast: 0.5, threshold: 150, dither: false, edgeDetection: true } },
                      ].map(style => (
                        <Button 
                          key={style.name}
                          variant="outline"
                          className="h-7 text-[9px] font-bold uppercase border-white/5 bg-black/20 hover:border-laser-accent/50"
                          onClick={() => setProcOptions(p => ({...p, ...style.opts}))}
                        >
                          {style.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-white/70">Dithering</Label>
                    <div 
                      className={`w-9 h-4.5 rounded-full transition-colors cursor-pointer flex items-center p-0.5 ${procOptions.dither ? 'bg-laser-accent' : 'bg-white/10'}`}
                      onClick={() => setProcOptions(p => ({...p, dither: !p.dither}))}
                    >
                      <motion.div 
                        animate={{ x: procOptions.dither ? 18 : 0 }} 
                        className={`w-3 h-3 rounded-full shadow-sm ${procOptions.dither ? 'bg-black' : 'bg-white'}`} 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium">
                            <Label className="text-white/70">Brightness</Label>
                            <span className="text-laser-accent font-bold">{Math.round((procOptions.brightness || 0) * 100)}%</span>
                        </div>
                        <Slider 
                            value={[procOptions.brightness || 0]} 
                            onValueChange={(val: any) => {
                              const value = Array.isArray(val) ? val[0] : val;
                              setProcOptions(s => ({...s, brightness: Number(value) || 0}));
                            }}
                            min={-1} 
                            max={1} 
                            step={0.01} 
                            className="py-2 cyan-slider"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium">
                            <Label className="text-white/70">Contrast</Label>
                            <span className="text-laser-accent font-bold">{Math.round((procOptions.contrast || 0) * 100)}%</span>
                        </div>
                        <Slider 
                            value={[procOptions.contrast || 0]} 
                            onValueChange={(val: any) => {
                              const value = Array.isArray(val) ? val[0] : val;
                              setProcOptions(s => ({...s, contrast: Number(value) || 0}));
                            }}
                            min={-1} 
                            max={1} 
                            step={0.01} 
                            className="py-2 cyan-slider"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-medium">
                            <Label className="text-white/70">Threshold</Label>
                            <span className="text-laser-accent font-bold">{procOptions.threshold ?? 128}</span>
                        </div>
                        <Slider 
                            value={[procOptions.threshold ?? 128]} 
                            onValueChange={(val: any) => {
                              const value = Array.isArray(val) ? val[0] : val;
                              setProcOptions(s => ({...s, threshold: Math.round(Number(value) || 128)}));
                            }}
                            max={255} 
                            step={1} 
                            className="py-2 cyan-slider"
                        />
                    </div>
                  </div>

                   <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-white/70">Invert Palette</Label>
                    <div 
                      className={`w-9 h-4.5 rounded-full transition-colors cursor-pointer flex items-center p-0.5 ${procOptions.invert ? 'bg-laser-accent' : 'bg-white/10'}`}
                      onClick={() => setProcOptions(p => ({...p, invert: !p.invert}))}
                    >
                      <motion.div 
                        animate={{ x: procOptions.invert ? 18 : 0 }} 
                        className={`w-3 h-3 rounded-full shadow-sm ${procOptions.invert ? 'bg-black' : 'bg-white'}`} 
                      />
                    </div>
                  </div>

                   <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-cyan-400 font-bold">Cutting Mode</Label>
                    <div 
                      className={`w-9 h-4.5 rounded-full transition-colors cursor-pointer flex items-center p-0.5 ${procOptions.edgeDetection ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,242,255,0.4)]' : 'bg-white/10'}`}
                      onClick={() => {
                          setProcOptions(p => ({...p, edgeDetection: !p.edgeDetection, dither: p.edgeDetection ? p.dither : false }));
                      }}
                    >
                      <motion.div 
                        animate={{ x: procOptions.edgeDetection ? 18 : 0 }} 
                        className={`w-3 h-3 rounded-full shadow-sm ${procOptions.edgeDetection ? 'bg-black' : 'bg-white'}`} 
                      />
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Printer className="w-4 h-4 text-white/40" />
                  <h3 className="font-semibold tracking-tight uppercase text-[10px] text-white/60">3D Machine State</h3>
                </div>
                <div className="p-3 glass-panel border-white/10 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Active Slice Profile</Label>
                    <div className="bg-blue-600/20 border border-blue-500/30 p-2.5 rounded-lg">
                      <p className="text-xs font-bold text-blue-200">Industrial High Detail</p>
                      <p className="text-[9px] text-blue-300/60 mt-0.5">0.05mm Layer • High Strength</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Sourcing Preference</Label>
                    <div className="grid grid-cols-2 gap-2">
                       <Button variant="outline" className="h-8 text-[9px] uppercase font-bold bg-white/5 border-white/10 text-white/60">Express Only</Button>
                       <Button variant="outline" className="h-8 text-[9px] uppercase font-bold bg-white/5 border-white/10 text-white/60">Local First</Button>
                    </div>
                  </div>

                  <Separator className="bg-white/5" />
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="text-[10px] font-bold text-white/40 uppercase mb-2">Build Volume Analytics</p>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-white/60">X: 130mm</span>
                       <span className="text-white/60">Y: 130mm</span>
                       <span className="text-white/60">Z: 150mm</span>
                    </div>
                  </div>
                </div>
              </section>

              <Card className="bg-blue-600 overflow-hidden border-none shadow-[0_5px_15px_rgba(59,130,246,0.2)]">
                <div className="p-3 text-white">
                   <div className="flex justify-between items-start mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[7px] font-black uppercase bg-black/10 px-1 py-0.5 rounded">GANTASMO ALPHA</span>
                   </div>
                   <p className="text-[10px] font-black leading-tight mb-0.5">Generative Strength Analysis</p>
                   <p className="text-[8px] font-bold opacity-70 mb-2 leading-tight">Optimization for {designStyle} structures.</p>
                   <Button className="w-full bg-black text-white hover:bg-black/80 font-bold h-7 text-[9px]">Run Simulation</Button>
                </div>
              </Card>
            </>
          )}
        </aside>
      </main>

      {/* Persistent Floating Advisor Panel */}
      <div className={`fixed bottom-4 right-4 z-[60] transition-all duration-300 ${advisorExpanded ? 'w-[400px] h-[520px]' : 'w-auto h-auto'}`}>
        {advisorExpanded ? (
          <div className="w-full h-full">
            <ConsultantInterface 
              isMuted={isAdvisorMuted} 
              onToggleMute={() => setIsAdvisorMuted(!isAdvisorMuted)}
              onSavePreset={handleSaveMaterialPreset}
              onBuildBlueprint={handleBuildBlueprint}
              onCollapse={() => setAdvisorExpanded(false)}
            />
          </div>
        ) : (
          <button 
            onClick={() => setAdvisorExpanded(true)} 
            className="group relative p-3.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 hover:scale-105"
          >
            <MessageSquare className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
          </button>
        )}
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
  onCollapse
}: { 
  isMuted: boolean, 
  onToggleMute: () => void,
  onSavePreset: (name: string, settings: LaserSettings) => void,
  onBuildBlueprint: (description: string) => void,
  onCollapse: () => void
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "SUBSTRATA Design Advisor online. Tell me what you want to build — I'll help you decompose it into subsystems, pick components, and design the parts. When you're ready, I'll trigger a full blueprint. What's your project idea?" }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-white/40 hover:text-white"
                onClick={onCollapse}
                title="Minimize"
            >
                <ChevronRight className="w-4 h-4 rotate-90" />
            </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-laser-accent text-black font-medium rounded-tr-none shadow-md' 
                  : 'bg-white/5 text-white border border-white/10 rounded-tl-none backdrop-blur-sm shadow-sm'
              }`}>
                {m.content}
              </div>
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
        </div>
      </ScrollArea>
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
