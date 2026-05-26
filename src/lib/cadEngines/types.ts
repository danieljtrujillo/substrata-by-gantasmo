import type { EvaluatedPrimitive } from '../openscadParser';
import type { CadIRT } from './ir';

export type CadEngineId = 'openscad' | 'cadquery' | 'text2cad';

export type StudioMode = 'maker' | 'architecture' | 'hacker';

export interface CadGenerationRequest {
  prompt: string;
  engine: CadEngineId;
  mode: StudioMode;
  units: 'mm' | 'inch';
  designStyle?: string;
  printer?: string;
  referenceImage?: string;
  advisorContext?: string;
  constraints?: Record<string, unknown>;
}

export type ValidationSeverity = 'info' | 'warn' | 'error';

export interface ValidationFinding {
  severity: ValidationSeverity;
  code: string;
  message: string;
  partId?: string;
  featureId?: string;
}

export interface CadArtifact {
  kind: 'step' | 'stl' | 'glb' | 'obj' | 'openscad' | 'cadquery_py' | 'source';
  url?: string;
  inline?: string;
  bytes?: number;
  sha256?: string;
}

export interface CadGenerationResult {
  engine: CadEngineId;
  ok: boolean;
  ir?: CadIRT;
  sourceCode?: string;
  primitives?: EvaluatedPrimitive[];
  artifacts: CadArtifact[];
  validation: ValidationFinding[];
  logs: string[];
  warmupMs?: number;
  generationMs?: number;
  extras?: Record<string, unknown>;
}

export interface EngineCapabilities {
  brepGeometry: boolean;
  exportsStep: boolean;
  exportsStl: boolean;
  exportsGlb: boolean;
  exportsOpenscad: boolean;
  featureTree: boolean;
  remote: boolean;
  notes: string;
}

export interface CadEngine {
  id: CadEngineId;
  displayName: string;
  shortLabel: string;
  capabilities: EngineCapabilities;
  generate(req: CadGenerationRequest, signal?: AbortSignal): Promise<CadGenerationResult>;
}
