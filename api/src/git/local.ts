import path from 'path';
import { promises as fs } from 'fs';
import { simpleGit, SimpleGit } from 'simple-git';
import type { Map, Index, PRTransaction, User } from '../types.js';
import type { GitProvider, MapHistoryEntry } from './provider.js';
import { getGitHubRepoPath, getGitHubRepoName } from '../utils/github.js';

const BRANCH_PREFIX = 'maps/';
const MAP_FILE_PATH = 'map.json';
const INDEX_RELATIVE_PATH = path.join('maps', 'index.json');

function posixPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep);
}

function indexRelativePath(repoPath: string): string {
  return path.relative(repoPath, path.join(repoPath, INDEX_RELATIVE_PATH));
}

export class LocalGitProvider implements GitProvider {
  public readonly user: User;
  private repoPath: string;
  private gitInstance: SimpleGit | null = null;
  private repoInitialized = false;
  private owner: string;
  private repo: string;
  private authorName: string;
  private authorEmail: string;

  constructor(user: User) {
    this.user = user;
    const repoPathInfo = getGitHubRepoPath(user);
    this.owner = process.env.LOCAL_GIT_OWNER || repoPathInfo.owner || 'local';
    this.repo =
      process.env.LOCAL_GIT_REPO ||
      repoPathInfo.repo ||
      getGitHubRepoName(user) ||
      'mindmaps';
    const root = process.env.LOCAL_GIT_ROOT || path.join(process.cwd(), 'data', 'repos');
    this.repoPath = path.join(root, this.owner, this.repo);
    this.authorName = process.env.LOCAL_GIT_AUTHOR_NAME || 'Mindmap Ziin';
    this.authorEmail = process.env.LOCAL_GIT_AUTHOR_EMAIL || 'mindmap@ziin.ai';
  }

  private async git(): Promise<SimpleGit> {
    if (!this.gitInstance) {
      await fs.mkdir(this.repoPath, { recursive: true });
      this.gitInstance = simpleGit({ baseDir: this.repoPath });
    }
    return this.gitInstance;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureRepository(): Promise<void> {
    if (this.repoInitialized) return;

    const git = await this.git();
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      await git.init();
      // Docker/bind mounts often differ from host file modes; avoid spurious dirty trees
      await git.addConfig('core.fileMode', 'false', false, 'local');
      await git.addConfig('user.name', this.authorName, false, 'local');
      await git.addConfig('user.email', this.authorEmail, false, 'local');

      await fs.writeFile(path.join(this.repoPath, 'README.md'), '# Mindmap Repository\n');
      await git.add(['README.md']);
      await git.commit('Initial commit');
    } else {
      try {
        await git.addConfig('core.fileMode', 'false', false, 'local');
        await git.addConfig('user.name', this.authorName, false, 'local');
        await git.addConfig('user.email', this.authorEmail, false, 'local');
      } catch (error) {
        console.warn('⚠️ Failed to set git config, continuing', error);
      }
    }

    const branchInfo = await git.branch();
    if (branchInfo.current !== 'main') {
      try {
        await git.checkout('main');
      } catch {
        await git.checkoutLocalBranch('main');
      }
    }

    await this.ensureIndexFile();
    this.repoInitialized = true;
  }

  private async ensureIndexFile(): Promise<void> {
    const git = await this.git();
    const indexPath = path.join(this.repoPath, INDEX_RELATIVE_PATH);
    const indexDir = path.dirname(indexPath);
    await fs.mkdir(indexDir, { recursive: true });

    const exists = await this.pathExists(indexPath);
    if (!exists) {
      const index: Index = {
        generatedAt: new Date().toISOString(),
        items: [],
      };
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
      await git.add([path.relative(this.repoPath, indexPath)]);
      await git.commit('Initialize map index');
    }
  }

  private async withBranch<T>(branch: string, options: { create?: boolean; from?: string } = {}, fn: () => Promise<T>): Promise<T> {
    const git = await this.git();
    const branchSummary = await git.branch();
    const current = branchSummary.current || 'main';

    if (options.create) {
      const fromBranch = options.from || 'main';
      await git.checkout(fromBranch);
      await git.checkoutLocalBranch(branch);
    } else {
      const exists = branchSummary.all.includes(branch);
      if (!exists) {
        throw new Error(`Branch ${branch} does not exist`);
      }
      await git.checkout(branch);
    }

    try {
      return await fn();
    } finally {
      await git.checkout(current);
    }
  }

  private branchName(mapId: string): string {
    return `${BRANCH_PREFIX}${mapId}`;
  }

  private async readIndexFromWorkingTree(): Promise<Index> {
    const indexPath = path.join(this.repoPath, INDEX_RELATIVE_PATH);
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
  }

