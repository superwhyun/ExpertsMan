import type { Context, Next } from 'hono';
import type { Env, Workspace } from '../types';
import { verifyToken } from '../utils/token';

// Extended context with workspace
export type WorkspaceContext = Context<{ Bindings: Env; Variables: { workspace: Workspace } }>;

/**
 * Require GodGod authentication
 */
export async function requireGodGod(c: Context<{ Bindings: Env }>, next: Next) {
  const token = c.req.header('x-godgod-token');

  if (!token) {
    return c.json({ error: 'GodGod 인증이 필요합니다.' }, 401);
  }

  const payload = await verifyToken(token, c.env.TOKEN_SECRET);

  if (!payload || payload.type !== 'godgod') {
    return c.json({ error: 'GodGod 토큰이 유효하지 않습니다.' }, 401);
  }

  await next();
}

/**
 * Validate workspace exists and attach to context
 */
export async function validateWorkspace(c: WorkspaceContext, next: Next) {
  const slug = c.req.param('slug');

  const workspace = await c.env.DB.prepare('SELECT * FROM workspaces WHERE slug = ?')
    .bind(slug)
    .first<Workspace>();

  if (!workspace) {
    return c.json({ error: '워크스페이스를 찾을 수 없습니다.' }, 404);
  }

  c.set('workspace', workspace);
  await next();
}

/**
 * Require workspace authentication
 */
export async function requireWorkspaceAuth(c: WorkspaceContext, next: Next) {
  const token = c.req.header('x-workspace-token');
  const slug = c.req.param('slug');

  if (!token) {
    return c.json({ error: '워크스페이스 인증이 필요합니다.' }, 401);
  }

  const payload = await verifyToken(token, c.env.TOKEN_SECRET);

  if (!payload || payload.type !== 'workspace') {
    return c.json({ error: '워크스페이스 토큰이 유효하지 않습니다.' }, 401);
  }

  if (payload.slug !== slug) {
    return c.json({ error: '다른 워크스페이스에 대한 접근 권한이 없습니다.' }, 403);
  }

  await next();
}
