import type { User } from '../types.js';
import type { GitProvider } from './provider.js';
import { GitHubClient } from '../github/client.js';
import { LocalGitProvider } from './local.js';

const PROVIDER_GITHUB = 'github';
const PROVIDER_LOCAL = 'local';

export function createGitProvider(user: User): GitProvider {
  const provider = (process.env.GIT_PROVIDER || PROVIDER_GITHUB).toLowerCase();

  switch (provider) {
    case PROVIDER_LOCAL:
      return new LocalGitProvider(user);
    case PROVIDER_GITHUB:
    default:
      return new GitHubClient(user);
  }
}

export type { GitProvider, MapHistoryEntry } from './provider.js';

