import type { CadEngine, CadEngineId } from './types';

const engines = new Map<CadEngineId, CadEngine>();

export function registerEngine(engine: CadEngine): void {
  engines.set(engine.id, engine);
}

export function getEngine(id: CadEngineId): CadEngine {
  const engine = engines.get(id);
  if (!engine) throw new Error(`CAD engine not registered: ${id}`);
  return engine;
}

export function listEngines(): CadEngine[] {
  return Array.from(engines.values());
}

export function hasEngine(id: CadEngineId): boolean {
  return engines.has(id);
}
