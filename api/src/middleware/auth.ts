/**
 * Authentication middleware
 * Validates session tokens and attaches user info to context
 */

import { createMiddleware } from 'hono/factory';
import { cache } from '../lib/redis.js';
import type { User } from '../types.js';

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export const requireAuth = () =>
  createMiddleware(async (c, next) => {
    // Development mode: skip authentication
    if (process.env.DEV_MODE === 'true') {
      const devUser: User = {
        userId: 'choonho.son',
        email: 'choonho.son@example.com',
        name: 'Choonho Son',
      };
      c.set('user', devUser);
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      // Load user from session cache
      const userJson = await cache.get(`session:${token}`);
      
      if (!userJson) {
        throw new UnauthorizedError('Invalid or expired session token');
      }

      const user: User = JSON.parse(userJson);

      c.set('user', user);
      await next();
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired session token');
    }
  });
