/**
 * Global error handler middleware
 */

import type { Context } from 'hono';
import type { ApiResponse } from '../types.js';

export const errorHandler = (err: Error, c: Context): Response => {
  console.error('Error:', err);

  const requestId = c.get('requestId') || 'unknown';
  const startTime = c.get('startTime') || Date.now();
  const elapsedMs = Date.now() - startTime;

  // Handle specific error types
  let status = 500;
  let code = 'SYS_500_INTERNAL';
  let message = 'An internal server error occurred';

  if (err.name === 'ValidationError') {
    status = 400;
    code = 'MAP_400_SCHEMA';
    message = err.message;
  } else if (err.name === 'NotFoundError') {
    status = 404;
    code = 'MAP_404_NOT_FOUND';
    message = err.message;
  } else if (err.name === 'ConflictError') {
    status = 409;
    code = 'MAP_409_SHA_MISMATCH';
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    code = 'AUTH_401_NO_SESSION';
    message = 'Authentication required';
  } else if (err.name === 'ForbiddenError') {
    status = 403;
    code = 'AUTH_403_ORG_DENY';
    message = 'Access denied';
  } else if (err.name === 'RateLimitError') {
    status = 429;
    code = 'GIT_429_RATE_LIMIT';
    message = 'GitHub rate limit exceeded';
  }

  const response: ApiResponse = {
    ok: false,
    error: {
      code,
      message,
      details: process.env.ENVIRONMENT === 'development' ? { stack: err.stack } : undefined,
    },
    meta: {
      requestId,
      elapsedMs,
    },
  };

  return c.json(response, status);
};

