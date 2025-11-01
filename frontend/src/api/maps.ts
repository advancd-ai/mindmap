/**
 * Maps API functions
 */

import apiClient from './client';
import type { MindMap } from '../store/mindmap';

export interface MapListItem {
  id: string;
  title: string;
  tags: string[];
  nodeCount: number;
  edgeCount: number;
  updatedAt: string;
  version: number;
  shareToken?: string;
  shareEnabled?: boolean;
}

export async function fetchMaps(query?: string): Promise<MapListItem[]> {
  try {
    const params = query ? { q: query } : {};
    console.log('🔄 Fetching maps...', params);
    
    const { data } = await apiClient.get('/maps', { params });
    console.log('✅ Maps fetched:', data);
    
    return data.data.items || [];
  } catch (error: any) {
    console.error('❌ Error fetching maps:', error.response?.data || error.message);
    throw error;
  }
}

export async function fetchMap(id: string): Promise<MindMap> {
  try {
    console.log(`🔄 Fetching map: ${id}`);
    
    const { data } = await apiClient.get(`/maps/${id}`);
    console.log('✅ Map fetched:', data);
    
    return data.data;
  } catch (error: any) {
    console.error(`❌ Error fetching map ${id}:`, error.response?.data || error.message);
    throw error;
  }
}

export async function createMap(map: Partial<MindMap>): Promise<any> {
  const { data } = await apiClient.post('/maps', map);
  return data.data;
}

export async function updateMap(id: string, map: MindMap): Promise<any> {
  const { data } = await apiClient.put(`/maps/${id}`, map);
  return data.data;
}

export async function deleteMap(id: string): Promise<any> {
  const { data } = await apiClient.delete(`/maps/${id}`);
  return data.data;
}

export async function updateMapMetadata(
  id: string, 
  metadata: { title: string; tags: string[] }
): Promise<void> {
  console.log('🔄 Updating map metadata:', { id, metadata });
  await apiClient.patch(`/maps/${id}/metadata`, metadata);
  console.log('✅ Map metadata updated');
}

export async function searchMaps(query: string): Promise<MapListItem[]> {
  const { data } = await apiClient.get('/search', { params: { q: query } });
  return data.data.items;
}

export interface MapVersion {
  version: number;
  commitSha: string;
  message: string;
  author: string;
  date: string;
  nodeCount: number;
  edgeCount: number;
}

export async function fetchMapHistory(
  mapId: string, 
  onProgress?: (progress: number, stage: string, message?: string, stats?: { processed: number; total: number }) => void
): Promise<MapVersion[]> {
  try {
    console.log(`🔄 Fetching map history: ${mapId}`);
    
    // Simulate progress for fetching stage
    onProgress?.(10, 'fetching', 'Connecting to server...');
    
    const { data } = await apiClient.get(`/maps/${mapId}/history`);
    
    // Simulate progress for processing stage
    onProgress?.(50, 'processing', 'Processing version data...');
    
    const history = data.data || [];
    
    // Simulate progress for each version processed
    if (history.length > 0 && onProgress) {
      for (let i = 0; i < history.length; i++) {
        const progress = 50 + (i / history.length) * 40; // 50% to 90%
        onProgress(
          Math.round(progress), 
          'processing', 
          `Processing version ${history[i].version}...`,
          { processed: i + 1, total: history.length }
        );
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    onProgress?.(100, 'complete', `Found ${history.length} versions`);
    console.log('✅ Map history fetched:', data);
    
    return history;
  } catch (error: any) {
    console.error(`❌ Error fetching map history ${mapId}:`, error.response?.data || error.message);
    throw error;
  }
}

export async function fetchMapVersion(mapId: string, version: number): Promise<MindMap> {
  try {
    console.log(`🔄 Fetching map version: ${mapId} v${version}`);
    
    const { data } = await apiClient.get(`/maps/${mapId}/version/${version}`);
    console.log('✅ Map version fetched:', data);
    
    return data.data;
  } catch (error: any) {
    console.error(`❌ Error fetching map version ${mapId} v${version}:`, error.response?.data || error.message);
    throw error;
  }
}

