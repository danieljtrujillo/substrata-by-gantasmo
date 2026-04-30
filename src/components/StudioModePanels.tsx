// Studio-mode side panels: Library (scraper search), Hacker (KiCad export),
// Architecture (code findings + electrical schedule).
//
// Each panel is a self-contained absolute-positioned card that overlays the
// viewport. They share styling with the existing layer/validation overlays
// so the panel system feels coherent.

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search, Download, AlertTriangle, XCircle, CheckCircle2, Building2,
  Cpu, FileCode, ExternalLink, Zap, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { searchLibrary, ingestHit, type IndexedAsset } from '../lib/scraper/ingest';
import type { AssetHit, AssetKind } from '../lib/scraper/types';
import { generatePCBSchematic, type PCBSchematicResult } from '../services/geminiService';
import { emitProjectFiles } from '../lib/kicadEmit';
import { buildBom } from '../lib/circuitGraph';
import {
  checkBuilding, type BuildingCodeReport, type BuildingDescriptor, type CodeFinding,
} from '../lib/buildingCodeRules';
import {
  buildPanelSchedule, validateElectricalPlan, renderElectricalSvg,
  type ElectricalPlan, type PanelSchedule,
} from '../lib/electricalPlan';

// ── Library Panel ──────────────────────────────────────────────────────────

