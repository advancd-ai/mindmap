/**
 * Maps routes
 * CRUD operations for mindmaps
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { createGitProvider } from '../git/index.js';
import { validateMap } from '../validators/map.js';
import { cache } from '../lib/redis.js';
import { getGitHubRepoPath } from '../utils/github.js';
import { nanoid } from 'nanoid';
import type { Env, Map, User, Index } from '../types.js';

export const mapsRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Apply auth middleware to all routes
mapsRouter.use('*', requireAuth());

/**
 * GET /maps
 * List all maps
 */
mapsRouter.get('/', async (c) => {
  const user = c.get('user') as User;
  const { q, tag, limit = '50', offset = '0' } = c.req.query();

  const github = createGitProvider(user);

  try {
    // Try to get from cache first
    const repoPath = getGitHubRepoPath(user);
    const cacheKey = `index:${repoPath.owner}:${repoPath.repo}:latest`;
    const cached = await cache.get(cacheKey);

    let index;
    if (cached) {
      index = JSON.parse(cached);
    } else {
      // Fetch from GitHub
      index = await github.getIndex();
      // Cache for 30 seconds
      await cache.put(cacheKey, JSON.stringify(index), { expirationTtl: 30 });
    }

    // Filter and paginate
    let items = index.items;

    if (q) {
      const query = q.toLowerCase();
      items = items.filter(
        (item: any) =>
          item.title.toLowerCase().includes(query) ||
          item.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    if (tag) {
      items = items.filter((item: any) => item.tags.includes(tag));
    }

    const limitNum = Math.min(parseInt(limit), 200);
    const offsetNum = parseInt(offset);
    const paginatedItems = items.slice(offsetNum, offsetNum + limitNum);

    return c.json({
      ok: true,
      data: {
        items: paginatedItems,
        total: items.length,
      },
    });
  } catch (error) {
    console.error('Error fetching maps:', error);
    throw error;
  }
});

/**
 * POST /maps
 * Create new map
 */
mapsRouter.post('/', async (c) => {
  const user = c.get('user') as User;
  const body = await c.req.json();

  // Generate ID if not provided
  if (!body.id) {
    body.id = `map_${nanoid(10)}`;
  }

  // Set defaults
  body.updatedAt = new Date().toISOString();
  body.version = body.version || 1;

  // Validate schema
  const validation = validateMap(body);
  if (!validation.valid) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'MAP_400_SCHEMA',
          message: 'Schema validation failed',
          details: validation.errors,
        },
      },
      400
    );
  }

  const github = createGitProvider(user);

  try {
    // Create PR transaction
    const pr = await github.createMap(body);

    return c.json(
      {
        ok: true,
        data: {
          mapId: body.id,
          prNumber: pr.prNumber,
          branch: pr.branch,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating map:', error);
    throw error;
  }
});

/**
 * GET /maps/:id
 * Get single map
 */
mapsRouter.get('/:id', async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();
  const { commit, branch } = c.req.query();

  const github = createGitProvider(user);

  try {
    // Try cache first
    const repoPath = getGitHubRepoPath(user);
    const cacheKey = `map:${repoPath.owner}:${repoPath.repo}:${id}:latest`;
    const indexCacheKey = `index:${repoPath.owner}:${repoPath.repo}:latest`;
    const cached = await cache.get(cacheKey);

    let map: Map;
    if (cached) {
      map = JSON.parse(cached);
    } else {
      // Fetch from Git provider
      map = await github.getMap(id);
    }

    // Attempt to enrich with share metadata from index
    let shareEnabled = map.shareEnabled ?? false;
    let shareToken = map.shareToken;

    try {
      let index: Index | null = null;
      const cachedIndex = await cache.get(indexCacheKey);

      if (cachedIndex) {
        index = JSON.parse(cachedIndex);
      } else {
        index = await github.getIndex();
        await cache.put(indexCacheKey, JSON.stringify(index), { expirationTtl: 30 });
      }

      const indexItem = index?.items?.find((entry) => entry.id === id);
      if (indexItem) {
        shareEnabled = Boolean(indexItem.shareEnabled);
        shareToken = indexItem.shareEnabled ? indexItem.shareToken : undefined;
      }
    } catch (shareError) {
      console.warn('⚠️ Failed to load share metadata for map', {
        mapId: id,
        error: shareError instanceof Error ? shareError.message : shareError,
      });
    }

    const mapWithShare: Map = {
      ...map,
      shareEnabled,
      shareToken,
    };

    // Refresh cache with enriched map
    await cache.put(cacheKey, JSON.stringify(mapWithShare), { expirationTtl: 60 });

    return c.json({
      ok: true,
      data: mapWithShare,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: `Map ${id} not found`,
          },
        },
        404
      );
    }
    throw error;
  }
});

