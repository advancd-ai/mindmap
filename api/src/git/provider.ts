import type { Map, PRTransaction, Index, User } from '../types.js';

export interface MapHistoryEntry {
  version: number;
  commitSha: string;
  message: string;
  author: string;
  date: string;
  nodeCount: number;
  edgeCount: number;
}

export interface GitProvider {
  readonly user: User;

  checkRepository(): Promise<{ exists: boolean; initialized: boolean }>;
  setupRepository(): Promise<void>;

  getIndex(): Promise<Index>;
  getMap(id: string): Promise<Map>;
  createMap(map: Map): Promise<PRTransaction>;
  updateMap(map: Map): Promise<PRTransaction>;
  deleteMap(id: string): Promise<PRTransaction>;

  createSnapshot(mapId: string, name: string, message?: string): Promise<{ name: string; sha: string }>;
  updateMapShareInfo(id: string, shareToken: string | undefined, shareEnabled: boolean): Promise<void>;
  updateMapMetadata(id: string, metadata: { title: string; tags: string[] }): Promise<void>;

  getMapHistory(mapId: string): Promise<MapHistoryEntry[]>;
  getMapVersion(mapId: string, version: number): Promise<Map>;

  uploadFile(
    mapId: string,
    filename: string,
    fileBuffer: Buffer,
    mimeType: string,
    options?: { requestUrl?: string }
  ): Promise<string>;

  getFileBuffer(mapId: string, relativePath: string): Promise<Buffer>;
}

