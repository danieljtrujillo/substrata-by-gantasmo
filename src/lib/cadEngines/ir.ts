import { z } from 'zod';

const Vec2 = z.tuple([z.number(), z.number()]);
const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

const Plane = z.enum(['XY', 'XZ', 'YZ']);

const SketchPrimitive = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rect'), origin: Vec2, width: z.number(), height: z.number() }),
  z.object({ kind: z.literal('circle'), center: Vec2, radius: z.number() }),
  z.object({ kind: z.literal('polygon'), points: z.array(Vec2).min(3) }),
  z.object({ kind: z.literal('slot'), p1: Vec2, p2: Vec2, width: z.number() }),
]);

const SketchFeature = z.object({
  op: z.literal('sketch'),
  id: z.string(),
  plane: Plane,
  offset: z.number().default(0),
  primitives: z.array(SketchPrimitive).min(1),
});

const ExtrudeFeature = z.object({
  op: z.literal('extrude'),
  id: z.string(),
  sketchId: z.string(),
  distance: z.number(),
  taperDeg: z.number().default(0),
  bothSides: z.boolean().default(false),
});

const RevolveFeature = z.object({
  op: z.literal('revolve'),
  id: z.string(),
  sketchId: z.string(),
  axis: z.enum(['X', 'Y', 'Z']),
  angleDeg: z.number().default(360),
});

const FilletFeature = z.object({
  op: z.literal('fillet'),
  id: z.string(),
  target: z.string(),
  radius: z.number(),
  edgeFilter: z.enum(['all', 'vertical', 'horizontal', 'top', 'bottom']).default('all'),
});

const ChamferFeature = z.object({
  op: z.literal('chamfer'),
  id: z.string(),
  target: z.string(),
  size: z.number(),
  edgeFilter: z.enum(['all', 'vertical', 'horizontal', 'top', 'bottom']).default('all'),
});

const ShellFeature = z.object({
  op: z.literal('shell'),
  id: z.string(),
  target: z.string(),
  thickness: z.number(),
  openFaces: z.array(z.enum(['top', 'bottom', 'left', 'right', 'front', 'back'])).default([]),
});

const BooleanFeature = z.object({
  op: z.literal('boolean'),
  id: z.string(),
  mode: z.enum(['union', 'difference', 'intersection']),
  targets: z.array(z.string()).min(2),
});

const PatternFeature = z.object({
  op: z.literal('pattern'),
  id: z.string(),
  target: z.string(),
  kind: z.enum(['linear', 'polar', 'grid']),
  count: z.number().int().positive(),
  spacing: Vec3.default([0, 0, 0]),
  axis: z.enum(['X', 'Y', 'Z']).default('Z'),
});

const HolePatternFeature = z.object({
  op: z.literal('holePattern'),
  id: z.string(),
  target: z.string(),
  diameter: z.number(),
  depth: z.number().optional(),
  points: z.array(Vec2).min(1),
  plane: Plane.default('XY'),
  countersink: z.object({ diameter: z.number(), depth: z.number() }).optional(),
});

const TransformFeature = z.object({
  op: z.literal('transform'),
  id: z.string(),
  target: z.string(),
  translate: Vec3.default([0, 0, 0]),
  rotateDeg: Vec3.default([0, 0, 0]),
  scale: Vec3.default([1, 1, 1]),
});

export const CadFeature = z.discriminatedUnion('op', [
  SketchFeature,
  ExtrudeFeature,
  RevolveFeature,
  FilletFeature,
  ChamferFeature,
  ShellFeature,
  BooleanFeature,
  PatternFeature,
  HolePatternFeature,
  TransformFeature,
]);

export const CadPart = z.object({
  id: z.string(),
  name: z.string(),
  material: z.string().optional(),
  color: z.string().optional(),
  features: z.array(CadFeature).min(1),
});

export const CadIR = z.object({
  units: z.enum(['mm', 'inch']).default('mm'),
  parts: z.array(CadPart).min(1),
  assemblyNotes: z.string().optional(),
});

export type CadFeatureT = z.infer<typeof CadFeature>;
export type CadPartT = z.infer<typeof CadPart>;
export type CadIRT = z.infer<typeof CadIR>;
export type SketchPrimitiveT = z.infer<typeof SketchPrimitive>;
