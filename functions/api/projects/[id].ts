// PUT /api/projects/:id — Update project (rename or full update)
// DELETE /api/projects/:id — Delete project
import type { Env, AuthenticatedData } from '../../types';

export const onRequestPut: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const userId = context.data.user.sub;
  const projectId = context.params.id as string;

  // Verify ownership
  const existing = await context.env.DB.prepare(
    'SELECT user_id FROM projects WHERE id = ?'
  ).bind(projectId).first();

  if (!existing) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }
  if (existing.user_id !== userId) {
    return Response.json({ error: 'Not your project' }, { status: 403 });
  }

  const body = await context.request.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  // Support partial updates (rename only sends name)
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.originalImage !== undefined) {
    updates.push('original_image = ?');
    values.push(body.originalImage);
  }
  if (body.processedImage !== undefined) {
    updates.push('processed_image = ?');
    values.push(body.processedImage);
  }
  if (body.laserSettings !== undefined) {
    updates.push('laser_settings = ?');
    values.push(JSON.stringify(body.laserSettings));
  }
  if (body.procOptions !== undefined) {
    updates.push('proc_options = ?');
    values.push(JSON.stringify(body.procOptions));
  }

  values.push(projectId, userId);

  await context.env.DB.prepare(
    `UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env, string, AuthenticatedData> = async (context) => {
  const userId = context.data.user.sub;
  const projectId = context.params.id as string;

  const result = await context.env.DB.prepare(
    'DELETE FROM projects WHERE id = ? AND user_id = ?'
  )
    .bind(projectId, userId)
    .run();

  if (!result.meta.changes) {
    return Response.json({ error: 'Project not found or not yours' }, { status: 404 });
  }

  return Response.json({ ok: true });
};
