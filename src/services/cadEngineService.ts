import '../lib/cadEngines/openscadEngine';
import '../lib/cadEngines/remoteEngine';

import { getEngine, listEngines, hasEngine } from '../lib/cadEngines/registry';
import type {
  CadEngine, CadEngineId, CadGenerationRequest, CadGenerationResult,
} from '../lib/cadEngines/types';

export type { CadEngine, CadEngineId, CadGenerationRequest, CadGenerationResult };

export function listAvailableEngines(): CadEngine[] {
  return listEngines();
}

export function isEngineAvailable(id: CadEngineId): boolean {
  return hasEngine(id);
}

export async function generateCad(
  req: CadGenerationRequest,
  signal?: AbortSignal,
): Promise<CadGenerationResult> {
  const engine = getEngine(req.engine);
  return engine.generate(req, signal);
}

export function recommendedEngineForMode(mode: CadGenerationRequest['mode']): CadEngineId {
  if (mode === 'architecture') return 'openscad';
  return 'openscad';
}