  private async writeIndex(index: Index): Promise<void> {
    const indexPath = path.join(this.repoPath, INDEX_RELATIVE_PATH);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  private async stageAndCommit(git: SimpleGit, files: string[], message: string): Promise<void> {
    await git.add(files);
    try {
      await git.commit(message);
    } catch (error: any) {
      if (!/nothing to commit/.test(error?.message ?? '')) {
        throw error;
      }
    }
  }

  private async updateIndex(mutator: (index: Index) => boolean, message: string): Promise<void> {
    await this.withBranch('main', {}, async () => {
      const git = await this.git();
      const index = await this.readIndexFromWorkingTree();
      const changed = mutator(index);
      if (!changed) {
        return;
      }
      index.generatedAt = new Date().toISOString();
      await this.writeIndex(index);
      await this.stageAndCommit(git, [indexRelativePath(this.repoPath)], message);
    });
  }

  private buildFileUrl(mapId: string, filename: string, requestUrl?: string): string {
    let apiUrl = process.env.API_URL || 'http://localhost:8787';

    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        apiUrl = `${url.protocol}//${url.host}`;
      } catch {
        // ignore parsing errors
      }
    } else if (!process.env.API_URL) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL;
      if (frontendUrl) {
        try {
          const url = new URL(frontendUrl);
          apiUrl = `${url.protocol}//${url.host}`;
        } catch {
          // ignore
        }
      }
    }

    apiUrl = apiUrl.replace(/\/$/, '');
    return `${apiUrl}/upload/download/${mapId}/${filename}`;
  }

  async checkRepository(): Promise<{ exists: boolean; initialized: boolean }> {
    const exists = await this.pathExists(path.join(this.repoPath, '.git'));
    if (!exists) {
      return { exists: false, initialized: false };
    }

    const git = await this.git();
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return { exists: false, initialized: false };
    }

    const branchInfo = await git.branch();
    const hasMain = branchInfo.all.includes('main');
    if (!hasMain) {
      return { exists: true, initialized: false };
    }

    try {
      await git.show([`main:${posixPath(INDEX_RELATIVE_PATH)}`]);
      return { exists: true, initialized: true };
    } catch {
      return { exists: true, initialized: false };
    }
  }

  async setupRepository(): Promise<void> {
    await this.ensureRepository();
  }

  async getIndex(): Promise<Index> {
    await this.ensureRepository();
    const git = await this.git();

    try {
      const content = await git.show([`main:${posixPath(INDEX_RELATIVE_PATH)}`]);
      return JSON.parse(content);
    } catch {
      return {
        generatedAt: new Date().toISOString(),
        items: [],
      };
    }
  }

  async getMap(id: string): Promise<Map> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(id);

    try {
      const content = await git.show([`${branch}:${MAP_FILE_PATH}`]);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        throw Object.assign(new Error(`Map ${id} not found`), { status: 404 });
      }
      throw error;
    }
  }

  async createMap(map: Map): Promise<PRTransaction> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(map.id);
    const branchInfo = await git.branch();
    if (branchInfo.all.includes(branch)) {
      throw new Error(`Map ${map.id} already exists`);
    }

    await this.withBranch(branch, { create: true, from: 'main' }, async () => {
      const filePath = path.join(this.repoPath, MAP_FILE_PATH);
      await fs.writeFile(filePath, JSON.stringify(map, null, 2));
      await git.add([MAP_FILE_PATH]);
      await git.commit(`Create map: ${map.title}`);
    });

    await this.updateIndex((index) => {
      index.items.push({
        id: map.id,
        title: map.title,
        tags: map.tags || [],
        nodeCount: map.nodes.length,
        edgeCount: map.edges.length,
        updatedAt: map.updatedAt,
        version: map.version,
      });
      return true;
    }, `Add map to index: ${map.title}`);

    return {
      branch,
      mapId: map.id,
    };
  }

  async updateMap(map: Map): Promise<PRTransaction> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(map.id);
    const branchInfo = await git.branch();
    if (!branchInfo.all.includes(branch)) {
      return this.createMap(map);
    }

    await this.withBranch(branch, {}, async () => {
      const filePath = path.join(this.repoPath, MAP_FILE_PATH);
      await fs.writeFile(filePath, JSON.stringify(map, null, 2));
      await git.add([MAP_FILE_PATH]);
      await git.commit(`Update map: ${map.title} (v${map.version})`);
    });

    await this.updateIndex((index) => {
      const item = index.items.find((entry) => entry.id === map.id);
      if (!item) {
        index.items.push({
          id: map.id,
          title: map.title,
          tags: map.tags || [],
          nodeCount: map.nodes.length,
          edgeCount: map.edges.length,
          updatedAt: map.updatedAt,
          version: map.version,
        });
        return true;
      }
      item.title = map.title;
      item.tags = map.tags || [];
      item.nodeCount = map.nodes.length;
      item.edgeCount = map.edges.length;
      item.updatedAt = map.updatedAt;
      item.version = map.version;
      return true;
    }, `Update index for map: ${map.title}`);

    return {
      branch,
      mapId: map.id,
    };
  }

  async deleteMap(id: string): Promise<PRTransaction> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(id);

    const branchInfo = await git.branch();
    if (!branchInfo.all.includes(branch)) {
      throw new Error(`Map ${id} not found`);
    }

    await git.branch(['-D', branch]);

    await this.updateIndex((index) => {
      const before = index.items.length;
      index.items = index.items.filter((item) => item.id !== id);
      return before !== index.items.length;
    }, `Remove map from index: ${id}`);

    return {
      branch,
      mapId: id,
      branchDeleted: true,
    };
  }

  async createSnapshot(mapId: string, name: string, message?: string): Promise<{ name: string; sha: string }> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(mapId);

    const branchInfo = await git.branch();
    if (!branchInfo.all.includes(branch)) {
      throw new Error(`Map ${mapId} not found`);
    }

    const tagName = `${mapId}-${name}`;
    const log = await git.log({ n: 1, from: branch });
    const sha = log.latest?.hash;
    if (!sha) {
      throw new Error('No commits found for map');
    }

    if (message) {
      await git.tag(['-a', tagName, sha, '-m', message]);
    } else {
      await git.tag([tagName, sha]);
    }

    return { name: tagName, sha };
  }

  async updateMapShareInfo(id: string, shareToken: string | undefined, shareEnabled: boolean): Promise<void> {
    await this.ensureRepository();
    await this.updateIndex((index) => {
      const item = index.items.find((entry) => entry.id === id);
      if (!item) return false;
      item.shareToken = shareToken;
      item.shareEnabled = shareEnabled;
      return true;
    }, `Update share info for map: ${id}`);
  }

  async updateMapMetadata(id: string, metadata: { title: string; tags: string[] }): Promise<void> {
    await this.ensureRepository();

    await this.updateIndex((index) => {
      const item = index.items.find((entry) => entry.id === id);
      if (!item) {
        index.items.push({
          id,
          title: metadata.title,
          tags: metadata.tags,
          nodeCount: 0,
          edgeCount: 0,
          updatedAt: new Date().toISOString(),
          version: 1,
        });
        return true;
      }
      item.title = metadata.title;
      item.tags = metadata.tags;
      item.updatedAt = new Date().toISOString();
      return true;
    }, `Update metadata: ${metadata.title}`);
  }

  async getMapHistory(mapId: string): Promise<MapHistoryEntry[]> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(mapId);

    return this.withBranch(branch, {}, async () => {
      const history: MapHistoryEntry[] = [];
      const log = await git.log({ file: MAP_FILE_PATH });

      for (const entry of log.all) {
        try {
          const content = await git.show([`${entry.hash}:${MAP_FILE_PATH}`]);
          const mapData: Map = JSON.parse(content);
          history.push({
            version: mapData.version,
            commitSha: entry.hash,
            message: entry.message.split('\n')[0],
            author: entry.author_name || 'Unknown',
            date: entry.date || new Date().toISOString(),
            nodeCount: mapData.nodes?.length || 0,
            edgeCount: mapData.edges?.length || 0,
          });
        } catch (error) {
          console.warn(`Skipping commit ${entry.hash}: unable to read map.json`, error);
        }
      }

      history.sort((a, b) => b.version - a.version);
      return history;
    });
  }

  async getMapVersion(mapId: string, version: number): Promise<Map> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(mapId);

    return this.withBranch(branch, {}, async () => {
      const log = await git.log({ file: MAP_FILE_PATH });
      for (const entry of log.all) {
        try {
          const content = await git.show([`${entry.hash}:${MAP_FILE_PATH}`]);
          const mapData: Map = JSON.parse(content);
          if (mapData.version === version) {
            return mapData;
          }
        } catch {
          // ignore
        }
      }
      throw Object.assign(new Error(`Map ${mapId} version ${version} not found`), { status: 404 });
    });
  }

  async uploadFile(
    mapId: string,
    filename: string,
    fileBuffer: Buffer,
    _mimeType: string,
    options?: { requestUrl?: string }
  ): Promise<string> {
    await this.ensureRepository();
    const git = await this.git();
    const branch = this.branchName(mapId);

    await this.withBranch(branch, {}, async () => {
      const filesDir = path.join(this.repoPath, 'files');
      await fs.mkdir(filesDir, { recursive: true });
      const filePath = path.join(filesDir, filename);
      await fs.writeFile(filePath, fileBuffer);
      await git.add([path.relative(this.repoPath, filePath)]);
      await git.commit(`Upload file: ${filename}`);
    });

    return this.buildFileUrl(mapId, filename, options?.requestUrl);
  }

  async getFileBuffer(mapId: string, relativePath: string): Promise<Buffer> {
    await this.ensureRepository();
    const normalized = path.normalize(relativePath);
    const git = await this.git();
    const branch = this.branchName(mapId);
    const objectPath = `${branch}:${normalized.replace(/\\/g, '/')}`;

    try {
      const data = await git.binaryCatFile(['-p', objectPath]);
      return Buffer.from(data);
    } catch (error: any) {
      if (error.message && /fatal: path '.+' does not exist in '.+'/.test(error.message)) {
        throw Object.assign(new Error('File not found'), { status: 404 });
      }
      throw error;
    }
  }
}

