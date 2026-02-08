import { Hono } from 'hono';
import type { Env, Workspace, Expert, PollingSlot } from '../types';
import { generateToken } from '../utils/token';
import { validateWorkspace, requireWorkspaceAuth, type WorkspaceContext } from '../middleware/auth';

const workspaces = new Hono<{ Bindings: Env; Variables: { workspace: Workspace } }>();

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

  if (password === workspace.password) {
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
    password: workspace.password,
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

    await c.env.DB.prepare(
      'UPDATE workspaces SET password = ?, contact_email = ?, contact_phone = ?, organization = ?, sender_name = ? WHERE id = ?'
    )
      .bind(
        password || workspace.password,
        contact_email || null,
        contact_phone || null,
        organization || null,
        sender_name || null,
        workspace.id
      )
      .run();

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

      // Fetch voter passwords
      const passwordsResult = await c.env.DB.prepare(
        'SELECT voterName, password FROM voter_passwords WHERE expertId = ?'
      )
        .bind(expert.id)
        .all<{ voterName: string; password: string }>();

      const voterPasswords: Record<string, string> = {};
      passwordsResult.results.forEach((p) => {
        voterPasswords[p.voterName] = p.password;
      });

      experts.push({
        ...expert,
        pollingSlots,
        selectedSlot,
        confirmedSlots,
        voterPasswords,
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

    return c.json({
      ...expert,
      pollingSlots,
      selectedSlot,
      confirmedSlots,
    });
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
          expert.password || null,
          expert.selectedSlot ? JSON.stringify(expert.selectedSlot) : null,
          expert.confirmedSlots ? JSON.stringify(expert.confirmedSlots) : null,
          expert.id
        )
        .run();
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
          expert.password || null,
          expert.createdAt || new Date().toISOString()
        )
        .run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

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

    const existing = await c.env.DB.prepare(
      'SELECT password FROM voter_passwords WHERE expertId = ? AND voterName = ?'
    )
      .bind(id, voterName)
      .first<{ password: string }>();

    if (existing) {
      if (existing.password === password) {
        return c.json({ success: true });
      } else {
        return c.json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
      }
    } else {
      await c.env.DB.prepare(
        'INSERT INTO voter_passwords (expertId, voterName, password) VALUES (?, ?, ?)'
      )
        .bind(id, voterName, password)
        .run();

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
