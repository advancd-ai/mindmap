/**
 * Request ID middleware
 * Generates a unique ID for each request for tracking
 */

import { createMiddleware } from 'hono/factory';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export const requestId = () =>
  createMiddleware(async (c, next) => {
    const reqId = c.req.header('X-Request-ID') || `req_${nanoid()}`;
    c.set('requestId', reqId);
    c.set('startTime', Date.now());

    await next();

    // Add request ID to response headers
    c.res.headers.set('X-Request-ID', reqId);
  });

