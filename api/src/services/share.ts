/**
 * Share service for managing map sharing
 */

import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { cache } from '../lib/redis.js';
import type { ShareInfo, ShareConfig } from '../types.js';

// Re-export for convenience
export type { ShareInfo, ShareConfig };

const SHARE_TOKEN_PREFIX = 'share_';
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure share token
 */
function generateShareToken(): string {
  // Generate URL-safe random string
  const randomBytes = nanoid(TOKEN_LENGTH);
  return `${SHARE_TOKEN_PREFIX}${randomBytes}`;
}

/**
 * Get share info from cache
 */
export async function getShareInfo(token: string): Promise<ShareInfo | null> {
  const cacheKey = `share:token:${token}`;
  const shareJson = await cache.get(cacheKey);
  
  if (!shareJson) {
    return null;
  }

  try {
    return JSON.parse(shareJson) as ShareInfo;
  } catch (error) {
    console.error('Failed to parse share info:', error);
    return null;
  }
}

/**
 * Get share token for a map (reverse lookup)
 */
export async function getShareTokenByMapId(mapId: string): Promise<string | null> {
  const cacheKey = `share:map:${mapId}`;
  return await cache.get(cacheKey);
}

/**
 * Create or update share configuration
 */
export async function createOrUpdateShare(
  mapId: string,
  userId: string,
  userEmail: string,
  config: ShareConfig
): Promise<ShareInfo> {
  // Check if share already exists
  const existingToken = await getShareTokenByMapId(mapId);
  let token = existingToken;
  let existingInfo: ShareInfo | null = null;

  if (token) {
    existingInfo = await getShareInfo(token);
  }

  // Regenerate token if requested or if share doesn't exist
  if (config.regenerateToken || !token || !existingInfo) {
    token = generateShareToken();
    
    // Ensure token is unique (collision is extremely unlikely, but check anyway)
    let attempts = 0;
    while (await getShareInfo(token) !== null && attempts < 10) {
      token = generateShareToken();
      attempts++;
    }
    
    if (attempts >= 10) {
      throw new Error('Failed to generate unique share token');
    }
  }

  // Prepare password hash if provided
  let passwordHash: string | undefined;
  if (config.password) {
    passwordHash = await bcrypt.hash(config.password, 10);
  } else if (existingInfo?.passwordHash) {
    // Keep existing password if not provided
    passwordHash = existingInfo.passwordHash;
  }

  // Build share info
  const now = new Date().toISOString();
  // Handle expiresAt: if explicitly set to empty string/null, remove expiration
  // Otherwise, use provided value or keep existing
  let finalExpiresAt: string | undefined;
  if (config.expiresAt === null || config.expiresAt === '') {
    // Explicitly remove expiration
    finalExpiresAt = undefined;
  } else if (config.expiresAt !== undefined) {
    // Use new expiration date
    finalExpiresAt = config.expiresAt;
  } else {
    // Keep existing expiration (or undefined if no existing)
    finalExpiresAt = existingInfo?.expiresAt;
  }

  const shareInfo: ShareInfo = {
    mapId,
    userId,
    userEmail: existingInfo?.userEmail || userEmail,  // Keep existing or use new
    token,
    enabled: config.enabled !== undefined ? config.enabled : (existingInfo?.enabled ?? true),
    expiresAt: finalExpiresAt,
    allowEmbed: config.allowEmbed !== undefined ? config.allowEmbed : (existingInfo?.allowEmbed ?? false),
    passwordHash,
    viewCount: existingInfo?.viewCount ?? 0,
    lastViewedAt: existingInfo?.lastViewedAt,
    createdAt: existingInfo?.createdAt || now,
  };

  // Calculate TTL (seconds until expiration)
  let ttl: number | undefined;
  if (shareInfo.expiresAt) {
    const expiresAt = new Date(shareInfo.expiresAt);
    const now = Date.now();
    const diffSeconds = Math.floor((expiresAt.getTime() - now) / 1000);
    if (diffSeconds > 0) {
      ttl = diffSeconds;
    } else {
      // Already expired
      shareInfo.enabled = false;
    }
  }

  // Save to Redis
  const cacheKey = `share:token:${token}`;
  const mapCacheKey = `share:map:${mapId}`;
  
  await cache.put(cacheKey, JSON.stringify(shareInfo), ttl ? { expirationTtl: ttl } : undefined);
  await cache.put(mapCacheKey, token, ttl ? { expirationTtl: ttl } : undefined);

  return shareInfo;
}

