import type { Env } from '../types';

function toSqliteDateString(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function parseRetentionYears(value: string | undefined): number {
  const years = Number(value || 5);
  if (!Number.isFinite(years) || years <= 0) return 5;
  return Math.floor(years);
}

export async function runRetentionCleanup(env: Env) {
  const years = parseRetentionYears(env.RETENTION_YEARS);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - years * 365);
  const cutoffSql = toSqliteDateString(cutoff);

  // 1) Purge old workspace requests
  await env.DB.prepare('DELETE FROM workspace_requests WHERE datetime(created_at) < datetime(?)')
    .bind(cutoffSql)
    .run();

  // 2) Purge old experts and related rows
  const oldExperts = await env.DB.prepare(
    'SELECT id FROM experts WHERE datetime(created_at) < datetime(?)'
  )
    .bind(cutoffSql)
    .all<{ id: string }>();

  for (const expert of oldExperts.results) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM voter_responses WHERE expertId = ?').bind(expert.id),
      env.DB.prepare('DELETE FROM voter_passwords WHERE expertId = ?').bind(expert.id),
      env.DB.prepare('DELETE FROM polling_slots WHERE expertId = ?').bind(expert.id),
      env.DB.prepare('DELETE FROM experts WHERE id = ?').bind(expert.id),
    ]);
  }

  // 3) Purge old workspaces and all descendants (except protected default workspace)
  const oldWorkspaces = await env.DB.prepare(
    "SELECT id FROM workspaces WHERE id != 'default' AND datetime(created_at) < datetime(?)"
  )
    .bind(cutoffSql)
    .all<{ id: string }>();

  for (const workspace of oldWorkspaces.results) {
    const experts = await env.DB.prepare('SELECT id FROM experts WHERE workspace_id = ?')
      .bind(workspace.id)
      .all<{ id: string }>();

    for (const expert of experts.results) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM voter_responses WHERE expertId = ?').bind(expert.id),
        env.DB.prepare('DELETE FROM voter_passwords WHERE expertId = ?').bind(expert.id),
        env.DB.prepare('DELETE FROM polling_slots WHERE expertId = ?').bind(expert.id),
      ]);
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM experts WHERE workspace_id = ?').bind(workspace.id),
      env.DB.prepare('DELETE FROM workspaces WHERE id = ?').bind(workspace.id),
    ]);
  }

  return {
    retentionYears: years,
    cutoff: cutoff.toISOString(),
    deletedExperts: oldExperts.results.length,
    deletedWorkspaces: oldWorkspaces.results.length,
  };
}
