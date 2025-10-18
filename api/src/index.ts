/**
 * Open Mindmap API
 * Main entry point for Node.js server
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { mapsRouter } from './routes/maps.js';
import { searchRouter } from './routes/search.js';
import { webhookRouter } from './routes/webhooks.js';
import upload from './routes/upload.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { initRedis } from './lib/redis.js';
import type { Env } from './types.js';

// Load environment variables
dotenv.config();

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', requestId());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'open-mindmap-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    mode: process.env.DEV_MODE === 'true' ? 'development' : 'production',
    redis: 'connected', // Will be checked by Redis connection
  });
});

// Routes
app.route('/auth', authRouter);
app.route('/maps', mapsRouter);
app.route('/search', searchRouter);
app.route('/webhooks', webhookRouter);
app.route('/upload', upload);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    },
    404
  );
});

// Error handler
app.onError(errorHandler);

// Initialize Redis connection
const redis = await initRedis();

// Start server
const port = parseInt(process.env.PORT || '8787');
console.log(`🚀 Open Mindmap API starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server is running on http://localhost:${port}`);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

