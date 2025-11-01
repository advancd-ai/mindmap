/**
 * Share API functions
 */

import apiClient from './client';

export interface ShareStatus {
  shareToken: string;
  shareUrl: string;
  enabled: boolean;
  expiresAt?: string;
  allowEmbed: boolean;
  passwordProtected: boolean;
  stats: {
    viewCount: number;
    lastViewedAt?: string;
  };
  createdAt: string;
}

export interface ShareConfig {
  enabled?: boolean;
  expiresAt?: string;
  allowEmbed?: boolean;
  regenerateToken?: boolean;
  password?: string;
}

export interface SharedMapData {
  map: any; // MindMap type
  shareInfo: {
    token: string;
    expiresAt?: string;
    readOnly: true;
  };
}

/**
 * Get share status for a map
 */
export async function getShareStatus(mapId: string): Promise<ShareStatus> {
  try {
    console.log(`🔄 Fetching share status for map: ${mapId}`);
    const { data } = await apiClient.get(`/maps/${mapId}/share`);
    console.log('✅ Share status fetched:', data);
    
    if (!data.ok) {
      // If share not configured, return default
      if (data.error?.code === 'SHARE_404_NOT_FOUND' || data.error?.code === 'MAP_404_NOT_FOUND') {
        return {
          shareToken: '',
          shareUrl: '',
          enabled: false,
          allowEmbed: false,
          passwordProtected: false,
          stats: { viewCount: 0 },
          createdAt: '',
        };
      }
      throw new Error(data.error?.message || 'Failed to fetch share status');
    }
    
    return data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      // Share not configured yet
      return {
        shareToken: '',
        shareUrl: '',
        enabled: false,
        allowEmbed: false,
        passwordProtected: false,
        stats: { viewCount: 0 },
        createdAt: '',
      };
    }
    console.error(`❌ Error fetching share status:`, error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Create share link
 */
export async function createShare(
  mapId: string, 
  config: ShareConfig
): Promise<ShareStatus> {
  try {
    console.log(`🔄 Creating share for map: ${mapId}`, config);
    const { data } = await apiClient.post(`/maps/${mapId}/share`, config);
    console.log('✅ Share created:', data);
    
    if (!data.ok) {
      throw new Error(data.error?.message || 'Failed to create share');
    }
    
    return data.data;
  } catch (error: any) {
    console.error(`❌ Error creating share:`, error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config,
    });
    throw error;
  }
}

/**
 * Update share configuration
 */
export async function updateShare(
  mapId: string, 
  config: ShareConfig
): Promise<ShareStatus> {
  try {
    console.log(`🔄 Updating share for map: ${mapId}`, config);
    const { data } = await apiClient.put(`/maps/${mapId}/share`, config);
    console.log('✅ Share updated:', data);
    
    if (!data.ok) {
      throw new Error(data.error?.message || 'Failed to update share');
    }
    
    return data.data;
  } catch (error: any) {
    console.error(`❌ Error updating share:`, error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Disable share
 */
export async function disableShare(mapId: string): Promise<void> {
  try {
    console.log(`🔄 Disabling share for map: ${mapId}`);
    const { data } = await apiClient.delete(`/maps/${mapId}/share`);
    console.log('✅ Share disabled');
    
    if (data && !data.ok) {
      throw new Error(data.error?.message || 'Failed to disable share');
    }
  } catch (error: any) {
    console.error(`❌ Error disabling share:`, error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

/**
 * Fetch shared map (no auth required)
 */
export async function fetchSharedMap(
  token: string, 
  password?: string
): Promise<{ ok: boolean; data: SharedMapData }> {
  try {
    console.log(`🔄 Fetching shared map with token: ${token.substring(0, 20)}...`);
    const params = password ? { password } : {};
    const { data } = await apiClient.get(`/share/${token}`, { params });
    console.log('✅ Shared map fetched');
    return data;
  } catch (error: any) {
    console.error(`❌ Error fetching shared map:`, error.response?.data || error.message);
    throw error;
  }
}

