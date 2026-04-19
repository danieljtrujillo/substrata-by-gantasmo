// GET /api/projects — List all projects for authenticated user
// POST /api/projects — Create or update a project
import type { Env, AuthenticatedData } from '../../types';

export const onRequestGet: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const userId = context.data.user.sub;
  const { results } = await context.env.DB.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  )
    .bind(userId)
    .all();

  const projects = results.map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    userId: row.user_id,
    originalImage: row.original_image,
    processedImage: row.processed_image,
    laserSettings: JSON.parse((row.laser_settings as string) || '{}'),
    procOptions: JSON.parse((row.proc_options as string) || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return Response.json(projects);
};

export const onRequestPost: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const userId = context.data.user.sub;
  const body = await context.request.json() as Record<string, unknown>;

  const id = body.id as string;
  const name = body.name as string;
  if (!id || !name) {
    return Response.json({ error: 'id and name are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const laserSettings = JSON.stringify(body.laserSettings || {});
  const procOptions = JSON.stringify(body.procOptions || {});
  const originalImage = (body.originalImage as string) || null;
  const processedImage = (body.processedImage as string) || null;

  // Check if project exists
  const existing = await context.env.DB.prepare(
    'SELECT id, user_id FROM projects WHERE id = ?'
  ).bind(id).first();

  if (existing) {
    // Verify ownership
    if (existing.user_id !== userId) {
      return Response.json({ error: 'Not your project' }, { status: 403 });
    }
    await context.env.DB.prepare(
      `UPDATE projects SET name = ?, original_image = ?, processed_image = ?,
       laser_settings = ?, proc_options = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
      .bind(name, originalImage, processedImage, laserSettings, procOptions, now, id, userId)
      .run();
  } else {
    await context.env.DB.prepare(
      `INSERT INTO projects (id, user_id, name, original_image, processed_image,
       laser_settings, proc_options, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, userId, name, originalImage, processedImage, laserSettings, procOptions, now, now)
      .run();
  }

  return Response.json({ ok: true, id });
};
