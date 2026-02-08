import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import godgodRoutes from './routes/godgod';
import workspacesRoutes from './routes/workspaces';
import workspaceRequestsRoutes from './routes/workspace-requests';
import { runRetentionCleanup } from './utils/retention';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      // Allow the configured origin or all origins if set to '*'
      const corsOrigin = c.env.CORS_ORIGIN;
      if (corsOrigin === '*') return '*';
      if (!origin) return corsOrigin;
      return origin === corsOrigin ? origin : corsOrigin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-GodGod-Token', 'X-Workspace-Token', 'X-Expert-Token'],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount routes
app.route('/api/godgod', godgodRoutes);
app.route('/api/workspaces', workspacesRoutes);
app.route('/api/workspace-requests', workspaceRequestsRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(
      runRetentionCleanup(env).catch((error) => {
        console.error('Retention cleanup failed:', error);
      })
    );
  },
};
