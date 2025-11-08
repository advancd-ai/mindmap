/**
 * Share routes
 * Handles map sharing (readonly access)
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { createGitProvider } from '../git/index.js';
import {
  getShareInfo,
  createOrUpdateShare,
  disableShare,
  recordShareView,
  verifySharePassword,
  isShareAccessible,
  getShareTokenByMapId,
} from '../services/share.js';
import type { Env, User, ShareConfig } from '../types.js';

export const shareRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

/**
 * GET /share/:token
 * Get map via share token (public, no auth required)
 */
shareRouter.get('/:token', async (c) => {
  const { token } = c.req.param();
  const password = c.req.query('password');

  try {
    // Get share info
    const shareInfo = await getShareInfo(token);

    if (!shareInfo) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'SHARE_404_NOT_FOUND',
            message: 'Share token not found',
          },
        },
        404
      );
    }

    // Check if share is accessible
    if (!isShareAccessible(shareInfo)) {
      if (shareInfo.expiresAt && new Date() > new Date(shareInfo.expiresAt)) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'SHARE_403_EXPIRED',
              message: 'Share link has expired',
            },
          },
          403
        );
      }

      return c.json(
        {
          ok: false,
          error: {
            code: 'SHARE_403_DISABLED',
            message: 'Share is disabled',
          },
        },
        403
      );
    }

    // Check password if required
    if (shareInfo.passwordHash) {
      if (!password) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'SHARE_401_PASSWORD_REQUIRED',
              message: 'Password required',
            },
          },
          401
        );
      }

      const isValid = await verifySharePassword(token, password);
      if (!isValid) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'SHARE_401_PASSWORD_INVALID',
              message: 'Invalid password',
            },
          },
          401
        );
      }
    }

    // Get map data (create provider with map owner's user info)
    const user: User = {
      userId: shareInfo.userId,
      email: shareInfo.userEmail,
      name: shareInfo.userEmail, // Fallback to email if name not available
    };

    const github = createGitProvider(user);
    const map = await github.getMap(shareInfo.mapId);

    // Record view
    await recordShareView(token);

    return c.json({
      ok: true,
      data: {
        map,
        shareInfo: {
          token: shareInfo.token,
          expiresAt: shareInfo.expiresAt,
          readOnly: true,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching shared map:', error);
    
    if (error.message && error.message.includes('not found')) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: 'Map not found',
          },
        },
        404
      );
    }

    throw error;
  }
});

/**
 * GET /maps/:id/share
 * Get share status for a map (requires auth, owner only)
 */
