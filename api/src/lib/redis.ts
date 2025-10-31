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

  redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
    // Don't crash the server on Redis errors
  });
  
  redisClient.on('connect', () => console.log('✅ Redis connected'));
  
  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
  
  redisClient.on('ready', () => {
    console.log('✅ Redis ready');
  });

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
    try {
      const redis = getRedis();
      return await redis.get(key);
    } catch (error) {
      console.error(`❌ Redis get error for key ${key}:`, error);
      // Return null on error to indicate cache miss
      return null;
    }
  },

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    try {
      const redis = getRedis();
      if (options?.expirationTtl) {
        await redis.setEx(key, options.expirationTtl, value);
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error(`❌ Redis put error for key ${key}:`, error);
      // Don't throw - cache writes are non-critical
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(key);
    } catch (error) {
      console.error(`❌ Redis delete error for key ${key}:`, error);
      // Don't throw - cache deletes are non-critical
    }
  },
};