export const LibraryPanel: React.FC<{
  onClose: () => void;
  onUseAsBase?: (asset: IndexedAsset, buffer: ArrayBuffer) => void;
}> = ({ onClose, onUseAsBase }) => {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<AssetKind | 'any'>('any');
  const [hits, setHits] = useState<AssetHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await searchLibrary({
        query: query.trim(),
        kind: kind === 'any' ? undefined : kind,
        limit: 30,
      });
      setHits(results);
      if (results.length === 0) toast.info('No results — try a broader query');
    } catch (err: any) {
      toast.error(`Search failed: ${err?.message ?? err}`);
    } finally {
      setSearching(false);
    }
  }, [query, kind]);

  const handleImport = useCallback(async (hit: AssetHit) => {
    setBusyId(hit.sourceId);
    try {
      const { asset, buffer } = await ingestHit(hit);
      if (asset.status === 'rejected') {
        toast.error(`Rejected: ${asset.rejectionReason}`);
        return;
      }
      if (buffer && onUseAsBase) onUseAsBase(asset, buffer);
      toast.success(`Imported "${hit.title}" (${hit.licenseSPDX})`);
    } catch (err: any) {
      toast.error(`Import failed: ${err?.message ?? err}`);
    } finally {
      setBusyId(null);
    }
  }, [onUseAsBase]);

  return (
    <div className="absolute top-4 left-4 w-[420px] max-h-[80%] overflow-hidden flex flex-col bg-black/95 backdrop-blur-md border border-white/10 rounded-xl z-20">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">Library</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="px-3 py-2 border-b border-white/10 space-y-2">
        <div className="flex gap-1">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
            placeholder="Search Smithsonian + LOC HABS…"
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500/50"
          />
          <button
            onClick={runSearch}
            disabled={searching}
            className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs rounded hover:bg-amber-500/30 disabled:opacity-50"
          >
            {searching ? '…' : 'Go'}
          </button>
        </div>
        <div className="flex gap-1 text-[10px]">
          {(['any', '3d_model', 'blueprint', 'floor_plan', 'photograph'] as const).map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                kind === k ? 'bg-amber-500/20 text-amber-300' : 'text-white/40 hover:text-white/70'
              }`}
            >{k.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {hits.length === 0 && !searching && (
          <p className="text-[10px] text-white/30 text-center py-8">
            Search public-domain + CC0 sources<br />
            <span className="font-mono">Smithsonian · LOC HABS/HAER</span>
          </p>
        )}
        {hits.map(h => (
          <div key={h.sourceId} className="p-2 bg-white/5 rounded border border-white/5 hover:border-white/15 transition-colors">
            <div className="flex items-start gap-2">
              {h.thumbnailUrl && (
                <img src={h.thumbnailUrl} alt="" className="w-12 h-12 object-cover rounded bg-black/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{h.title}</p>
                <p className="text-[9px] text-white/40 truncate">{h.author ?? h.source}</p>
                <div className="flex gap-1 mt-1">
                  <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-300 rounded font-mono">{h.licenseSPDX}</span>
                  <span className="text-[9px] px-1 bg-white/10 text-white/60 rounded font-mono uppercase">{h.format}</span>
                  <span className="text-[9px] px-1 bg-white/10 text-white/60 rounded font-mono">{h.kind}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleImport(h)}
                  disabled={busyId === h.sourceId}
                  className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded hover:bg-amber-500/30 disabled:opacity-50"
                  title="Validate and import as project base"
                >
                  {busyId === h.sourceId ? '…' : 'Use'}
                </button>
                {h.sourceUrl && (
                  <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer"
                     className="px-2 py-0.5 text-white/30 hover:text-white text-[10px] text-center">
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Hacker (PCB) Panel ─────────────────────────────────────────────────────

export const HackerPanel: React.FC<{
  onClose: () => void;
  initialPrompt?: string;
}> = ({ onClose, initialPrompt = '' }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [targetMcu, setTargetMcu] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PCBSchematicResult | null>(null);

  const generate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Describe the circuit first');
      return;
    }
    setGenerating(true);
    try {
      const r = await generatePCBSchematic(prompt.trim(), {
        targetMcu: targetMcu || undefined,
      });
      setResult(r);
      if (r.hasErrors) {
        toast.warning(`Schematic generated with ${r.findings.filter(f => f.severity === 'error').length} ERC error(s)`);
      } else {
        toast.success(`Schematic ready — ${r.schematic.sheets[0]?.components.length ?? 0} parts`);
      }
    } catch (err: any) {
      toast.error(`Schematic generation failed: ${err?.message ?? err}`);
    } finally {
      setGenerating(false);
    }
  }, [prompt, targetMcu]);

  const exportKicad = useCallback(() => {
    if (!result) return;
    const { files } = emitProjectFiles(result.schematic);
    // Bundle as a single text dump the user can split, or download each file.
    // Browser-only: trigger a download per file using anchor + Blob.
    for (const [name, content] of Object.entries(files)) {
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    toast.success(`Exported ${Object.keys(files).length} KiCad files`);
  }, [result]);

  const bom = useMemo(() => result ? buildBom(result.schematic) : [], [result]);

  return (
    <div className="absolute top-4 left-4 w-[440px] max-h-[80%] overflow-hidden flex flex-col bg-black/95 backdrop-blur-md border border-amber-500/20 rounded-xl z-20">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">PCB Schematic</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="px-3 py-2 border-b border-white/10 space-y-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. ESP32 weather station: BME280 over I2C, OLED display, USB-C power, status LED"
          rows={3}
          className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500/50 resize-none"
        />
        <div className="flex gap-2">
          <input
            value={targetMcu}
            onChange={e => setTargetMcu(e.target.value)}
            placeholder="Target MCU (optional)"
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
          />
          <button
            onClick={generate}
            disabled={generating}
            className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs rounded hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-1"
          >
            <Zap className="w-3 h-3" /> {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!result && !generating && (
          <p className="text-[10px] text-white/30 text-center py-8">
            Describe a circuit to generate a KiCad-compatible schematic.<br />
            <span className="font-mono">ERC runs automatically.</span>
          </p>
        )}

        {result && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                {result.schematic.sheets[0]?.components.length ?? 0} parts · {result.schematic.sheets[0]?.nets.length ?? 0} nets
              </span>
              <button
                onClick={exportKicad}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] rounded hover:bg-emerald-500/30"
              >
                <Download className="w-3 h-3" /> KiCad
              </button>
            </div>

            {result.summary && (
              <div className="text-[10px] text-white/60 leading-relaxed">{result.summary}</div>
            )}

            {result.findings.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">ERC findings</p>
                {result.findings.map((f, i) => (
                  <p key={i} className={`text-[10px] flex gap-1 ${
                    f.severity === 'error' ? 'text-red-300' : f.severity === 'warn' ? 'text-yellow-300' : 'text-blue-300'
                  }`}>
                    {f.severity === 'error' ? <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      : f.severity === 'warn' ? <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      : <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />}
                    <span><span className="font-mono">{f.rule}</span> · {f.message}</span>
                  </p>
                ))}
              </div>
            )}

            {bom.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Bill of materials</p>
                <div className="text-[10px] font-mono">
                  {bom.map((b, i) => (
                    <div key={i} className="flex justify-between gap-2 text-white/70 py-0.5 border-b border-white/5 last:border-0">
                      <span className="text-amber-300">×{b.qty}</span>
                      <span className="flex-1 truncate">{b.value}</span>
                      <span className="text-white/30 truncate max-w-[160px]">{b.libId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Architecture Panel ─────────────────────────────────────────────────────

export const ArchitecturePanel: React.FC<{
  onClose: () => void;
  building?: BuildingDescriptor;
  electricalPlan?: ElectricalPlan;
  onElectricalSvgChange?: (svg: string | null) => void;
}> = ({ onClose, building, electricalPlan, onElectricalSvgChange }) => {
  const [tab, setTab] = useState<'code' | 'electrical'>('code');

  const codeReport: BuildingCodeReport | null = useMemo(() => {
    if (!building && !electricalPlan) return null;
    if (electricalPlan && !building) return validateElectricalPlan(electricalPlan);
    return checkBuilding(building!);
  }, [building, electricalPlan]);

  const schedule: PanelSchedule | null = useMemo(() => {
    if (!electricalPlan?.panels.length) return null;
    return buildPanelSchedule(electricalPlan.panels[0], electricalPlan);
  }, [electricalPlan]);

  const toggleElectricalOverlay = useCallback(() => {
    if (!onElectricalSvgChange) return;
    if (!electricalPlan) {
      onElectricalSvgChange(null);
      return;
    }
    const svg = renderElectricalSvg(electricalPlan, { mmPerPx: 10, widthMm: 20000, heightMm: 15000 });
    onElectricalSvgChange(svg);
    toast.success('Electrical overlay rendered');
  }, [electricalPlan, onElectricalSvgChange]);

  return (
    <div className="absolute top-4 left-4 w-[440px] max-h-[80%] overflow-hidden flex flex-col bg-black/95 backdrop-blur-md border border-emerald-500/20 rounded-xl z-20">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">Architecture Audit</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex border-b border-white/10">
        {(['code', 'electrical'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
              tab === t ? 'bg-emerald-500/10 text-emerald-300' : 'text-white/40 hover:text-white/70'
            }`}
          >{t === 'code' ? 'Code findings' : 'Electrical'}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'code' && (
          <CodeFindingsView report={codeReport} />
        )}
        {tab === 'electrical' && (
          <ElectricalView
            schedule={schedule}
            hasPlan={!!electricalPlan}
            onToggleOverlay={toggleElectricalOverlay}
          />
        )}
      </div>
    </div>
  );
};

