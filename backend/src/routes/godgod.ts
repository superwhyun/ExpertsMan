import { Hono } from 'hono';
import type { Env, Workspace, WorkspaceRequest } from '../types';
import { generateToken } from '../utils/token';
import { hashPassword, isHashedPassword } from '../utils/password';
import { writeAuditLog } from '../utils/audit';
import { runRetentionCleanup } from '../utils/retention';
import { requireGodGod } from '../middleware/auth';

const godgod = new Hono<{ Bindings: Env }>();

// GodGod authentication
godgod.post('/auth', async (c) => {
  const body = await c.req.json<{ password?: string }>();
  const inputPassword = String(body.password ?? '').trim();
  const masterPassword = String(c.env.GODGOD_PASSWORD ?? '').trim();

  if (!masterPassword) {
    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'godgod_auth',
      result: 'failure',
      statusCode: 500,
      reason: 'missing_master_password',
    });
    return c.json({ success: false, error: '서버 인증 설정이 누락되었습니다.' }, 500);
  }

  if (inputPassword === masterPassword) {
    const token = await generateToken({ type: 'godgod' }, c.env.TOKEN_SECRET, 1); // 1 hour
    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'godgod_auth',
      result: 'success',
      statusCode: 200,
    });
    return c.json({ success: true, token });
  } else {
    await writeAuditLog(c, {
      actorType: 'anonymous',
      actorId: 'unknown',
      action: 'godgod_auth',
      result: 'failure',
      statusCode: 401,
      reason: 'invalid_password',
    });
    return c.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, 401);
  }
});

// Verify GodGod token
godgod.get('/verify', requireGodGod, async (c) => {
  return c.json({ valid: true });
});

