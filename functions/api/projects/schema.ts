// Server-side validation for /api/projects. Untrusted client payloads must
// not flow into D1 unchecked — even if the column is opaque JSON, oversized
// or malformed blobs eat storage and break later reads.
//
// All fields are conservative: explicit unions over freeform strings, size
// caps on image data URLs, and a hard ceiling on full-payload size.

import { z } from 'zod';

/** Hard ceiling on a single project row's payload (post-stringify). 2 MiB. */
export const MAX_PROJECT_BYTES = 2 * 1024 * 1024;

/** Hard ceiling on a single image data URL. ~1.5 MiB raw. */
const MAX_IMAGE_DATA_URL = 1_500_000;

const dataUrl = z.string().max(MAX_IMAGE_DATA_URL).refine(
  (s) => s === '' || s.startsWith('data:') || /^https?:\/\//.test(s),
  'must be a data: URL, http(s) URL, or empty',
);

export const LaserSettingsSchema = z.object({
  engraved: z.boolean().optional(),
  power:    z.number().min(0).max(100).optional(),
  speed:    z.number().min(0).max(20000).optional(),
  passes:   z.number().int().min(1).max(20).optional(),
  mode:     z.enum(['M3', 'M4']).optional(),
  quality:  z.number().min(0).max(100).optional(),
  dpi:      z.number().min(72).max(1200).optional(),
}).strict();

export const ProcOptionsSchema = z.object({
  brightness:    z.number().min(-255).max(255).optional(),
  contrast:      z.number().min(-255).max(255).optional(),
  threshold:     z.number().min(0).max(255).optional(),
  dither:        z.boolean().optional(),
  invert:        z.boolean().optional(),
  edgeDetection: z.boolean().optional(),
  rotate:        z.number().int().refine(n => [0, 90, 180, 270].includes(n), 'must be 0|90|180|270').optional(),
  flipH:         z.boolean().optional(),
  flipV:         z.boolean().optional(),
}).strict();

export const ProjectCreateSchema = z.object({
  id:             z.string().min(1).max(120),
  name:           z.string().min(1).max(200),
  originalImage:  dataUrl.optional().nullable(),
  processedImage: dataUrl.optional().nullable(),
  laserSettings:  LaserSettingsSchema.optional(),
  procOptions:    ProcOptionsSchema.optional(),
}).strict();

export const ProjectUpdateSchema = z.object({
  name:           z.string().min(1).max(200).optional(),
  originalImage:  dataUrl.optional().nullable(),
  processedImage: dataUrl.optional().nullable(),
  laserSettings:  LaserSettingsSchema.optional(),
  procOptions:    ProcOptionsSchema.optional(),
}).strict();

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

/** Standard error response when validation fails. */
export function validationErrorResponse(err: z.ZodError): Response {
  return Response.json(
    {
      error: 'validation_failed',
      // Don't leak full Zod paths/values back; trim to field name + first issue.
      issues: err.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
    { status: 400 },
  );
}

/** Reject payloads whose serialized size exceeds the cap. */
export function exceedsSize(body: unknown): boolean {
  try {
    return JSON.stringify(body).length > MAX_PROJECT_BYTES;
  } catch {
    return true;
  }
}
