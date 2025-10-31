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
      const cacheKey = `session:${token}`;
      const userJson = await cache.get(cacheKey);
      
      if (!userJson) {
        console.warn(`Session token not found in cache: ${cacheKey.substring(0, 20)}...`);
        console.warn('This usually means the session expired (24h TTL) or Redis was restarted.');
        console.warn('User needs to re-authenticate. Use POST /auth/guest for guest access.');
        throw new UnauthorizedError('Invalid or expired session token. Please log in again.');
      }

      let user: User;
      try {
        user = JSON.parse(userJson);
      } catch (parseError) {
        console.error('Failed to parse user session data:', parseError);
        throw new UnauthorizedError('Invalid session data format');
      }

      c.set('user', user);
      await next();
    } catch (error) {
      // If it's already an UnauthorizedError, rethrow it
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      
      // Log unexpected errors for debugging
      console.error('Auth middleware error:', error);
      
      // For other errors (e.g., Redis connection issues), throw a generic error
      throw new UnauthorizedError('Invalid or expired session token');
    }
  });