/**
 * Disable share for a map
 */
export async function disableShare(mapId: string): Promise<void> {
  const token = await getShareTokenByMapId(mapId);
  
  if (!token) {
    return; // Share doesn't exist
  }

  const shareInfo = await getShareInfo(token);
  if (!shareInfo) {
    return;
  }

  // Update share info to disable
  shareInfo.enabled = false;

  const cacheKey = `share:token:${token}`;
  const shareJson = await cache.get(cacheKey);
  
  if (shareJson) {
    // Preserve TTL if exists
    const existingInfo = JSON.parse(shareJson) as ShareInfo;
    const now = Date.now();
    let ttl: number | undefined;
    
    if (existingInfo.expiresAt) {
      const expiresAt = new Date(existingInfo.expiresAt).getTime();
      const diffSeconds = Math.floor((expiresAt - now) / 1000);
      if (diffSeconds > 0) {
        ttl = diffSeconds;
      }
    }

    shareInfo.viewCount = existingInfo.viewCount;
    shareInfo.lastViewedAt = existingInfo.lastViewedAt;
    shareInfo.createdAt = existingInfo.createdAt;
    shareInfo.passwordHash = existingInfo.passwordHash;

    await cache.put(cacheKey, JSON.stringify(shareInfo), ttl ? { expirationTtl: ttl } : undefined);
  }
}

/**
 * Increment view count and update last viewed time
 */
export async function recordShareView(token: string): Promise<void> {
  const shareInfo = await getShareInfo(token);
  
  if (!shareInfo) {
    return;
  }

  shareInfo.viewCount = (shareInfo.viewCount || 0) + 1;
  shareInfo.lastViewedAt = new Date().toISOString();

  const cacheKey = `share:token:${token}`;
  const shareJson = await cache.get(cacheKey);
  
  if (shareJson) {
    // Preserve TTL
    const existingInfo = JSON.parse(shareJson) as ShareInfo;
    const now = Date.now();
    let ttl: number | undefined;
    
    if (existingInfo.expiresAt) {
      const expiresAt = new Date(existingInfo.expiresAt).getTime();
      const diffSeconds = Math.floor((expiresAt - now) / 1000);
      if (diffSeconds > 0) {
        ttl = diffSeconds;
      }
    }

    shareInfo.createdAt = existingInfo.createdAt;
    shareInfo.passwordHash = existingInfo.passwordHash;

    await cache.put(cacheKey, JSON.stringify(shareInfo), ttl ? { expirationTtl: ttl } : undefined);
  }
}

/**
 * Verify password for password-protected share
 */
export async function verifySharePassword(token: string, password: string): Promise<boolean> {
  const shareInfo = await getShareInfo(token);
  
  if (!shareInfo || !shareInfo.passwordHash) {
    return false;
  }

  return bcrypt.compare(password, shareInfo.passwordHash);
}

/**
 * Check if share is accessible (not expired, not disabled)
 */
export function isShareAccessible(shareInfo: ShareInfo): boolean {
  if (!shareInfo.enabled) {
    return false;
  }

  if (shareInfo.expiresAt) {
    const expiresAt = new Date(shareInfo.expiresAt);
    const now = new Date();
    if (now > expiresAt) {
      return false;
    }
  }

  return true;
}

