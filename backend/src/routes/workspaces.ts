import { Hono } from 'hono';
import type { Env, Workspace, Expert, PollingSlot } from '../types';
import { generateToken, verifyToken } from '../utils/token';
import { hashPassword, isHashedPassword, verifyPassword } from '../utils/password';
import { writeAuditLog } from '../utils/audit';
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  getClientIp,
  registerAuthFailure,
} from '../utils/rateLimit';
import { validateWorkspace, requireWorkspaceAuth, type WorkspaceContext } from '../middleware/auth';

const workspaces = new Hono<{ Bindings: Env; Variables: { workspace: Workspace } }>();

function toPublicExpert(
  expert: Expert,
  pollingSlots: PollingSlot[],
  selectedSlot: PollingSlot | null,
  confirmedSlots: PollingSlot[]
) {
  return {
    id: expert.id,
    workspace_id: expert.workspace_id,
    name: expert.name,
    organization: expert.organization || null,
    position: expert.position || null,
    fee: expert.fee || null,
    status: expert.status,
    created_at: expert.created_at,
    pollingSlots,
    selectedSlot,
    confirmedSlots,
  };
}

async function requireExpertAuth(c: WorkspaceContext, expertId: string) {
  const token = c.req.header('x-expert-token');
  const workspace = c.get('workspace');

  if (!token) return false;

  const payload = await verifyToken(token, c.env.TOKEN_SECRET);
  if (!payload || payload.type !== 'expert') return false;
  if (payload.slug !== workspace.slug) return false;
  if (payload.workspaceId !== workspace.id) return false;
  if (payload.expertId !== expertId) return false;

  return true;
}

// Apply workspace validation to all routes with :slug
workspaces.use('/:slug/*', validateWorkspace);
workspaces.use('/:slug', validateWorkspace);

// Get workspace info (public)
workspaces.get('/:slug', async (c: WorkspaceContext) => {
  const workspace = c.get('workspace');
  return c.json({ id: workspace.id, name: workspace.name, slug: workspace.slug });
});

// Workspace login
workspaces.post('/:slug/auth', async (c: WorkspaceContext) => {
  const workspace = c.get('workspace');
  const { password } = await c.req.json<{ password: string }>();
  const key = `workspace:${workspace.slug}:${getClientIp(c)}`;
  const limitConfig = {
    key,
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  };

  const limit = await checkAuthRateLimit(c, limitConfig);
  if (!limit.allowed) {
    return c.json(
      { success: false, error: `로그인 시도가 너무 많습니다. ${limit.retryAfterSeconds}초 후 다시 시도하세요.` },
      429
    );
  }

  const isValidPassword = await verifyPassword(password, workspace.password);
  if (isValidPassword) {
    await writeAuditLog(c, {
      actorType: 'workspace',
      actorId: workspace.slug,
      workspaceId: workspace.id,
      action: 'workspace_auth',
      targetType: 'workspace',
      targetId: workspace.id,
      result: 'success',
      statusCode: 200,
    });
    await clearAuthRateLimit(c, key);
    if (!isHashedPassword(workspace.password)) {
      const hashed = await hashPassword(password);
      await c.env.DB.prepare('UPDATE workspaces SET password = ? WHERE id = ?')
        .bind(hashed, workspace.id)
        .run();
    }

    const token = await generateToken(
      {
        type: 'workspace',
        workspaceId: workspace.id,
        slug: workspace.slug,
      },
      c.env.TOKEN_SECRET,
      24 // 24 hours
    );

    return c.json({
      success: true,
      token,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    });
  } else {
    await writeAuditLog(c, {
      actorType: 'anonymous',
      actorId: 'unknown',
      workspaceId: workspace.id,
      action: 'workspace_auth',
      targetType: 'workspace',
      targetId: workspace.id,
      result: 'failure',
      statusCode: 401,
      reason: 'invalid_password',
    });
    const failed = await registerAuthFailure(c, limitConfig);
    if (failed.blockedNow) {
      return c.json(
        {
          success: false,
          error: `로그인 시도가 너무 많습니다. ${failed.retryAfterSeconds}초 후 다시 시도하세요.`,
        },
        429
      );
    }
    return c.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, 401);
  }
});

