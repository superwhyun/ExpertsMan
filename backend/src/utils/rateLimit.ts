import type { Context } from 'hono';
import type { Env } from '../types';

interface AuthRateLimitConfig {
  key: string;
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}

interface AuthRateLimitRow {
  key: string;
  attempt_count: number;
  window_started_at: number;
  blocked_until: number;
}

export function getClientIp<E extends { Bindings: Env }>(c: Context<E>): string {
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp;
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = c.req.header('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

async function ensureRateLimitTable<E extends { Bindings: Env }>(c: Context<E>) {
  await c.env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key TEXT PRIMARY KEY,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      window_started_at INTEGER NOT NULL,
      blocked_until INTEGER NOT NULL DEFAULT 0
    )`
  ).run();
}

export async function checkAuthRateLimit<E extends { Bindings: Env }>(
  c: Context<E>,
  config: AuthRateLimitConfig
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  await ensureRateLimitTable(c);

  const now = Date.now();
  const row = await c.env.DB.prepare(
    'SELECT key, attempt_count, window_started_at, blocked_until FROM auth_rate_limits WHERE key = ?'
  )
    .bind(config.key)
    .first<AuthRateLimitRow>();

  if (!row) return { allowed: true };

  if (row.blocked_until > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((row.blocked_until - now) / 1000)),
    };
  }

  if (now - row.window_started_at > config.windowMs) {
    await c.env.DB.prepare('DELETE FROM auth_rate_limits WHERE key = ?').bind(config.key).run();
  }

  return { allowed: true };
}

export async function registerAuthFailure<E extends { Bindings: Env }>(
  c: Context<E>,
  config: AuthRateLimitConfig
): Promise<{ blockedNow: boolean; retryAfterSeconds: number }> {
  await ensureRateLimitTable(c);

  const now = Date.now();
  const row = await c.env.DB.prepare(
    'SELECT key, attempt_count, window_started_at, blocked_until FROM auth_rate_limits WHERE key = ?'
  )
    .bind(config.key)
    .first<AuthRateLimitRow>();

  if (!row || now - row.window_started_at > config.windowMs) {
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO auth_rate_limits (key, attempt_count, window_started_at, blocked_until) VALUES (?, ?, ?, ?)'
    )
      .bind(config.key, 1, now, 0)
      .run();
    return { blockedNow: false, retryAfterSeconds: 0 };
  }

  const attemptCount = row.attempt_count + 1;
  const blockedUntil = attemptCount >= config.maxAttempts ? now + config.blockMs : 0;

  await c.env.DB.prepare(
    'UPDATE auth_rate_limits SET attempt_count = ?, blocked_until = ? WHERE key = ?'
  )
    .bind(attemptCount, blockedUntil, config.key)
    .run();

  return {
    blockedNow: blockedUntil > now,
    retryAfterSeconds: blockedUntil > now ? Math.max(1, Math.ceil(config.blockMs / 1000)) : 0,
  };
}

export async function clearAuthRateLimit<E extends { Bindings: Env }>(
  c: Context<E>,
  key: string
) {
  await ensureRateLimitTable(c);
  await c.env.DB.prepare('DELETE FROM auth_rate_limits WHERE key = ?').bind(key).run();
}