const CodeFindingsView: React.FC<{ report: BuildingCodeReport | null }> = ({ report }) => {
  if (!report) {
    return <p className="text-[10px] text-white/30 text-center py-8">
      Generate or import an architectural project to run code checks.<br />
      <span className="font-mono">IBC 2024 · ADA 2010 · NEC 2026</span>
    </p>;
  }

  const grouped = report.findings.reduce<Record<string, CodeFinding[]>>((acc, f) => {
    if (!acc[f.standard]) acc[f.standard] = [];
    acc[f.standard].push(f);
    return acc;
  }, {});

  return (
    <>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex gap-3 font-mono">
          <span className="text-red-400">✕ {report.summary.errors}</span>
          <span className="text-yellow-400">⚠ {report.summary.warnings}</span>
          <span className="text-blue-400">ℹ {report.summary.info}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
          report.overallScore === 'pass' ? 'bg-emerald-500/20 text-emerald-300' :
          report.overallScore === 'warn' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-red-500/20 text-red-300'
        }`}>{report.overallScore}</span>
      </div>

      {report.findings.length === 0 && (
        <p className="text-[10px] text-emerald-400 text-center py-4">All code checks passed</p>
      )}

      {Object.entries(grouped).map(([std, findings]) => (
        <div key={std} className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{std}</p>
          {findings.map((f, i) => (
            <div key={i} className={`text-[10px] p-2 rounded border ${
              f.severity === 'error' ? 'border-red-500/30 bg-red-500/5' :
              f.severity === 'warn'  ? 'border-yellow-500/30 bg-yellow-500/5' :
                                       'border-blue-500/30 bg-blue-500/5'
            }`}>
              <div className="flex items-start gap-1">
                {f.severity === 'error' ? <XCircle className="w-3 h-3 shrink-0 mt-0.5 text-red-400" />
                  : f.severity === 'warn' ? <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-yellow-400" />
                  : <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-blue-400" />}
                <div className="flex-1">
                  <p className="font-mono text-[9px] text-white/40">{f.rule}</p>
                  <p className="text-white/80">{f.message}</p>
                  {f.suggested && <p className="text-white/40 mt-1 italic">→ {f.suggested}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

const ElectricalView: React.FC<{
  schedule: PanelSchedule | null;
  hasPlan: boolean;
  onToggleOverlay: () => void;
}> = ({ schedule, hasPlan, onToggleOverlay }) => {
  if (!hasPlan) {
    return <p className="text-[10px] text-white/30 text-center py-8">
      No electrical plan loaded.<br />
      <span className="font-mono">Generate or import a building project to populate.</span>
    </p>;
  }

  return (
    <>
      <button
        onClick={onToggleOverlay}
        className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] rounded hover:bg-emerald-500/30"
      >
        <FileCode className="w-3 h-3" /> Render IEC overlay on plan
      </button>

      {schedule && (
        <>
          <div className="text-[10px] text-white/70 space-y-1">
            <div className="flex justify-between"><span>Panel</span><span className="font-mono">{schedule.panel.label} · {schedule.panel.ampRating}A</span></div>
            <div className="flex justify-between"><span>Voltage</span><span className="font-mono">{schedule.panel.voltage}V</span></div>
            <div className="flex justify-between"><span>Connected</span><span className="font-mono">{schedule.totalConnectedAmps.toFixed(1)}A · {schedule.totalConnectedVA.toFixed(0)}VA</span></div>
            <div className="flex justify-between"><span>Demand (NEC 220.42)</span><span className="font-mono">{schedule.demandLoadAmps.toFixed(1)}A</span></div>
            <div className="flex justify-between"><span>Feeder utilisation</span>
              <span className={`font-mono ${schedule.feederUtilization > 0.8 ? 'text-red-300' : 'text-emerald-300'}`}>
                {(schedule.feederUtilization * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Schedule</p>
            <div className="text-[10px] font-mono">
              {schedule.rows.map((row, i) => (
                <div key={i} className="flex justify-between gap-2 py-0.5 border-b border-white/5 last:border-0">
                  <span className="text-amber-300 w-8">#{row.number}</span>
                  <span className="flex-1 truncate text-white/70">{row.description}</span>
                  <span className="text-white/40">{row.breakerAmp}A</span>
                  <span className={
                    row.load.status === 'over_100' ? 'text-red-300' :
                    row.load.status === 'over_80' ? 'text-yellow-300' :
                                                    'text-emerald-300'
                  }>
                    {(row.load.utilization * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};