// Get all workspaces
godgod.get('/workspaces', requireGodGod, async (c) => {
  try {
    const workspaces = await c.env.DB.prepare(
      'SELECT id, name, slug, created_at FROM workspaces'
    ).all<Workspace>();

    // Get expert count for each workspace
    const result = [];
    for (const ws of workspaces.results) {
      const count = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM experts WHERE workspace_id = ?'
      )
        .bind(ws.id)
        .first<{ count: number }>();

      result.push({
        ...ws,
        expertCount: count?.count ?? 0,
      });
    }

    return c.json(result);
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Create workspace
godgod.post('/workspaces', requireGodGod, async (c) => {
  try {
    const { name, slug, password, organization, sender_name } = await c.req.json<{
      name: string;
      slug: string;
      password: string;
      organization?: string;
      sender_name?: string;
    }>();

    if (!name || !slug || !password) {
      return c.json({ error: '이름, 슬러그, 비밀번호는 필수입니다.' }, 400);
    }

    // Check slug uniqueness
    const existing = await c.env.DB.prepare('SELECT id FROM workspaces WHERE slug = ?')
      .bind(slug)
      .first();

    if (existing) {
      return c.json({ error: '이미 사용 중인 슬러그입니다.' }, 400);
    }

    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);
    await c.env.DB.prepare(
      'INSERT INTO workspaces (id, name, slug, password, organization, sender_name) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(id, name, slug, hashedPassword, organization || null, sender_name || null)
      .run();

    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'workspace_create',
      targetType: 'workspace',
      targetId: id,
      result: 'success',
      statusCode: 200,
      metadata: { slug, name },
    });

    return c.json({ success: true, id, slug });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Update workspace
godgod.put('/workspaces/:id', requireGodGod, async (c) => {
  try {
    const id = c.req.param('id');
    const { name, password } = await c.req.json<{ name?: string; password?: string }>();

    const updates: string[] = [];
    const params: string[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (password) {
      updates.push('password = ?');
      params.push(await hashPassword(password));
    }

    if (updates.length === 0) {
      return c.json({ error: '변경할 내용이 없습니다.' }, 400);
    }

    params.push(id);
    await c.env.DB.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();

    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'workspace_update',
      targetType: 'workspace',
      targetId: id,
      result: 'success',
      statusCode: 200,
      metadata: { changedName: !!name, changedPassword: !!password },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Delete workspace (cascade delete all related data)
godgod.delete('/workspaces/:id', requireGodGod, async (c) => {
  try {
    const id = c.req.param('id');

    // Get all experts in this workspace
    const experts = await c.env.DB.prepare('SELECT id FROM experts WHERE workspace_id = ?')
      .bind(id)
      .all<{ id: string }>();

    // Batch delete all related data
    const statements = [];

    for (const expert of experts.results) {
      statements.push(
        c.env.DB.prepare('DELETE FROM voter_responses WHERE expertId = ?').bind(expert.id)
      );
      statements.push(
        c.env.DB.prepare('DELETE FROM voter_passwords WHERE expertId = ?').bind(expert.id)
      );
      statements.push(
        c.env.DB.prepare('DELETE FROM polling_slots WHERE expertId = ?').bind(expert.id)
      );
    }

    statements.push(c.env.DB.prepare('DELETE FROM experts WHERE workspace_id = ?').bind(id));
    statements.push(c.env.DB.prepare('DELETE FROM workspaces WHERE id = ?').bind(id));

    await c.env.DB.batch(statements);

    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'workspace_delete',
      targetType: 'workspace',
      targetId: id,
      result: 'success',
      statusCode: 200,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get all workspace requests
godgod.get('/workspace-requests', requireGodGod, async (c) => {
  try {
    const requests = await c.env.DB.prepare(
      'SELECT * FROM workspace_requests ORDER BY created_at DESC'
    ).all<WorkspaceRequest>();

    return c.json(requests.results);
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Approve workspace request
godgod.post('/workspace-requests/:id/approve', requireGodGod, async (c) => {
  try {
    const id = c.req.param('id');

    const request = await c.env.DB.prepare('SELECT * FROM workspace_requests WHERE id = ?')
      .bind(id)
      .first<WorkspaceRequest>();

    if (!request) {
      return c.json({ error: '신청을 찾을 수 없습니다.' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ error: '이미 처리된 신청입니다.' }, 400);
    }

    // Create workspace and update request status atomically
    const workspaceId = crypto.randomUUID();
    const workspacePassword = isHashedPassword(request.password)
      ? request.password
      : await hashPassword(request.password);

    await c.env.DB.batch([
      c.env.DB.prepare(
        'INSERT INTO workspaces (id, name, slug, password, contact_email, contact_phone, organization, sender_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        workspaceId,
        request.name,
        request.slug,
        workspacePassword,
        request.contact_email || null,
        request.contact_phone || null,
        request.organization || null,
        request.sender_name || (request.organization ? `${request.organization}장` : null)
      ),
      c.env.DB.prepare(
        'UPDATE workspace_requests SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind('approved', id),
    ]);

    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'workspace_request_approve',
      targetType: 'workspace_request',
      targetId: id,
      workspaceId: workspaceId,
      result: 'success',
      statusCode: 200,
      metadata: { slug: request.slug },
    });

    return c.json({ success: true, workspaceId });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Reject workspace request
godgod.post('/workspace-requests/:id/reject', requireGodGod, async (c) => {
  try {
    const id = c.req.param('id');

    const request = await c.env.DB.prepare('SELECT * FROM workspace_requests WHERE id = ?')
      .bind(id)
      .first<WorkspaceRequest>();

    if (!request) {
      return c.json({ error: '신청을 찾을 수 없습니다.' }, 404);
    }

    if (request.status !== 'pending') {
      return c.json({ error: '이미 처리된 신청입니다.' }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE workspace_requests SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
      .bind('rejected', id)
      .run();

    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'workspace_request_reject',
      targetType: 'workspace_request',
      targetId: id,
      result: 'success',
      statusCode: 200,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Delete workspace request
godgod.delete('/workspace-requests/:id', requireGodGod, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM workspace_requests WHERE id = ?').bind(id).run();
    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'workspace_request_delete',
      targetType: 'workspace_request',
      targetId: id,
      result: 'success',
      statusCode: 200,
    });
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Run retention cleanup manually (for verification)
godgod.post('/maintenance/retention-run', requireGodGod, async (c) => {
  try {
    const summary = await runRetentionCleanup(c.env);
    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'retention_cleanup_manual',
      targetType: 'system',
      targetId: 'retention',
      result: 'success',
      statusCode: 200,
      metadata: summary,
    });
    return c.json({ success: true, summary });
  } catch (error) {
    await writeAuditLog(c, {
      actorType: 'godgod',
      actorId: 'godgod',
      action: 'retention_cleanup_manual',
      targetType: 'system',
      targetId: 'retention',
      result: 'failure',
      statusCode: 500,
      reason: (error as Error).message,
    });
    return c.json({ success: false, error: (error as Error).message }, 500);
  }
});

export default godgod;
