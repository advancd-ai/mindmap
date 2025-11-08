/**
 * Search routes
 * Index-based search functionality
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { createGitProvider } from '../git/index.js';
import { cache } from '../lib/redis.js';
import { getGitHubRepoPath } from '../utils/github.js';
import type { Env, User } from '../types.js';

export const searchRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

searchRouter.use('*', requireAuth());

/**
 * GET /search
 * Search maps by title, tags, etc.
 */
searchRouter.get('/', async (c) => {
  const user = c.get('user') as User;
  const { q } = c.req.query();

  if (!q) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'SEARCH_400_MISSING_QUERY',
          message: 'Query parameter "q" is required',
        },
      },
      400
    );
  }

  const github = createGitProvider(user);

  try {
    // Get index from cache or GitHub
    const repoPath = getGitHubRepoPath(user);
    const cacheKey = `index:${repoPath.owner}:${repoPath.repo}:latest`;
    const cached = await cache.get(cacheKey);

    let index;
    if (cached) {
      index = JSON.parse(cached);
    } else {
      index = await github.getIndex();
      await cache.put(cacheKey, JSON.stringify(index), { expirationTtl: 30 });
    }

    // Simple search implementation
    const query = q.toLowerCase();
    const results = index.items.filter(
      (item: any) =>
        item.title.toLowerCase().includes(query) ||
        item.tags.some((tag: string) => tag.toLowerCase().includes(query)) ||
        item.id.toLowerCase().includes(query)
    );

    return c.json({
      ok: true,
      data: {
        items: results,
        total: results.length,
        query: q,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
});

