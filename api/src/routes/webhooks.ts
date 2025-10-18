/**
 * Webhook routes
 * Handle GitHub webhooks for push and PR events
 */

import { Hono } from 'hono';
import { cache } from '../lib/redis.js';
import type { Env } from '../types.js';

export const webhookRouter = new Hono<{ Bindings: Env }>();

/**
 * Verify GitHub webhook signature using Web Crypto API
 */
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const digest = 'sha256=' + hashHex;

  return digest === signature;
}

/**
 * POST /webhooks/github
 * Handle GitHub webhooks
 */
webhookRouter.post('/github', async (c) => {
  const signature = c.req.header('X-Hub-Signature-256');
  const event = c.req.header('X-GitHub-Event');
  const deliveryId = c.req.header('X-GitHub-Delivery');

  if (!signature || !event || !deliveryId) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'WEBHOOK_400_INVALID',
          message: 'Missing required headers',
        },
      },
      400
    );
  }

  const payload = await c.req.text();

  // Verify signature
  const isValid = await verifySignature(payload, signature, process.env.GITHUB_WEBHOOK_SECRET!);

  if (!isValid) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'WEBHOOK_401_INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      },
      401
    );
  }

  const body = JSON.parse(payload);

  console.log(`Webhook received: ${event} (${deliveryId})`);

  try {
    // Check for duplicate delivery
    const dupKey = `webhook:${deliveryId}`;
    const isDuplicate = await cache.get(dupKey);

    if (isDuplicate) {
      console.log(`Duplicate webhook delivery: ${deliveryId}`);
      return c.json({ ok: true, message: 'Duplicate delivery ignored' });
    }

    // Mark as processed (24h expiry)
    await cache.put(dupKey, '1', { expirationTtl: 86400 });

    // Handle different event types
    if (event === 'push') {
      await handlePushEvent(body, c);
    } else if (event === 'pull_request') {
      await handlePullRequestEvent(body, c);
    } else {
      console.log(`Unhandled event type: ${event}`);
    }

    return c.json({ ok: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    throw error;
  }
});

/**
 * Handle push event
 * Invalidate cache when maps/ directory changes
 */
async function handlePushEvent(body: any, c: any) {
  const ref = body.ref;
  const commits = body.commits || [];

  console.log(`Push event: ${ref}, ${commits.length} commits`);

  // Check if any commits modified maps/
  const modifiedMaps = commits.some((commit: any) => {
    const files = [...(commit.added || []), ...(commit.modified || []), ...(commit.removed || [])];
    return files.some((file: string) => file.startsWith('maps/'));
  });

  if (modifiedMaps) {
    console.log('Maps directory changed, invalidating cache');

    // Invalidate index cache
    const repo = body.repository;
    const cacheKey = `index:${repo.owner.login}:${repo.name}:latest`;
    await cache.delete(cacheKey);

    // Could also invalidate specific map caches if we track which files changed
  }
}

/**
 * Handle pull request event
 */
async function handlePullRequestEvent(body: any, c: any) {
  const action = body.action;
  const pr = body.pull_request;

  console.log(`Pull request event: ${action} #${pr.number}`);

  if (action === 'closed' && pr.merged) {
    console.log(`PR #${pr.number} merged, invalidating cache`);

    // Invalidate cache after merge
    const repo = body.repository;
    const cacheKey = `index:${repo.owner.login}:${repo.name}:latest`;
    await cache.delete(cacheKey);
  }
}