/**
 * PUT /maps/:id
 * Update map
 */
mapsRouter.put('/:id', async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();
  const body = await c.req.json();

  // Ensure ID matches
  body.id = id;
  body.updatedAt = new Date().toISOString();
  body.version = (body.version || 0) + 1;

  const github = createGitProvider(user);

  try {
    // Validate schema
    const validation = validateMap(body);
    if (!validation.valid) {
      console.error('❌ Map validation failed:', {
        mapId: id,
        errors: validation.errors,
        payload: body,
      });
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_400_SCHEMA',
            message: 'Schema validation failed',
            details: validation.errors,
          },
        },
        400
      );
    }

    // Update via PR transaction
    const pr = await github.updateMap(body);

    // Invalidate cache
    const repoPath = getGitHubRepoPath(user);
    const cacheKey = `map:${repoPath.owner}:${repoPath.repo}:${id}:latest`;
    await cache.delete(cacheKey);

    return c.json(
      {
        ok: true,
        data: {
          prNumber: pr.prNumber,
        },
      },
      202
    );
  } catch (error: any) {
    console.error('❌ Error updating map:', {
      mapId: id,
      error: error?.message,
      stack: error?.stack,
      status: error?.status,
      response: error?.response?.data,
    });
    throw error;
  }
});

/**
 * PATCH /maps/:id/metadata
 * Update map metadata (title, tags) in index.json only
 */
mapsRouter.patch('/:id/metadata', async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();
  const body = await c.req.json();

  console.log('📝 Updating map metadata:', { id, body });

  const { title, tags } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'MAP_400_INVALID_TITLE',
          message: 'Title is required',
        },
      },
      400
    );
  }

  const github = createGitProvider(user);

  try {
    // Update index.json only
    await github.updateMapMetadata(id, { title: title.trim(), tags: tags || [] });

    // Invalidate cache
    const repoPath = getGitHubRepoPath(user);
    await cache.delete(`index:${repoPath.owner}:${repoPath.repo}`);

    return c.json({
      ok: true,
      data: {
        id,
        title: title.trim(),
        tags: tags || [],
      },
    });
  } catch (error: any) {
    console.error('❌ Error updating map metadata:', error);
    throw error;
  }
});

/**
 * DELETE /maps/:id
 * Delete map
 */
mapsRouter.delete('/:id', async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();

  const github = createGitProvider(user);

  try {
    const pr = await github.deleteMap(id);

    // Invalidate cache
    const repoPath = getGitHubRepoPath(user);
    await cache.delete(`index:${repoPath.owner}:${repoPath.repo}`);

    return c.json({
      ok: true,
      data: {
        transaction: pr,
      },
    });
  } catch (error) {
    console.error('Error deleting map:', error);
    throw error;
  }
});

/**
 * GET /maps/:id/history
 * Get version history of a map
 */
mapsRouter.get('/:id/history', async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();

  const github = createGitProvider(user);

  try {
    const history = await github.getMapHistory(id);

    return c.json({
      ok: true,
      data: history,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: `Map ${id} not found`,
          },
        },
        404
      );
    }
    throw error;
  }
});

/**
 * GET /maps/:id/version/:version
 * Get specific version of a map
 */
mapsRouter.get('/:id/version/:version', async (c) => {
  const user = c.get('user') as User;
  const { id, version } = c.req.param();

  const github = createGitProvider(user);

  try {
    const map = await github.getMapVersion(id, parseInt(version));

    return c.json({
      ok: true,
      data: map,
    });
  } catch (error: any) {
    if (error.status === 404) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'MAP_404_NOT_FOUND',
            message: `Map ${id} version ${version} not found`,
          },
        },
        404
      );
    }
    throw error;
  }
});

/**
 * POST /maps/:id/snapshot
 * Create snapshot (Git tag)
 */
mapsRouter.post('/:id/snapshot', async (c) => {
  const user = c.get('user') as User;
  const { id } = c.req.param();
  const { name, message } = await c.req.json();

  if (!name) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'MAP_400_INVALID',
          message: 'Snapshot name is required',
        },
      },
      400
    );
  }

  const github = createGitProvider(user);

  try {
    const tag = await github.createSnapshot(id, name, message);

    return c.json(
      {
        ok: true,
        data: {
          tag: tag.name,
          sha: tag.sha,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating snapshot:', error);
    throw error;
  }
});

