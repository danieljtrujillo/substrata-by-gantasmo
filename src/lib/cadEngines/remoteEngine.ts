import { registerEngine } from './registry';
import type {
  CadEngine, CadEngineId, CadGenerationRequest, CadGenerationResult,
  EngineCapabilities, ValidationFinding,
} from './types';

interface RemoteWorkerResponse {
  engine: CadEngineId;
  ok: boolean;
  ir?: unknown;
  sourceCode?: string;
  artifacts?: Array<{ kind: string; url?: string; inline?: string; bytes?: number; sha256?: string }>;
  validation?: ValidationFinding[];
  logs?: string[];
  warmupMs?: number;
  generationMs?: number;
}

async function callWorker(req: CadGenerationRequest, signal?: AbortSignal): Promise<CadGenerationResult> {
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch('/api/cad/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(req),
      signal,
    });
  } catch (err: any) {
    return {
      engine: req.engine,
      ok: false,
      artifacts: [],
      validation: [{ severity: 'error', code: 'network_error', message: err?.message ?? 'fetch failed' }],
      logs: [`network error: ${err?.message ?? err}`],
      generationMs: performance.now() - t0,
    };
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const message = detail?.message ?? `worker returned ${res.status}`;
    return {
      engine: req.engine,
      ok: false,
      artifacts: [],
      validation: [{ severity: 'error', code: detail?.code ?? `http_${res.status}`, message }],
      logs: [`HTTP ${res.status}: ${message}`],
      generationMs: performance.now() - t0,
    };
  }

  const body = (await res.json()) as RemoteWorkerResponse;
  return {
    engine: req.engine,
    ok: body.ok ?? true,
    ir: body.ir as CadGenerationResult['ir'],
    sourceCode: body.sourceCode,
    artifacts: (body.artifacts ?? []).map(a => ({
      kind: a.kind as CadGenerationResult['artifacts'][number]['kind'],
      url: a.url,
      inline: a.inline,
      bytes: a.bytes,
      sha256: a.sha256,
    })),
    validation: body.validation ?? [],
    logs: body.logs ?? [],
    warmupMs: body.warmupMs,
    generationMs: body.generationMs ?? (performance.now() - t0),
  };
}

const cadqueryCaps: EngineCapabilities = {
  brepGeometry: true,
  exportsStep: true,
  exportsStl: true,
  exportsGlb: true,
  exportsOpenscad: false,
  featureTree: true,
  remote: true,
  notes: 'Robust BRep CAD via CadQuery + OpenCASCADE on the Python worker. Generates a SUBSTRATA CAD IR and transpiles to CadQuery; returns STEP/STL/GLB.',
};

const text2cadCaps: EngineCapabilities = {
  brepGeometry: true,
  exportsStep: true,
  exportsStl: true,
  exportsGlb: false,
  exportsOpenscad: false,
  featureTree: false,
  remote: true,
  notes: 'Text2CAD (NeurIPS 2024) sequential CAD model. GPU function; first call after idle warms the checkpoint (10-30s). Single mechanical part output.',
};

export const cadqueryEngine: CadEngine = {
  id: 'cadquery',
  displayName: 'CadQuery (robust BRep)',
  shortLabel: 'CadQuery',
  capabilities: cadqueryCaps,
  generate: (req, signal) => callWorker(req, signal),
};

export const text2cadEngine: CadEngine = {
  id: 'text2cad',
  displayName: 'Text2CAD (research)',
  shortLabel: 'Text2CAD',
  capabilities: text2cadCaps,
  generate: (req, signal) => callWorker(req, signal),
};

registerEngine(cadqueryEngine);
registerEngine(text2cadEngine);
