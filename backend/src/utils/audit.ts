import type { Context } from 'hono';
import type { Env } from '../types';

export interface AuditLogInput {
  actorType: 'godgod' | 'workspace' | 'system' | 'anonymous';
  actorId: string;
  workspaceId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: 'success' | 'failure';
  statusCode?: number;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function ensureAuditTable<E extends { Bindings: Env }>(c: Context<E>) {
  await c.env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actor_type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      workspace_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      result TEXT NOT NULL,
      status_code INTEGER,
      reason TEXT,
      ip TEXT,
      user_agent TEXT,
      origin TEXT,
      metadata TEXT
    )`
  ).run();
}

function getClientIp<E extends { Bindings: Env }>(c: Context<E>): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

export async function writeAuditLog<E extends { Bindings: Env }>(
  c: Context<E>,
  input: AuditLogInput
) {
  try {
    await ensureAuditTable(c);
    await c.env.DB.prepare(
      `INSERT INTO admin_audit_logs (
        id, actor_type, actor_id, workspace_id, action, target_type, target_id,
        result, status_code, reason, ip, user_agent, origin, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        input.actorType,
        input.actorId,
        input.workspaceId || null,
        input.action,
        input.targetType || null,
        input.targetId || null,
        input.result,
        input.statusCode || null,
        input.reason || null,
        getClientIp(c),
        c.req.header('user-agent') || null,
        c.req.header('origin') || null,
        input.metadata ? JSON.stringify(input.metadata) : null
      )
      .run();
  } catch (error) {
    console.error('writeAuditLog failed:', error);
  }
}
