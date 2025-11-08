/**
 * Authentication routes
 * Handles Google OAuth flow and session management
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { cache } from '../lib/redis.js';
import { createGitProvider } from '../git/index.js';
import type { Env, User } from '../types.js';

export const authRouter = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/guest
 * Guest login - no OAuth required
 * Creates a session for a shared guest user
 */
authRouter.post('/guest', async (c) => {
  console.log('👤 Guest login requested');

  // Create guest session token
  const guestToken = `guest_session_${nanoid(32)}`;

  // Guest user info (shared across all guest sessions)
  const guestUser: User = {
    userId: 'guest',
    email: 'guest@example.com',
    name: 'Guest User',
  };

  // Store guest session in cache (24h expiry)
  await cache.put(`session:${guestToken}`, JSON.stringify(guestUser), {
    expirationTtl: 86400,
  });

  console.log('✅ Guest session created:', guestToken);

  return c.json({
    ok: true,
    data: {
      token: guestToken,
      user: guestUser,
    },
  });
});

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
authRouter.get('/google', async (c) => {
  // Development mode: return mock token directly
  if (process.env.DEV_MODE === 'true') {
    const devToken = 'dev_token_' + nanoid(16);
    const devUser: User = {
      userId: 'choonho.son',
      email: 'choonho.son@gmail.com',
      name: 'Choonho Son',
    };

    await cache.put(`session:${devToken}`, JSON.stringify(devUser), {
      expirationTtl: 86400,
    });

    return c.json({
      ok: true,
      message: 'Development mode: Auth bypassed',
      token: devToken,
      user: devUser,
    });
  }

  const state = nanoid(32);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/auth/google/callback';

  console.log('🔐 Initiating Google OAuth with redirect URI:', redirectUri);

  // Store state in cache for validation (5 min expiry)
  await cache.put(`oauth_state:${state}`, '1', { expirationTtl: 300 });

  // Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');

  console.log('🔄 Redirecting to Google:', authUrl.toString());
  return c.redirect(authUrl.toString());
});

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
authRouter.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_400_INVALID',
          message: 'Missing code or state parameter',
        },
      },
      400
    );
  }

  // Validate state
  const storedState = await cache.get(`oauth_state:${state}`);
  if (!storedState) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_400_INVALID_STATE',
          message: 'Invalid or expired state parameter',
        },
      },
      400
    );
  }

  // Exchange code for access token
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/auth/google/callback',
      }),
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = (await userResponse.json()) as any;

    console.log('Google user data:', userData);

    // Create session token
    const sessionToken = `session_${nanoid(32)}`;

    // Store session in cache (24h expiry)
    const user: User = {
      userId: userData.id || userData.sub,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
    };

    await cache.put(`session:${sessionToken}`, JSON.stringify(user), {
      expirationTtl: 86400,
    });

    // Redirect to frontend with session token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
    redirectUrl.searchParams.set('token', sessionToken);

    console.log('🔄 Redirecting to frontend:', redirectUrl.toString());
    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth error:', error);
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_500_OAUTH_FAILED',
          message: 'Failed to complete OAuth flow',
        },
      },
      500
    );
  }
});

/**
 * GET /auth/me
 * Get current user info with repository status
 */
authRouter.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_401_NO_SESSION',
          message: 'No session token provided',
        },
      },
      401
    );
  }

  const token = authHeader.slice(7);
  const userJson = await cache.get(`session:${token}`);

  if (!userJson) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_401_NO_SESSION',
          message: 'Invalid or expired session',
        },
      },
      401
    );
  }

  const user: User = JSON.parse(userJson);

  // Check repository status
  let repoStatus = { exists: false, initialized: false };
  try {
    const git = createGitProvider(user);
    repoStatus = await git.checkRepository();
  } catch (error: any) {
    console.error('Error checking repository status:', error.message);
    // Continue even if check fails
  }

  return c.json({
    ok: true,
    data: {
      ...user,
      repository: repoStatus,
    },
  });
});

/**
 * POST /auth/setup-repo
 * Setup user's GitHub repository
 */
authRouter.post('/setup-repo', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_401_NO_SESSION',
          message: 'No session token provided',
        },
      },
      401
    );
  }

  const token = authHeader.slice(7);
  const userJson = await cache.get(`session:${token}`);

  if (!userJson) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'AUTH_401_NO_SESSION',
          message: 'Invalid or expired session',
        },
      },
      401
    );
  }

  const user: User = JSON.parse(userJson);

  try {
    const git = createGitProvider(user);

    // Setup repository
    await git.setupRepository();

    // Verify setup
    const status = await git.checkRepository();

    return c.json({
      ok: true,
      data: {
        message: 'Repository setup complete',
        repository: status,
      },
    });
  } catch (error: any) {
    console.error('Error setting up repository:', error);
    return c.json(
      {
        ok: false,
        error: {
          code: 'REPO_500_SETUP_FAILED',
          message: error.message || 'Failed to setup repository',
        },
      },
      500
    );
  }
});

/**
 * POST /auth/logout
 * Logout and clear session
 */
authRouter.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await cache.delete(`session:${token}`);
  }

  return c.json({
    ok: true,
    message: 'Logged out successfully',
  });
});