// Verify workspace token
workspaces.get('/:slug/verify', requireWorkspaceAuth, async (c: WorkspaceContext) => {
  const workspace = c.get('workspace');
  return c.json({
    valid: true,
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
  });
});

// Get workspace settings (requires auth)
workspaces.get('/:slug/settings', requireWorkspaceAuth, async (c: WorkspaceContext) => {
  const workspace = c.get('workspace');
  return c.json({
    password: '',
    contact_email: workspace.contact_email || '',
    contact_phone: workspace.contact_phone || '',
    organization: workspace.organization || '',
    sender_name: workspace.sender_name || '',
  });
});

// Update workspace settings (requires auth)
workspaces.put('/:slug/settings', requireWorkspaceAuth, async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');
    const { password, contact_email, contact_phone, organization, sender_name } = await c.req.json<{
      password?: string;
      contact_email?: string;
      contact_phone?: string;
      organization?: string;
      sender_name?: string;
    }>();

    const nextPassword = password ? await hashPassword(password) : workspace.password;

    await c.env.DB.prepare(
      'UPDATE workspaces SET password = ?, contact_email = ?, contact_phone = ?, organization = ?, sender_name = ? WHERE id = ?'
    )
      .bind(
        nextPassword,
        contact_email || null,
        contact_phone || null,
        organization || null,
        sender_name || null,
        workspace.id
      )
      .run();

    await writeAuditLog(c, {
      actorType: 'workspace',
      actorId: workspace.slug,
      workspaceId: workspace.id,
      action: 'workspace_settings_update',
      targetType: 'workspace',
      targetId: workspace.id,
      result: 'success',
      statusCode: 200,
      metadata: {
        changedPassword: !!password,
        changedContactEmail: typeof contact_email !== 'undefined',
        changedContactPhone: typeof contact_phone !== 'undefined',
        changedOrganization: typeof organization !== 'undefined',
        changedSenderName: typeof sender_name !== 'undefined',
      },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get workspace public info including sender_name (public - for form pages)
workspaces.get('/:slug/public-settings', async (c: WorkspaceContext) => {
  const workspace = c.get('workspace');
  return c.json({
    sender_name: workspace.sender_name || '',
  });
});

// Get all experts in workspace (requires auth)
workspaces.get('/:slug/experts', requireWorkspaceAuth, async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');

    const expertsResult = await c.env.DB.prepare(
      'SELECT * FROM experts WHERE workspace_id = ?'
    )
      .bind(workspace.id)
      .all<Expert>();

    const experts = [];

    for (const expert of expertsResult.results) {
      // Fetch slots
      const slotsResult = await c.env.DB.prepare(
        'SELECT * FROM polling_slots WHERE expertId = ?'
      )
        .bind(expert.id)
        .all<PollingSlot>();

      const pollingSlots = [];

      for (const slot of slotsResult.results) {
        const votersResult = await c.env.DB.prepare(
          'SELECT voterName FROM voter_responses WHERE slotId = ?'
        )
          .bind(slot.id)
          .all<{ voterName: string }>();

        pollingSlots.push({
          ...slot,
          voters: votersResult.results.map((v) => v.voterName),
          votes: votersResult.results.length,
        });
      }

      // Parse JSON fields
      const selectedSlot = expert.selected_slot ? JSON.parse(expert.selected_slot) : null;
      const confirmedSlots = expert.confirmed_slots
        ? JSON.parse(expert.confirmed_slots)
        : [];

      experts.push({
        ...expert,
        password: undefined,
        pollingSlots,
        selectedSlot,
        confirmedSlots,
      });
    }

    return c.json(experts);
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get single expert (public - for form/poll pages)
workspaces.get('/:slug/experts/:id', async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    const expert = await c.env.DB.prepare(
      'SELECT * FROM experts WHERE id = ? AND workspace_id = ?'
    )
      .bind(id, workspace.id)
      .first<Expert>();

    if (!expert) {
      return c.json({ error: '전문가를 찾을 수 없습니다.' }, 404);
    }

    // Fetch slots
    const slotsResult = await c.env.DB.prepare(
      'SELECT * FROM polling_slots WHERE expertId = ?'
    )
      .bind(expert.id)
      .all<PollingSlot>();

    const pollingSlots = [];

    for (const slot of slotsResult.results) {
      const votersResult = await c.env.DB.prepare(
        'SELECT voterName FROM voter_responses WHERE slotId = ?'
      )
        .bind(slot.id)
        .all<{ voterName: string }>();

      pollingSlots.push({
        ...slot,
        voters: votersResult.results.map((v) => v.voterName),
        votes: votersResult.results.length,
      });
    }

    const selectedSlot = expert.selected_slot ? JSON.parse(expert.selected_slot) : null;
    const confirmedSlots = expert.confirmed_slots
      ? JSON.parse(expert.confirmed_slots)
      : [];

    const publicSlots = pollingSlots.map((slot) => ({
      ...slot,
      voters: undefined,
    }));

    return c.json(toPublicExpert(expert, publicSlots, selectedSlot, confirmedSlots));
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Expert login for form page
workspaces.post('/:slug/experts/:id/auth', async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');
    const { password } = await c.req.json<{ password: string }>();
    const key = `expert:${workspace.slug}:${id}:${getClientIp(c)}`;
    const limitConfig = {
      key,
      maxAttempts: 5,
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    };

    const limit = await checkAuthRateLimit(c, limitConfig);
    if (!limit.allowed) {
      return c.json(
        { success: false, error: `로그인 시도가 너무 많습니다. ${limit.retryAfterSeconds}초 후 다시 시도하세요.` },
        429
      );
    }

    const expert = await c.env.DB.prepare(
      'SELECT id, password FROM experts WHERE id = ? AND workspace_id = ?'
    )
      .bind(id, workspace.id)
      .first<{ id: string; password: string | null }>();

    const isValidPassword = await verifyPassword(password, expert?.password);
    if (!expert || !expert.password || !isValidPassword) {
      const failed = await registerAuthFailure(c, limitConfig);
      if (failed.blockedNow) {
        return c.json(
          {
            success: false,
            error: `로그인 시도가 너무 많습니다. ${failed.retryAfterSeconds}초 후 다시 시도하세요.`,
          },
          429
        );
      }
      return c.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, 401);
    }

    await clearAuthRateLimit(c, key);
    if (!isHashedPassword(expert.password)) {
      const hashed = await hashPassword(password);
      await c.env.DB.prepare('UPDATE experts SET password = ? WHERE id = ?')
        .bind(hashed, expert.id)
        .run();
    }

    const token = await generateToken(
      {
        type: 'expert',
        workspaceId: workspace.id,
        slug: workspace.slug,
        expertId: expert.id,
      },
      c.env.TOKEN_SECRET,
      2 // 2 hours
    );

    return c.json({ success: true, token });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Verify expert auth token
workspaces.get('/:slug/experts/:id/verify-auth', async (c: WorkspaceContext) => {
  try {
    const id = c.req.param('id');
    const isValid = await requireExpertAuth(c, id);
    if (!isValid) {
      return c.json({ valid: false }, 401);
    }
    return c.json({ valid: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Create/Update expert
workspaces.post('/:slug/experts', requireWorkspaceAuth, async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');
    const expert = await c.req.json<Expert & { createdAt?: string }>();
    const nextPassword = expert.password
      ? isHashedPassword(expert.password)
        ? expert.password
        : await hashPassword(expert.password)
      : null;

    const existing = await c.env.DB.prepare('SELECT id FROM experts WHERE id = ?')
      .bind(expert.id)
      .first();

    if (existing) {
      await c.env.DB.prepare(
        'UPDATE experts SET name = ?, organization = ?, position = ?, email = ?, phone = ?, fee = ?, status = ?, password = ?, selected_slot = ?, confirmed_slots = ? WHERE id = ?'
      )
        .bind(
          expert.name,
          expert.organization || null,
          expert.position || null,
          expert.email || null,
          expert.phone || null,
          expert.fee || null,
          expert.status,
          nextPassword,
          expert.selectedSlot ? JSON.stringify(expert.selectedSlot) : null,
          expert.confirmedSlots ? JSON.stringify(expert.confirmedSlots) : null,
          expert.id
        )
        .run();

      await writeAuditLog(c, {
        actorType: 'workspace',
        actorId: workspace.slug,
        workspaceId: workspace.id,
        action: 'expert_update',
        targetType: 'expert',
        targetId: expert.id,
        result: 'success',
        statusCode: 200,
        metadata: { changedPassword: !!expert.password },
      });
    } else {
      await c.env.DB.prepare(
        'INSERT INTO experts (id, workspace_id, name, organization, position, email, phone, fee, status, password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          expert.id,
          workspace.id,
          expert.name,
          expert.organization || null,
          expert.position || null,
          expert.email || null,
          expert.phone || null,
          expert.fee || null,
          expert.status || 'none',
          nextPassword,
          expert.createdAt || new Date().toISOString()
        )
        .run();

      await writeAuditLog(c, {
        actorType: 'workspace',
        actorId: workspace.slug,
        workspaceId: workspace.id,
        action: 'expert_create',
        targetType: 'expert',
        targetId: expert.id,
        result: 'success',
        statusCode: 200,
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Reset expert access password (requires auth)
workspaces.post(
  '/:slug/experts/:id/reset-password',
  requireWorkspaceAuth,
  async (c: WorkspaceContext) => {
    try {
      const workspace = c.get('workspace');
      const id = c.req.param('id');
      const { password } = await c.req.json<{ password?: string }>();

      const nextPassword = String(password || '').trim();
      if (!nextPassword) {
        return c.json({ success: false, error: '비밀번호가 필요합니다.' }, 400);
      }

      const expert = await c.env.DB.prepare(
        'SELECT id FROM experts WHERE id = ? AND workspace_id = ?'
      )
        .bind(id, workspace.id)
        .first<{ id: string }>();

      if (!expert) {
        return c.json({ success: false, error: '전문가를 찾을 수 없습니다.' }, 404);
      }

      const hashed = await hashPassword(nextPassword);
      await c.env.DB.prepare('UPDATE experts SET password = ? WHERE id = ? AND workspace_id = ?')
        .bind(hashed, id, workspace.id)
        .run();

      await writeAuditLog(c, {
        actorType: 'workspace',
        actorId: workspace.slug,
        workspaceId: workspace.id,
        action: 'expert_password_reset',
        targetType: 'expert',
        targetId: id,
        result: 'success',
        statusCode: 200,
      });

      return c.json({ success: true, password: nextPassword });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 500);
    }
  }
);

// Delete expert
workspaces.delete('/:slug/experts/:id', requireWorkspaceAuth, async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');

    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM voter_responses WHERE expertId = ?').bind(id),
      c.env.DB.prepare('DELETE FROM voter_passwords WHERE expertId = ?').bind(id),
      c.env.DB.prepare('DELETE FROM polling_slots WHERE expertId = ?').bind(id),
      c.env.DB.prepare('DELETE FROM experts WHERE id = ? AND workspace_id = ?').bind(
        id,
        workspace.id
      ),
    ]);

    await writeAuditLog(c, {
      actorType: 'workspace',
      actorId: workspace.slug,
      workspaceId: workspace.id,
      action: 'expert_delete',
      targetType: 'expert',
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

// Add polling slot
workspaces.post(
  '/:slug/experts/:id/slots',
  requireWorkspaceAuth,
  async (c: WorkspaceContext) => {
    try {
      const id = c.req.param('id');
      const slot = await c.req.json<{ id: string; date: string; time: string }>();

      await c.env.DB.prepare(
        'INSERT INTO polling_slots (id, expertId, date, time, votes) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(slot.id, id, slot.date, slot.time, 0)
        .run();

      return c.json({ success: true });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 500);
    }
  }
);

// Delete polling slot
workspaces.delete(
  '/:slug/experts/:id/slots/:slotId',
  requireWorkspaceAuth,
  async (c: WorkspaceContext) => {
    try {
      const slotId = c.req.param('slotId');

      await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM voter_responses WHERE slotId = ?').bind(slotId),
        c.env.DB.prepare('DELETE FROM polling_slots WHERE id = ?').bind(slotId),
      ]);

      return c.json({ success: true });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 500);
    }
  }
);

// Verify/Set voter password (public)
workspaces.post('/:slug/experts/:id/verify-password', async (c: WorkspaceContext) => {
  try {
    const id = c.req.param('id');
    const { voterName, password } = await c.req.json<{
      voterName: string;
      password: string;
    }>();
    const normalizedName = voterName.trim().toLowerCase();
    const key = `voter:${c.req.param('slug')}:${id}:${normalizedName}:${getClientIp(c)}`;
    const limitConfig = {
      key,
      maxAttempts: 8,
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    };

    const limit = await checkAuthRateLimit(c, limitConfig);
    if (!limit.allowed) {
      return c.json(
        { success: false, message: `시도가 너무 많습니다. ${limit.retryAfterSeconds}초 후 다시 시도하세요.` },
        429
      );
    }

    const existing = await c.env.DB.prepare(
      'SELECT password FROM voter_passwords WHERE expertId = ? AND voterName = ?'
    )
      .bind(id, voterName)
      .first<{ password: string }>();

    if (existing) {
      const isValidPassword = await verifyPassword(password, existing.password);
      if (isValidPassword) {
        await clearAuthRateLimit(c, key);
        if (!isHashedPassword(existing.password)) {
          const hashed = await hashPassword(password);
          await c.env.DB.prepare(
            'UPDATE voter_passwords SET password = ? WHERE expertId = ? AND voterName = ?'
          )
            .bind(hashed, id, voterName)
            .run();
        }
        return c.json({ success: true });
      } else {
        const failed = await registerAuthFailure(c, limitConfig);
        if (failed.blockedNow) {
          return c.json(
            {
              success: false,
              message: `시도가 너무 많습니다. ${failed.retryAfterSeconds}초 후 다시 시도하세요.`,
            },
            429
          );
        }
        return c.json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
      }
    } else {
      const hashed = await hashPassword(password);
      await c.env.DB.prepare(
        'INSERT INTO voter_passwords (expertId, voterName, password) VALUES (?, ?, ?)'
      )
        .bind(id, voterName, hashed)
        .run();

      await clearAuthRateLimit(c, key);
      return c.json({ success: true, isNew: true });
    }
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Submit member votes (public)
workspaces.post('/:slug/experts/:id/vote', async (c: WorkspaceContext) => {
  try {
    const id = c.req.param('id');
    const { voterName, selectedSlotIds } = await c.req.json<{
      voterName: string;
      selectedSlotIds: string[];
    }>();

    const expert = await c.env.DB.prepare('SELECT status FROM experts WHERE id = ?')
      .bind(id)
      .first<{ status: string }>();

    if (expert?.status === 'confirmed' || expert?.status === 'registered') {
      return c.json({ error: '투표가 마감되었습니다.' }, 400);
    }

    // Delete existing votes and insert new ones atomically
    const statements = [
      c.env.DB.prepare('DELETE FROM voter_responses WHERE expertId = ? AND voterName = ?').bind(
        id,
        voterName
      ),
      ...selectedSlotIds.map((slotId) =>
        c.env.DB.prepare(
          'INSERT INTO voter_responses (expertId, voterName, slotId) VALUES (?, ?, ?)'
        ).bind(id, voterName, slotId)
      ),
    ];

    await c.env.DB.batch(statements);

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Start polling
workspaces.post(
  '/:slug/experts/:id/start-polling',
  requireWorkspaceAuth,
  async (c: WorkspaceContext) => {
    try {
      const id = c.req.param('id');
      await c.env.DB.prepare('UPDATE experts SET status = ? WHERE id = ?')
        .bind('polling', id)
        .run();

      return c.json({ success: true });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 500);
    }
  }
);

// Confirm slots
workspaces.post(
  '/:slug/experts/:id/confirm',
  requireWorkspaceAuth,
  async (c: WorkspaceContext) => {
    try {
      const id = c.req.param('id');
      const { slotIds } = await c.req.json<{ slotIds: string[] }>();

      if (!slotIds || slotIds.length === 0) {
        return c.json({ error: '선택된 슬롯이 없습니다.' }, 400);
      }

      // Build placeholders for IN clause
      const placeholders = slotIds.map(() => '?').join(',');
      const slots = await c.env.DB.prepare(
        `SELECT id, date, time FROM polling_slots WHERE expertId = ? AND id IN (${placeholders})`
      )
        .bind(id, ...slotIds)
        .all<{ id: string; date: string; time: string }>();

      await c.env.DB.prepare(
        'UPDATE experts SET status = ?, confirmed_slots = ? WHERE id = ?'
      )
        .bind('confirmed', JSON.stringify(slots.results), id)
        .run();

      return c.json({ success: true, confirmedSlots: slots.results });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 500);
    }
  }
);

// Reset confirmation
workspaces.post(
  '/:slug/experts/:id/reset-confirmation',
  requireWorkspaceAuth,
  async (c: WorkspaceContext) => {
    try {
      const id = c.req.param('id');

      await c.env.DB.prepare(
        'UPDATE experts SET status = ?, confirmed_slots = NULL, selected_slot = NULL WHERE id = ?'
      )
        .bind('polling', id)
        .run();

      return c.json({ success: true });
    } catch (error) {
      console.error(error);
      return c.json({ error: (error as Error).message }, 500);
    }
  }
);

// Select expert slot (public)
workspaces.post('/:slug/experts/:id/select-slot', async (c: WorkspaceContext) => {
  try {
    const workspace = c.get('workspace');
    const id = c.req.param('id');
    const isAuthorized = await requireExpertAuth(c, id);
    if (!isAuthorized) {
      return c.json({ error: '전문가 인증이 필요합니다.' }, 401);
    }
    const { slot } = await c.req.json<{ slot: PollingSlot }>();

    if (!slot) {
      return c.json({ error: '슬롯 정보가 없습니다.' }, 400);
    }

    const expert = await c.env.DB.prepare(
      'SELECT * FROM experts WHERE id = ? AND workspace_id = ?'
    )
      .bind(id, workspace.id)
      .first();

    if (!expert) {
      return c.json({ error: '전문가를 찾을 수 없습니다.' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE experts SET status = ?, selected_slot = ? WHERE id = ? AND workspace_id = ?'
    )
      .bind('registered', JSON.stringify(slot), id, workspace.id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('select-slot error:', error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Expert marks no available schedule (public)
workspaces.post('/:slug/experts/:id/no-available-schedule', async (c: WorkspaceContext) => {
  try {
    const id = c.req.param('id');
    const isAuthorized = await requireExpertAuth(c, id);
    if (!isAuthorized) {
      return c.json({ error: '전문가 인증이 필요합니다.' }, 401);
    }

    await c.env.DB.prepare('UPDATE experts SET status = ? WHERE id = ?')
      .bind('unavailable', id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default workspaces;
