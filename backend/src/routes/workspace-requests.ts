import { Hono } from 'hono';
import type { Env } from '../types';

const workspaceRequests = new Hono<{ Bindings: Env }>();

// Create workspace request (public)
workspaceRequests.post('/', async (c) => {
  try {
    const {
      name,
      slug,
      password,
      contactName,
      contactEmail,
      contactPhone,
      organization,
      message,
    } = await c.req.json<{
      name: string;
      slug: string;
      password: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      organization?: string;
      message?: string;
    }>();

    if (!name || !slug || !password || !contactName || !contactEmail) {
      return c.json({ error: '필수 항목을 모두 입력해주세요.' }, 400);
    }

    // Check slug uniqueness in workspaces
    const existingWorkspace = await c.env.DB.prepare(
      'SELECT id FROM workspaces WHERE slug = ?'
    )
      .bind(slug)
      .first();

    if (existingWorkspace) {
      return c.json({ error: '이미 사용 중인 URL입니다.' }, 400);
    }

    // Check slug uniqueness in pending requests
    const existingRequest = await c.env.DB.prepare(
      'SELECT id FROM workspace_requests WHERE slug = ? AND status = ?'
    )
      .bind(slug, 'pending')
      .first();

    if (existingRequest) {
      return c.json({ error: '이미 신청 대기 중인 URL입니다.' }, 400);
    }

    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      'INSERT INTO workspace_requests (id, name, slug, password, contact_name, contact_email, contact_phone, organization, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        name,
        slug,
        password,
        contactName,
        contactEmail,
        contactPhone || '',
        organization || '',
        message || '',
        'pending'
      )
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default workspaceRequests;
