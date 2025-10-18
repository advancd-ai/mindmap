/**
 * Redis client for caching
 */

import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function initRedis() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));

  await redisClient.connect();

  return redisClient;
}

export function getRedis() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

// KV-like interface to match Cloudflare Workers KV
export const cache = {
  async get(key: string): Promise<string | null> {
    const redis = getRedis();
    return await redis.get(key);
  },

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const redis = getRedis();
    if (options?.expirationTtl) {
      await redis.setEx(key, options.expirationTtl, value);
    } else {
      await redis.set(key, value);
    }
  },

  async delete(key: string): Promise<void> {
    const redis = getRedis();
    await redis.del(key);
  },
};

