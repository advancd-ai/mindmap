/**
 * Custom hook for share functionality
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getShareStatus, 
  createShare, 
  updateShare, 
  disableShare 
} from '../api/share';
import type { ShareConfig } from '../api/share';

export function useShare(mapId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: shareStatus, isLoading } = useQuery({
    queryKey: ['share-status', mapId],
    queryFn: () => getShareStatus(mapId!),
    enabled: !!mapId,
  });

  const createShareMutation = useMutation({
    mutationFn: (config: ShareConfig) => createShare(mapId!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });

  const updateShareMutation = useMutation({
    mutationFn: (config: ShareConfig) => updateShare(mapId!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });

  const disableShareMutation = useMutation({
    mutationFn: () => disableShare(mapId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });

  const copyShareLink = async (): Promise<boolean> => {
    if (shareStatus?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareStatus.shareUrl);
        return true;
      } catch (error) {
        console.error('Failed to copy:', error);
        return false;
      }
    }
    return false;
  };

  return {
    shareStatus,
    isLoading,
    isShared: shareStatus?.enabled || false,
    shareUrl: shareStatus?.shareUrl || '',
    createShare: createShareMutation.mutate,
    updateShare: updateShareMutation.mutate,
    disableShare: disableShareMutation.mutate,
    copyShareLink,
    isCreating: createShareMutation.isPending,
    isUpdating: updateShareMutation.isPending,
    isDisabling: disableShareMutation.isPending,
    createShareMutation,
    updateShareMutation,
    disableShareMutation,
  };
}