shareRouter.get('/:id/share', requireAuth(), async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();

  try {
    const token = await getShareTokenByMapId(id);
    
    if (!token) {
      return c.json(
        {
          ok: true,
          data: {
            enabled: false,
            message: 'Share not configured',
          },
        }
      );
    }

    const shareInfo = await getShareInfo(token);

    if (!shareInfo) {
      return c.json(
        {
          ok: true,
          data: {
            enabled: false,
            message: 'Share not found',
          },
        }
      );
    }

    // Verify ownership
    if (shareInfo.userId !== user.userId) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'SHARE_403_FORBIDDEN',
            message: 'You do not have permission to view this share configuration',
          },
        },
        403
      );
    }

    // Build share URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${frontendUrl}/share/${token}`;

    return c.json({
      ok: true,
      data: {
        shareToken: shareInfo.token,
        shareUrl,
        enabled: shareInfo.enabled,
        expiresAt: shareInfo.expiresAt,
        allowEmbed: shareInfo.allowEmbed,
        passwordProtected: !!shareInfo.passwordHash,
        stats: {
          viewCount: shareInfo.viewCount,
          lastViewedAt: shareInfo.lastViewedAt,
        },
        createdAt: shareInfo.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching share status:', error);
    console.error('Error stack:', error.stack);
    
    return c.json(
      {
        ok: false,
        error: {
          code: 'SHARE_500_INTERNAL_ERROR',
          message: error.message || 'Failed to fetch share status',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
      500
    );
  }
});

/**
 * POST /maps/:id/share
 * Create or enable share for a map (requires auth, owner only)
 */
shareRouter.post('/:id/share', requireAuth(), async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();
  const body = await c.req.json() as ShareConfig;

  try {
    // Verify map ownership by trying to fetch it
    const github = createGitProvider(user);
    await github.getMap(id); // Will throw if map doesn't exist or user doesn't have access

    // Create or update share
    const shareInfo = await createOrUpdateShare(id, user.userId, user.email, {
      enabled: body.enabled !== undefined ? body.enabled : true,
      expiresAt: body.expiresAt,
      allowEmbed: body.allowEmbed,
      regenerateToken: body.regenerateToken,
      password: body.password,
    });

    // Build share URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${frontendUrl}/share/${shareInfo.token}`;

    // Update index.json with share info
    try {
      await github.updateMapShareInfo(id, shareInfo.token, shareInfo.enabled);
    } catch (error: any) {
      console.warn('Failed to update index.json with share info:', error.message);
      // Don't fail the request if index update fails
    }

    return c.json({
      ok: true,
      data: {
        shareToken: shareInfo.token,
        shareUrl,
        enabled: shareInfo.enabled,
        expiresAt: shareInfo.expiresAt,
        allowEmbed: shareInfo.allowEmbed,
        passwordProtected: !!shareInfo.passwordHash,
        stats: {
          viewCount: shareInfo.viewCount,
          lastViewedAt: shareInfo.lastViewedAt,
        },
        createdAt: shareInfo.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating share:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message && error.message.includes('not found')) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: 'Map not found',
          },
        },
        404
      );
    }

    // Return proper error response instead of throwing
    return c.json(
      {
        ok: false,
        error: {
          code: 'SHARE_500_INTERNAL_ERROR',
          message: error.message || 'Failed to create share',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
      500
    );
  }
});

/**
 * PUT /maps/:id/share
 * Update share configuration (requires auth, owner only)
 */
shareRouter.put('/:id/share', requireAuth(), async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();
  const body = await c.req.json() as ShareConfig;

  try {
    // Verify map ownership
    const github = createGitProvider(user);
    await github.getMap(id);

    // Get existing share info to verify ownership
    const existingToken = await getShareTokenByMapId(id);
    if (existingToken) {
      const existingInfo = await getShareInfo(existingToken);
      if (existingInfo && existingInfo.userId !== user.userId) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'SHARE_403_FORBIDDEN',
              message: 'You do not have permission to update this share',
            },
          },
          403
        );
      }
    }

    // Update share
    const shareInfo = await createOrUpdateShare(id, user.userId, user.email, body);

    // Update index.json
    try {
      await github.updateMapShareInfo(id, shareInfo.token, shareInfo.enabled);
    } catch (error: any) {
      console.warn('Failed to update index.json with share info:', error.message);
    }

    // Build share URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${frontendUrl}/share/${shareInfo.token}`;

    return c.json({
      ok: true,
      data: {
        shareToken: shareInfo.token,
        shareUrl,
        enabled: shareInfo.enabled,
        expiresAt: shareInfo.expiresAt,
        allowEmbed: shareInfo.allowEmbed,
        passwordProtected: !!shareInfo.passwordHash,
        stats: {
          viewCount: shareInfo.viewCount,
          lastViewedAt: shareInfo.lastViewedAt,
        },
        createdAt: shareInfo.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error updating share:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message && error.message.includes('not found')) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: 'Map not found',
          },
        },
        404
      );
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'SHARE_500_INTERNAL_ERROR',
          message: error.message || 'Failed to update share',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
      500
    );
  }
});

/**
 * DELETE /maps/:id/share
 * Disable share for a map (requires auth, owner only)
 */
shareRouter.delete('/:id/share', requireAuth(), async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();

  try {
    // Verify map ownership
    const github = createGitProvider(user);
    await github.getMap(id);

    // Get existing share info to verify ownership
    const existingToken = await getShareTokenByMapId(id);
    if (existingToken) {
      const existingInfo = await getShareInfo(existingToken);
      if (existingInfo && existingInfo.userId !== user.userId) {
        return c.json(
          {
            ok: false,
            error: {
              code: 'SHARE_403_FORBIDDEN',
              message: 'You do not have permission to delete this share',
            },
          },
          403
        );
      }
    }

    // Disable share
    await disableShare(id);

    // Update index.json
    try {
      await github.updateMapShareInfo(id, undefined, false);
    } catch (error: any) {
      console.warn('Failed to update index.json with share info:', error.message);
    }

    return c.json({
      ok: true,
      data: {
        message: 'Share disabled',
      },
    });
  } catch (error: any) {
    console.error('Error disabling share:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message && error.message.includes('not found')) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: 'Map not found',
          },
        },
        404
      );
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'SHARE_500_INTERNAL_ERROR',
          message: error.message || 'Failed to disable share',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
      500
    );
  }
});

