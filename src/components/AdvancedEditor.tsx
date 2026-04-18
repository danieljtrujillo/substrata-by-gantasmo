import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text as KonvaText, Transformer, Line } from 'react-konva';
import useImage from 'use-image';
import { 
  Eraser, 
  Square, 
  Type, 
  MousePointer2, 
  Check, 
  X,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  RefreshCw,
  Scissors
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { synthesizeImageEdition } from '../services/geminiService';

interface AdvancedEditorProps {
  imageUrl: string;
  onSave: (newImageUrl: string) => void;
  onCancel: () => void;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ imageUrl, onSave, onCancel }) => {
  const [image] = useImage(imageUrl);
  const [tool, setTool] = useState<'select' | 'eraser' | 'text' | 'box'>('select');
  const [lines, setLines] = useState<any[]>([]);
  const [rects, setRects] = useState<any[]>([]);
  const [texts, setTexts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [synthPrompt, setSynthPrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  const stageRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }
  }, []);

  const handleMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();

    if (tool === 'eraser') {
      setLines([...lines, { tool, points: [pos.x, pos.y], color: '#000000', strokeWidth: 20 }]);
    } else if (tool === 'box') {
      setRects([...rects, { id: `rect-${Date.now()}`, x: pos.x, y: pos.y, width: 0, height: 0, stroke: '#00f2ff', strokeWidth: 2, fill: 'rgba(0, 242, 255, 0.1)' }]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!e.target.getStage().getPointerPosition()) return;
    
    const pos = e.target.getStage().getPointerPosition();

    if (tool === 'eraser' && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([pos.x, pos.y]);
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());
    } else if (tool === 'box' && rects.length > 0) {
      const lastRect = rects[rects.length - 1];
      lastRect.width = pos.x - lastRect.x;
      lastRect.height = pos.y - lastRect.y;
      rects.splice(rects.length - 1, 1, lastRect);
      setRects(rects.concat());
    }
  };

  const addText = () => {
    const text = prompt("Enter text:");
    if (text) {
      setTexts([...texts, { 
        id: `text-${Date.now()}`, 
        text, 
        x: dimensions.width / 2, 
        y: dimensions.height / 2,
        fontSize: 24,
        fill: '#00f2ff'
      }]);
    }
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    onSave(uri);
  };

  const handleSynthesis = async (mode: 'inpaint' | 'outpaint' | 'style') => {
    if (!synthPrompt) {
      toast.error("Please enter a prompt for synthesis");
      return;
    }
    
    setIsSynthesizing(true);
    try {
      // For inpainting, we'd ideally generate a mask from the rects/lines
      // Here we simplify by sending the stage as context
      const currentStageUri = stageRef.current.toDataURL();
      const result = await synthesizeImageEdition(mode, synthPrompt, currentStageUri);
      if (result) {
        onSave(result);
      } else {
        toast.error("Synthesis failed");
      }
    } catch (e) {
      toast.error("Neural engine error");
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/95 rounded-lg overflow-hidden border border-white/10 shadow-2xl relative">
      {isSynthesizing && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-laser-accent">
              <RefreshCw className="w-12 h-12 animate-spin" />
              <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.3em] animate-pulse">Synthesizing Substrate</p>
                  <p className="text-[10px] uppercase font-bold text-white/40 mt-1">GANTASMO Neural Core Active</p>
              </div>
          </div>
      )}

      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white/5 border-b border-white/10 gap-2">
        <div className="flex items-center gap-1">
          <Button 
            variant={tool === 'select' ? 'default' : 'ghost'} 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setTool('select')}
            title="Selection Tool"
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === 'box' ? 'default' : 'ghost'} 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setTool('box')}
            title="Select Area (Box)"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === 'eraser' ? 'default' : 'ghost'} 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setTool('eraser')}
            title="Eraser / Brush"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={addText}
            title="Add Text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => { setLines([]); setRects([]); setTexts([]); }}
            title="Clear Layers"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-[11px] font-bold uppercase">
                Cancel
            </Button>
            <Button onClick={handleExport} size="sm" className="h-8 bg-laser-accent text-black hover:bg-laser-accent/90 text-[11px] font-bold uppercase">
                <Check className="w-3 h-3 mr-1" /> Commit Changes
            </Button>
        </div>
      </div>

      {/* Editor Canvas Container */}
      <div ref={containerRef} className="flex-1 relative cursor-crosshair overflow-hidden bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center">
        <div className="shadow-2xl border border-white/5">
            <Stage
              width={dimensions.width > 800 ? 800 : dimensions.width}
              height={dimensions.height > 500 ? 500 : dimensions.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              ref={stageRef}
            >
              <Layer>
                {image && (
                  <KonvaImage
                    image={image}
                    width={dimensions.width > 800 ? 800 : dimensions.width}
                    height={dimensions.height > 500 ? 500 : dimensions.height}
                    opacity={1}
                    listening={tool === 'select' || tool === 'eraser' || tool === 'box'}
                  />
                )}
                
                {rects.map((rect, i) => (
                  <Rect
                    key={i}
                    {...rect}
                    draggable={tool === 'select'}
                  />
                ))}

                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                        line.tool === 'eraser' ? 'destination-out' : 'source-over'
                    }
                  />
                ))}

                {texts.map((text, i) => (
                  <KonvaText
                    key={i}
                    {...text}
                    draggable={tool === 'select'}
                  />
                ))}
              </Layer>
            </Stage>
        </div>

        {!image && (
            <div className="absolute inset-0 flex items-center justify-center text-white/20 uppercase tracking-widest text-xs font-bold pointer-events-none">
                Waiting for substrate...
            </div>
        )}
      </div>

      {/* Control Panel Bottom - Generative Synthesis */}
      <div className="p-3 bg-white/5 border-t border-white/10 flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2 border-r border-white/10 pr-4 shrink-0">
              <Sparkles className="w-4 h-4 text-laser-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Generative Synthesis</span>
          </div>
          
          <div className="flex-1 w-full relative">
            <Input 
                placeholder="PROMPT: Describe transformation, content to add, or style to apply..." 
                className="h-10 bg-black/40 border-white/10 text-xs pl-8 pr-4 italic"
                value={synthPrompt}
                onChange={(e) => setSynthPrompt(e.target.value)}
            />
            <Plus className="absolute left-2.5 top-3 w-3 h-3 text-white/20" />
          </div>

          <div className="flex gap-1 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSynthesis('inpaint')}
                className="h-8 border-white/10 text-[9px] font-black uppercase hover:bg-laser-accent/20 hover:text-laser-accent px-3"
              >
                Inpaint Mask
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSynthesis('outpaint')}
                className="h-8 border-white/10 text-[9px] font-black uppercase hover:bg-laser-accent/20 hover:text-laser-accent px-3"
              >
                Outpaint Edge
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSynthesis('style')}
                className="h-8 border-white/10 text-[9px] font-black uppercase hover:bg-laser-accent/20 hover:text-laser-accent px-3"
              >
                Style Transfer
              </Button>
          </div>
      </div>
    </div>
  );
};
