/**
 * Dashboard page - list all maps
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { useMindMapStore } from '../store/mindmap';
import { fetchMaps, searchMaps, deleteMap, updateMapMetadata, type MapListItem } from '../api/maps';
import LanguageSelector from '../components/LanguageSelector';
import CreateMapDialog from '../components/CreateMapDialog';
import EditMapDialog from '../components/EditMapDialog';
import Toast, { type ToastType } from '../components/Toast';
import ProgressIndicator from '../components/ProgressIndicator';
import ShareStatusBadge from '../components/ShareStatusBadge';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import './DashboardPage.css';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMap, setEditingMap] = useState<{ id: string; title: string; tags: string[] } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressSteps, setProgressSteps] = useState<Array<{ label: string; status: 'pending' | 'active' | 'completed' | 'error' }>>([]);
  const [mapToDelete, setMapToDelete] = useState<MapListItem | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => state.isGuest);
  const logout = useAuthStore((state) => state.logout);
  const setMap = useMindMapStore((state) => state.setMap);

  const { data: maps, isLoading, error } = useQuery<MapListItem[]>({
    queryKey: ['maps', searchQuery],
    queryFn: () => (searchQuery ? searchMaps(searchQuery) : fetchMaps()),
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error('❌ Query error:', error);
    }
  }, [error]);


  // Scroll detection
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const handleScroll = () => {
      const scrollTop = contentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    contentElement.addEventListener('scroll', handleScroll);
    return () => contentElement.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateMap = () => {
    setShowCreateDialog(true);
  };

  const handleConfirmCreate = (title: string, tags: string[]) => {
    console.log('🎨 Creating new map:', { title, tags });
    
    // Create root node at center of default viewBox (1200x800)
    const defaultViewBox = { x: 0, y: 0, width: 1200, height: 800 };
    const rootNode = {
      id: `n_${Date.now()}`,
      label: title || 'Root Node',
      x: defaultViewBox.x + defaultViewBox.width / 2 - 75, // Center horizontally (150/2 = 75)
      y: defaultViewBox.y + defaultViewBox.height / 2 - 40, // Center vertically (80/2 = 40)
      w: 150,
      h: 80,
      contentType: 'richeditor' as const,
    };
    
    // Create new map with user-provided title, tags, and root node
    const newMap = {
      id: `map_${Date.now()}`,
      title: title,
      tags: tags,
      nodes: [rootNode],
      edges: [],
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    
    console.log('✅ Created new map with root node:', rootNode);
    setMap(newMap);
    setShowCreateDialog(false);
    navigate('/editor');
  };

  const handleCancelCreate = () => {
    setShowCreateDialog(false);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (mapId: string) => deleteMap(mapId),
    onSuccess: () => {
      console.log('✅ Map deleted successfully');
      // Invalidate and refetch maps
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
    onError: (error: any) => {
      console.error('❌ Error deleting map:', error);
      setToast({ message: t('dashboard.deleteError'), type: 'error' });
    },
  });

  const isDeletePending = deleteMutation.status === 'pending';

  const handleDeleteMap = (e: React.MouseEvent, map: MapListItem) => {
    e.stopPropagation();
    setMapToDelete(map);
  };

  const handleConfirmDeleteMap = () => {
    if (!mapToDelete) return;
    console.log('🗑️ Deleting map:', mapToDelete.id);
    deleteMutation.mutate(mapToDelete.id, {
      onSettled: () => {
        setMapToDelete(null);
      },
    });
  };

  const handleCancelDeleteMap = () => {
    if (isDeletePending) {
      return;
    }
    setMapToDelete(null);
  };

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, title, tags }: { id: string; title: string; tags: string[] }) => {
      console.log('🔄 Starting edit mutation:', { id, title, tags });
      
      // Initialize progress steps (for both guest and authenticated)
      setProgressSteps([
        { label: t('progress.preparing'), status: 'active' },
        { label: t('progress.updating'), status: 'pending' },
        { label: t('progress.refreshing'), status: 'pending' },
      ]);
      setShowProgress(true);
      setShowEditDialog(false);
      
      // Step 1: Complete preparation
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgressSteps([
        { label: t('progress.preparing'), status: 'completed' },
        { label: t('progress.updating'), status: 'active' },
        { label: t('progress.refreshing'), status: 'pending' },
      ]);
      
      // Step 2: Update metadata
      console.log('📡 Calling updateMapMetadata API...');
      const result = await updateMapMetadata(id, { title, tags });
      console.log('✅ API call completed:', result);
      
      setProgressSteps([
        { label: t('progress.preparing'), status: 'completed' },
        { label: t('progress.updating'), status: 'completed' },
        { label: t('progress.refreshing'), status: 'active' },
      ]);
      
      return result;
    },
    onSuccess: async () => {
      console.log('✅ Map metadata updated successfully');
      
      // Step 3: Refresh dashboard
      console.log('🔄 Invalidating queries and refetching...');
      await queryClient.invalidateQueries({ queryKey: ['maps'] });
      await queryClient.refetchQueries({ queryKey: ['maps'] });
      
      setProgressSteps([
        { label: t('progress.preparing'), status: 'completed' },
        { label: t('progress.updating'), status: 'completed' },
        { label: t('progress.refreshing'), status: 'completed' },
      ]);
      
      // Wait a bit to show completion
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Hide progress and show success toast
      setShowProgress(false);
      setEditingMap(null);
      setToast({ message: t('dashboard.updateSuccess'), type: 'success' });
      
      console.log('✅ Dashboard refreshed');
    },
    onError: (error: any) => {
      console.error('❌ Error updating map metadata:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Mark current step as error
      setProgressSteps(prev => 
        prev.map(step => 
          step.status === 'active' ? { ...step, status: 'error' as const } : step
        )
      );
      
      // Wait a bit to show error
      setTimeout(() => {
        setShowProgress(false);
        setEditingMap(null);
        const errorMsg = error.response?.data?.error?.message || t('dashboard.updateError');
        setToast({ message: errorMsg, type: 'error' });
      }, 1000);
    },
  });

  const handleEditMap = (e: React.MouseEvent, map: any) => {
    e.stopPropagation(); // Prevent card click
    console.log('✏️ Editing map:', map.id);
    setEditingMap({
      id: map.id,
      title: map.title,
      tags: map.tags || [],
    });
    setShowEditDialog(true);
  };

  const handleConfirmEdit = (title: string, tags: string[]) => {
    if (!editingMap) return;
    console.log('💾 Dashboard: Updating map metadata:', { id: editingMap.id, title, tags });
    editMutation.mutate({ id: editingMap.id, title, tags });
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingMap(null);
  };

  return (
    <div className="dashboard-page page">
      <div className="dashboard-content container" ref={contentRef}>
        {/* Guest Mode Banner */}
        {isGuest && (
          <div className="guest-banner">
            <div className="guest-banner-icon">ℹ️</div>
            <div className="guest-banner-content">
              <strong>{t('dashboard.guestMode', 'Guest Mode')}</strong>
              <span>{t('dashboard.guestModeDesc', 'Your maps are stored locally. Sign in with Google to sync across devices.')}</span>
            </div>
            <button onClick={handleLogout} className="guest-banner-button">
              {t('dashboard.signIn', 'Sign In')}
            </button>
          </div>
        )}
        
        <h1 className="dashboard-title">{t('dashboard.title')}</h1>
        
        <div className="toolbar">
          <input
            type="text"
            className="input search-input"
            placeholder={t('dashboard.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={handleCreateMap} className="button">
            {t('dashboard.createNew')}
          </button>
        </div>

        <div className="maps-grid">
          {isLoading && <div className="loading">{t('dashboard.loading')}</div>}
          
          {error && (
            <div className="error-state">
              <p>❌ Error loading maps</p>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </div>
          )}
          
          {!isLoading && !error && maps && maps.length === 0 && (
            <div className="empty-state">
              <p>{t('dashboard.empty')}</p>
              <button onClick={handleCreateMap} className="button">
                {t('dashboard.createNew')}
              </button>
            </div>
          )}

          {maps?.map((map: MapListItem) => (
            <div
              key={map.id}
              className="map-card card"
              onClick={() => navigate(`/editor/${map.id}`)}
            >
              <div className="map-card-content">
                <div className="map-card-header">
                  <h3 className="map-title">{map.title}</h3>
                  <div className="map-card-actions">
                    <div className="map-card-meta">
                      {map.shareEnabled && (
                        <ShareStatusBadge 
                          isShared={map.shareEnabled}
                        />
                      )}
                      <span className="map-version">v{map.version}</span>
                    </div>
                    <button
                      className="map-edit-btn"
                      onClick={(e) => handleEditMap(e, map)}
                      title="Edit map info"
                    >
                      ✏️
                    </button>
                  </div>
                </div>

                <div className="map-body-row">
                  {/* Stats */}
                  <div className="map-stats">
                    <div className="stat-item">
                      <span className="stat-icon">📊</span>
                      <span className="stat-value">{map.nodeCount}</span>
                      <span className="stat-label">{t('dashboard.nodes')}</span>
                    </div>
                    <div className="stat-divider">·</div>
                    <div className="stat-item">
                      <span className="stat-icon">🔗</span>
                      <span className="stat-value">{map.edgeCount}</span>
                      <span className="stat-label">{t('dashboard.edges')}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {map.tags && map.tags.length > 0 && (
                    <div className="map-tags map-tags-inline">
                      {map.tags.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                      {map.tags.length > 2 && (
                        <span className="tag-more">+{map.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="map-footer">
                <span className="map-date">
                  📅 {new Date(map.updatedAt).toLocaleDateString(i18n.language, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                
                {/* Delete Button */}
                <button
                  className="map-delete-btn"
                  onClick={(e) => handleDeleteMap(e, map)}
                  title={`Delete ${map.title}`}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with User Info & Controls */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer-content">
          <div className="dashboard-footer-left">
            {/* User Info */}
            {user && (
              <div className="dashboard-user-info">
                {user.picture && (
                  <img 
                    src={user.picture} 
                    alt={user.name || user.email} 
                    className="user-avatar"
                  />
                )}
                <span className="user-name">{user.name || user.email}</span>
              </div>
            )}
          </div>
          
          <div className="dashboard-footer-center">
            <LanguageSelector />
          </div>
          
          <div className="dashboard-footer-right">
            <button onClick={handleLogout} className="button button-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('dashboard.logout')}
            </button>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
        onClick={handleScrollToTop}
        aria-label="Scroll to top"
      >
        ↑
      </button>

      {/* Create Map Dialog */}
      {showCreateDialog && (
        <CreateMapDialog
          onConfirm={handleConfirmCreate}
          onCancel={handleCancelCreate}
        />
      )}

      {/* Edit Map Dialog */}
      {showEditDialog && editingMap && (
        <EditMapDialog
          currentTitle={editingMap.title}
          currentTags={editingMap.tags}
          onConfirm={handleConfirmEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Progress Indicator */}
      {showProgress && (
        <ProgressIndicator
          steps={progressSteps}
          message={t('dashboard.updatingMap')}
        />
      )}

      {/* Delete Map Dialog */}
      <DeleteConfirmDialog
        isOpen={!!mapToDelete}
        type="map"
        label={mapToDelete?.title}
        description={mapToDelete ? t('deleteDialog.mapDescription', { title: mapToDelete.title }) : undefined}
        stats={mapToDelete ? [
          { icon: '📊', label: t('deleteDialog.mapInfoNodes'), value: String(mapToDelete.nodeCount ?? 0) },
          { icon: '🔗', label: t('deleteDialog.mapInfoEdges'), value: String(mapToDelete.edgeCount ?? 0) },
          { icon: '📅', label: t('deleteDialog.mapInfoUpdated'), value: new Date(mapToDelete.updatedAt).toLocaleString(i18n.language) },
        ] : undefined}
        onConfirm={handleConfirmDeleteMap}
        onCancel={handleCancelDeleteMap}
        isLoading={isDeletePending}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

