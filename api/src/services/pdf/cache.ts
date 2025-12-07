/**
 * PDF caching service using Redis
 */

import { cache } from '../../lib/redis.js';

const CACHE_TTL = parseInt(process.env.PDF_CACHE_TTL || '3600', 10); // 1 hour default

export class PDFCache {
  async get(key: string): Promise<Buffer | null> {
    try {
      const cached = await cache.get(key);
      if (cached) {
        return Buffer.from(cached, 'base64');
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: Buffer): Promise<void> {
    try {
      await cache.put(key, value.toString('base64'), { expirationTtl: CACHE_TTL });
    } catch (error) {
      console.error('Cache set error:', error);
      // 캐시 실패는 치명적이지 않으므로 무시
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await cache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(pattern: string): Promise<void> {
    try {
      const keys = await cache.keys(`pdf:${pattern}*`);
      if (keys.length > 0) {
        await cache.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

export const pdfCache = new PDFCache();

