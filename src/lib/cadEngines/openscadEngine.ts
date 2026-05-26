import { evaluateOpenSCAD } from '../openscadParser';
import { generateProjectBlueprint } from '../../services/geminiService';
import { registerEngine } from './registry';
import type {
  CadEngine, CadGenerationRequest, CadGenerationResult, ValidationFinding,
} from './types';

export interface OpenScadCompanionExtras {
  name: string;
  description: string;
  designNotes: string;
  parts: unknown[];
  svgDesign: string;
  wiringDiagram: string;
  assemblySteps: string[];
  code: string;
  printingFiles: string[];
  communityRefs: string[];
}

export interface OpenScadResultExtras {
  companion: OpenScadCompanionExtras;
}

const ENGINE_ID = 'openscad' as const;

export const openscadEngine: CadEngine = {
  id: ENGINE_ID,
  displayName: 'OpenSCAD (fast)',
  shortLabel: 'OpenSCAD',
  capabilities: {
    brepGeometry: false,
    exportsStep: false,
    exportsStl: false,
    exportsGlb: false,
    exportsOpenscad: true,
    featureTree: false,
    remote: false,
    notes: 'Browser-side AST evaluator. No real BRep; STL export not supported. Generates the full companion blueprint (SVG, wiring, firmware) in the same call.',
  },

  async generate(req: CadGenerationRequest): Promise<CadGenerationResult> {
    const t0 = performance.now();
    const validation: ValidationFinding[] = [];
    const logs: string[] = [];

    let blueprint;
    try {
      blueprint = await generateProjectBlueprint(
        req.prompt,
        req.designStyle ?? 'minimalist',
        req.printer ?? 'Saturn 3 Ultra (Resin)',
        req.advisorContext ?? '',
        req.referenceImage,
      );
    } catch (err: any) {
      return {
        engine: ENGINE_ID,
        ok: false,
        artifacts: [],
        validation: [{ severity: 'error', code: 'generation_failed', message: err?.message ?? String(err) }],
        logs: [`generateProjectBlueprint threw: ${err?.message ?? err}`],
        generationMs: performance.now() - t0,
      };
    }

    const source = blueprint.openscadCode ?? '';
    let primitives;
    try {
      primitives = evaluateOpenSCAD(source);
    } catch (err: any) {
      validation.push({
        severity: 'warn',
        code: 'ast_eval_failed',
        message: `AST evaluator threw, regex fallback will be used downstream: ${err?.message ?? err}`,
      });
      primitives = [];
    }

    const extras: OpenScadResultExtras = {
      companion: {
        name: blueprint.name,
        description: blueprint.description,
        designNotes: blueprint.designNotes,
        parts: blueprint.parts,
        svgDesign: blueprint.svgDesign,
        wiringDiagram: blueprint.wiringDiagram,
        assemblySteps: blueprint.assemblySteps,
        code: blueprint.code,
        printingFiles: blueprint.printingFiles,
        communityRefs: blueprint.communityRefs,
      },
    };

    return {
      engine: ENGINE_ID,
      ok: true,
      sourceCode: source,
      primitives,
      artifacts: [
        { kind: 'openscad', inline: source, bytes: source.length },
      ],
      validation,
      logs,
      generationMs: performance.now() - t0,
      extras: extras as unknown as Record<string, unknown>,
    };
  },
};

registerEngine(openscadEngine);
