/**
 * Editor page - edit mindmap
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useMindMapStore } from '../store/mindmap';
import { useAuthStore } from '../store/auth';
import { fetchMap, fetchMaps, fetchMapVersion, fetchMapHistory } from '../api/maps';
import { exportPDF, viewPDF } from '../api/pdf';
import { versionSynchronizer } from '../utils/versionSync';
import { optimisticVersionManager } from '../utils/optimisticUpdate';
import MindMapCanvas from '../components/MindMapCanvas';
import AppleIcon from '../components/AppleIcon';
import LanguageSelector from '../components/LanguageSelector';
import ToolbarHelp from '../components/ToolbarHelp';
import Toast, { type ToastType } from '../components/Toast';
import VersionHistoryDialog from '../components/VersionHistoryDialog';
import ShareSettingsModal from '../components/ShareSettingsModal';
import Toolbox from '../components/Toolbox';
import GoogleAdSense from '../components/GoogleAdSense';
import './EditorPage.css';

export default function EditorPage() {
  const { t } = useTranslation();
  const { mapId } = useParams();
  const navigate = useNavigate();
  const [isNewMap, setIsNewMap] = useState(!mapId);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [indexTitle, setIndexTitle] = useState<string>('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [zoom, setZoom] = useState(1.0); // Zoom level (1.0 = 100%)
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAd, setShowAd] = useState(false); // Ad visibility (shown on save)
  const [adCountdown, setAdCountdown] = useState(10); // Ad countdown timer
  const [isViewingPDF, setIsViewingPDF] = useState(false); // PDF view state
  const isReadOnly = !isNewMap && !isLatestVersion;

  // Listen for zoom change events from Toolbox
  useEffect(() => {
    const handleZoomChange = (e: CustomEvent<{ zoom: number }>) => {
      setZoom(e.detail.zoom);
    };
    
    window.addEventListener('toolbox-zoom-change', handleZoomChange as EventListener);
    
    return () => {
      window.removeEventListener('toolbox-zoom-change', handleZoomChange as EventListener);
    };
  }, []);
  
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const selectedEdgeId = useMindMapStore((state) => state.selectedEdgeId);
  const addNode = useMindMapStore((state) => state.addNode);
  const deleteNode = useMindMapStore((state) => state.deleteNode);
  const deleteEdge = useMindMapStore((state) => state.deleteEdge);
  const selectNode = useMindMapStore((state) => state.selectNode);
  const selectEdge = useMindMapStore((state) => state.selectEdge);

  const map = useMindMapStore((state) => state.map);
  const setMap = useMindMapStore((state) => state.setMap);
  const isDirty = useMindMapStore((state) => state.isDirty);
  const isSaving = useMindMapStore((state) => state.isSaving);
  const reset = useMindMapStore((state) => state.reset);
  const canvasSaveHandlerRef = useRef<(() => void) | null>(null);
  const canvasForceSaveHandlerRef = useRef<(() => void) | null>(null);
  const hasAutoSavedRef = useRef<string | null>(null); // Track which map ID has been auto-saved

  // Stable callback for onSave prop (must be outside JSX to avoid hook order issues)
  const handleSaveCallback = useCallback((saveHandler: () => void, forceSaveHandler?: () => void) => {
    canvasSaveHandlerRef.current = saveHandler;
    if (forceSaveHandler) {
      canvasForceSaveHandlerRef.current = forceSaveHandler;
    }
  }, []);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  // Fetch index to get the immutable title
  const { data: indexData } = useQuery({
    queryKey: ['maps'],
    queryFn: () => fetchMaps(),
    enabled: !!mapId,
  });

  // Fetch map if editing existing
  const { data: fetchedMap, isLoading: isFetchingMap, error: fetchError } = useQuery({
    queryKey: ['map', mapId],
    queryFn: () => fetchMap(mapId!),
    enabled: !!mapId,
  });

  // Update index title when index data is fetched
  useEffect(() => {
    if (indexData && mapId) {
      const indexItem = indexData.find((item) => item.id === mapId);
      if (indexItem) {
        setIndexTitle(indexItem.title);
        console.log('📋 Index title loaded:', indexItem.title);
      }
    }
  }, [indexData, mapId]);

  // Fetch latest version from history when mapId changes
  useEffect(() => {
    const fetchLatestVersion = async () => {
      if (mapId) {
        try {
          console.log(`🔄 Fetching latest version for mapId: ${mapId}`);
          const history = await fetchMapHistory(mapId); // No progress callback for background fetch
          if (history && history.length > 0) {
            const latest = Math.max(...history.map(v => v.version));
            setLatestVersion(latest);
            console.log(`📚 Latest version detected: ${latest} (from ${history.length} versions)`);
          } else {
            console.log('📚 No version history found');
            setLatestVersion(null);
          }
        } catch (error) {
          console.error('Failed to fetch version history:', error);
          setLatestVersion(null);
          // If we can't fetch history, assume current version is latest
          if (map) {
            setLatestVersion(map.version);
            console.log(`📚 Assuming current version ${map.version} is latest due to fetch error`);
          }
        }
      } else {
        setLatestVersion(null);
      }
    };

    fetchLatestVersion();
  }, [mapId, map?.version]); // Also trigger when map version changes

  // Update isLatestVersion state
  useEffect(() => {
    if (map) {
      if (isNewMap) {
        setIsLatestVersion(true); // 새 맵은 항상 최신
      } else {
        // Save 후에만 optimistic update를 고려, 버전 선택 시에는 실제 버전으로만 비교
        const hasOptimisticUpdate = optimisticVersionManager.hasPendingUpdate(mapId || '');
        const expectedVersion = optimisticVersionManager.getExpectedVersion(mapId || '', map.version);
        
        // latestVersion이 아직 로드되지 않았으면 (null) 일단 true로 설정 (낙관적 접근)
        // 실제 버전 비교는 latestVersion이 로드된 후에만 수행
        const isLatest = latestVersion === null
          ? true // 아직 로드 중이면 최신으로 가정
          : hasOptimisticUpdate 
            ? map.version >= expectedVersion 
            : map.version >= latestVersion;
          
        setIsLatestVersion(isLatest);
        
        console.log('🔍 Version Check:', {
          mapVersion: map.version,
          latestVersion,
          expectedVersion,
          isLatest,
          isNewMap,
          hasOptimisticUpdate,
          logic: latestVersion === null ? 'pending' : (hasOptimisticUpdate ? 'optimistic' : 'actual')
        });
      }
    } else {
      setIsLatestVersion(true); // 맵이 없으면 기본적으로 최신
    }
  }, [latestVersion, map, isNewMap, mapId]);


  // Debug readonly condition and save button visibility
  useEffect(() => {
    const isReadOnlyCondition = !isNewMap && !isLatestVersion;
    const saveButtonVisible = (isNewMap || isLatestVersion); // 새 맵이거나 최신 버전이면 표시
    const saveHandlerReady = !!canvasSaveHandlerRef.current;
    
    console.log('🔍 Save Button Debug:', {
      latestVersion,
      mapVersion: map?.version,
      mapExists: !!map,
      isLatestVersion,
      isReadOnlyCondition,
      isNewMap,
      saveButtonVisible,
      saveHandlerReady,
      canShowSaveButton: saveButtonVisible && saveHandlerReady,
      mapId
    });
  }, [latestVersion, map, mapId, isNewMap, isLatestVersion]);

  // Cleanup optimistic state when component unmounts
  useEffect(() => {
    return () => {
      if (mapId) {
        optimisticVersionManager.clearOptimisticState(mapId);
      }
    };
  }, [mapId]);


  // Enhanced refresh to latest version function with polling
  const refreshToLatestVersion = async () => {
    if (!mapId || !map) return;
    
    setIsRefreshing(true);
    setRefreshProgress(0);
    
    try {
      const currentVersion = map.version;
      const expectedVersion = currentVersion + 1; // Save 후 예상되는 새 버전
      
      console.log(`🔄 Refreshing to latest version: expecting v${expectedVersion}`);
      
      // Optimistic update: 즉시 버전을 증가시킴
      optimisticVersionManager.optimisticIncrementVersion(mapId, currentVersion);
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setRefreshProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          const next = prev + Math.random() * 10;
          return Math.min(90, Math.max(prev, next));
        });
      }, 300);

      // Polling 방식으로 최신 버전이 반영될 때까지 대기
      const actualLatestVersion = await versionSynchronizer.waitForLatestVersionWithBackoff(
        mapId,
        expectedVersion,
        (mapId) => fetchMapHistory(mapId), // No progress callback for polling
        (attempt, latestVersion, nextDelay) => {
          console.log(`⏳ Attempt ${attempt}: latest version ${latestVersion}, next check in ${nextDelay}ms`);
          setRefreshProgress((prev) => {
            const candidate = Math.min(90, attempt * 10);
            return Math.max(prev, candidate);
          });
        }
      );

      // 실제 최신 버전으로 맵 로드
      const latestMap = await fetchMapVersion(mapId, actualLatestVersion);
      setMap(latestMap);
      
      // Optimistic update 확인
      optimisticVersionManager.confirmVersion(mapId, actualLatestVersion);
      
      // Progress 완료
      clearInterval(progressInterval);
      setRefreshProgress(100);
      
      // Success message removed - ad will be shown instead
      console.log(`✅ Successfully refreshed to version ${actualLatestVersion}`);
      
    } catch (error) {
      console.error('Failed to refresh to latest version:', error);
      
      // Optimistic update 실패 처리
      if (mapId) {
        optimisticVersionManager.failVersionUpdate(mapId);
      }
      
      setToast({
        message: t('editor.refreshError'),
        type: 'error'
      });
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Update map state when fetched
  useEffect(() => {
    if (fetchedMap && mapId) {
      console.log('📖 Map fetched, setting state:', fetchedMap);
      setMap(fetchedMap);
      setIsNewMap(false);
    }
  }, [fetchedMap, mapId, setMap]);

  // Auto-hide ad after 10 seconds with countdown (only when ad is shown)
  useEffect(() => {
    if (showAd) {
      setAdCountdown(10);
      
      const interval = setInterval(() => {
        setAdCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowAd(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [showAd]);


  // Initialize new map (only if not already set from Dashboard)
  useEffect(() => {
    if (!mapId && !map) {
      console.log('⚠️ New map without data - redirecting to dashboard');
      // If no mapId and no map data, redirect to dashboard
      // User should create map through dashboard dialog
      navigate('/dashboard');
    }
  }, [mapId, map, navigate]);

  // Auto-save new map with root node on initial load
  useEffect(() => {
    if (isNewMap && map && map.nodes.length === 1) {
      // Check if this map has already been auto-saved
      if (hasAutoSavedRef.current === map.id) {
        return; // Already auto-saved this map
      }
      
      // Check if this is the initial load (not after user edits)
      // Only auto-save if map has exactly 1 node (root node) and no edges
      if (map.edges.length === 0) {
        console.log('💾 Auto-saving new map with root node (force save, no dialog)...', {
          mapId: map.id,
          nodeCount: map.nodes.length,
          edgeCount: map.edges.length,
          isDirty,
          hasSaveHandler: !!canvasSaveHandlerRef.current,
          hasForceSaveHandler: !!canvasForceSaveHandlerRef.current
        });
        
        // Wait for force save handler to be ready, then auto-save without dialog
        const checkAndSave = () => {
          // Prefer force save handler (no dialog), fallback to regular save handler
          const saveHandler = canvasForceSaveHandlerRef.current || canvasSaveHandlerRef.current;
          
          if (saveHandler && hasAutoSavedRef.current !== map.id) {
            hasAutoSavedRef.current = map.id; // Mark this map as auto-saved
            console.log('✅ Auto-save triggered for new map (force save:', !!canvasForceSaveHandlerRef.current, ')');
            saveHandler();
          } else if (!saveHandler) {
            // Save handler not ready yet, try again after a short delay
            setTimeout(checkAndSave, 200);
          }
        };
        
        // Start checking after a small delay to ensure canvas is initialized
        const timer = setTimeout(checkAndSave, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isNewMap, map, isDirty]);


  const handleBack = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    reset();
    navigate('/dashboard');
  };

  const handleVersionSelect = async (version: number) => {
    try {
      console.log(`🔄 Loading version ${version} of map ${mapId}`);
      const versionMap = await fetchMapVersion(mapId!, version);
      setMap(versionMap);
      console.log(`✅ Loaded version ${version}`);
      
      // Clear any optimistic updates when loading a specific version
      if (mapId) {
        optimisticVersionManager.clearOptimisticState(mapId);
        console.log(`🧹 Cleared optimistic state for version selection`);
      }
      
      // Refresh latest version after loading a specific version
      const history = await fetchMapHistory(mapId!);
      if (history && history.length > 0) {
        const latest = Math.max(...history.map(v => v.version));
        setLatestVersion(latest);
        
        // Check if the loaded version is the latest
        const isLatest = version >= latest;
        setIsLatestVersion(isLatest);
        
        console.log(`📚 Version selection debug:`, {
          selectedVersion: version,
          latestVersion: latest,
          isLatest,
          isNewMap: false, // Always false when selecting from history
          willBeReadOnly: !isLatest
        });
      }
    } catch (error) {
      console.error(`❌ Failed to load version ${version}:`, error);
      setToast({ message: `Failed to load version ${version}`, type: 'error' });
    }
  };

  const handleLogout = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to logout?')) {
        return;
      }
    }
    reset();
    logout();
    navigate('/login');
  };

  // Handle PDF view
  const handleViewPDF = async () => {
    if (!map || !mapId || isViewingPDF) return;

    try {
      setIsViewingPDF(true);
      
      // Get current page URL
      const currentUrl = window.location.href;
      
      // Export PDF
      const pdfBlob = await exportPDF(currentUrl, {
        format: 'A4',
        landscape: true,
      });
      
      // View PDF in new tab
      viewPDF(pdfBlob);
      
      // Show success message
      setToast({ message: t('editor.pdfViewSuccess'), type: 'success' });
    } catch (error: any) {
      console.error('PDF view error:', error);
      setToast({ 
        message: error.message || t('editor.pdfViewError'), 
        type: 'error' 
      });
    } finally {
      setIsViewingPDF(false);
    }
  };


  if (isFetchingMap) {
    return <div className="loading-page">
      <p>Loading map...</p>
    </div>;
  }

  if (fetchError) {
    return <div className="loading-page">
      <p>❌ Error loading map</p>
      <pre>{JSON.stringify(fetchError, null, 2)}</pre>
      <button onClick={handleBack} className="button">
        {t('editor.back')}
      </button>
    </div>;
  }

  if (!map) {
    return <div className="loading-page">
      <p>No map data...</p>
    </div>;
  }

  return (
    <div className="editor-page page">
      <header className="editor-header">
        <div className="editor-header-left">
          <button onClick={handleBack} className="button button-secondary">
            {t('editor.back')}
          </button>
          
          <span className="breadcrumb-separator">|</span>
          
          {/* Breadcrumb Navigation */}
          <div className="breadcrumb">
            <span className="breadcrumb-user">
              {user?.email || user?.name || 'User'}
            </span>
            <span className="breadcrumb-arrow">›</span>
            <span className="breadcrumb-title" title={indexTitle || map.title || t('editor.untitled')}>
              {indexTitle || map.title || t('editor.untitled')}
            </span>
          </div>
        </div>

        <div className="editor-header-right">
          {isReadOnly && (
            <div
              className="readonly-chip"
              title={t('editor.readonlySubtitle')}
            >
              <AppleIcon name="lock" size="small" className="readonly-chip__icon" />
              <span className="readonly-chip__text">{t('editor.readonly')}</span>
            </div>
          )}
          {/* Share button, PDF export button, Save button, and Unsaved indicator */}
          <div className="editor-actions">
            {mapId && (
              <>
                <button
                  className="button button-secondary share-button"
                  onClick={() => setShowShareModal(true)}
                  title="Share map"
                >
                <svg
                  className="share-button__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 483 483"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M395.72,0c-48.204,0-87.281,39.078-87.281,87.281c0,2.036,0.164,4.03,0.309,6.029l-161.233,75.674
                    c-15.668-14.971-36.852-24.215-60.231-24.215c-48.204,0.001-87.282,39.079-87.282,87.282c0,48.204,39.078,87.281,87.281,87.281
                    c15.206,0,29.501-3.907,41.948-10.741l69.789,58.806c-3.056,8.896-4.789,18.396-4.789,28.322c0,48.204,39.078,87.281,87.281,87.281
                    c48.205,0,87.281-39.078,87.281-87.281s-39.077-87.281-87.281-87.281c-15.205,0-29.5,3.908-41.949,10.74l-69.788-58.805
                    c3.057-8.891,4.789-18.396,4.789-28.322c0-2.035-0.164-4.024-0.308-6.029l161.232-75.674c15.668,14.971,36.852,24.215,60.23,24.215
                    c48.203,0,87.281-39.078,87.281-87.281C482.999,39.079,443.923,0,395.72,0z"
                    fill="currentColor"
                  />
                </svg>
                <span className="share-button__label">
                  {map?.shareEnabled ? 'Shared' : 'Share'}
                </span>
              </button>
              <button
                className={`button button-secondary pdf-view-button${isViewingPDF ? ' viewing' : ''}`}
                onClick={handleViewPDF}
                disabled={isViewingPDF || !map}
                title={isViewingPDF ? t('editor.viewingPDF') : t('editor.viewPDF')}
                aria-label={isViewingPDF ? t('editor.viewingPDF') : t('editor.viewPDF')}
                aria-busy={isViewingPDF}
              >
                {isViewingPDF ? (
                  <>
                    <svg
                      className="pdf-button__icon spinning"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    <span className="pdf-button__label">{t('editor.viewingPDF')}</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="pdf-button__icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span className="pdf-button__label">{t('editor.viewPDF')}</span>
                  </>
                )}
              </button>
              </>
            )}
            {(isNewMap || isLatestVersion) && (
              <button
                className={`button button-primary save-button${isSaving ? ' saving' : ''}`}
                onClick={() => {
                  if (!isSaving) {
                    canvasSaveHandlerRef.current?.();
                    // Show ad when save button is clicked
                    setShowAd(true);
                    setAdCountdown(10);
                  }
                }}
                disabled={!isDirty || !canvasSaveHandlerRef.current || isSaving}
                title={!canvasSaveHandlerRef.current ? "Save handler not ready" : "Save mindmap"}
              >
                💾 {isSaving ? t('editor.saving') : t('editor.save')}
              </button>
            )}
            {isDirty && <span className="unsaved-indicator">{t('editor.unsavedChanges')}</span>}
          </div>
        </div>
      </header>

      <div className="editor-content">
        {/* Google AdSense - Positioned at 1/3 of screen height */}
        {map && showAd && (
          <div 
            className="editor-ad-container"
            onClick={() => {
              setShowAd(false);
              setAdCountdown(0);
            }}
            style={{ cursor: 'pointer' }}
          >
            <div 
              className="editor-ad-banner"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              <div className="editor-ad-icon">✨</div>
              <div className="editor-ad-message">{t('share.adBanner')}</div>
              {adCountdown > 0 && (
                <div className="editor-ad-countdown">{adCountdown}</div>
              )}
            </div>
            <div 
              style={{ position: 'relative' }}
              onClick={(e) => {
                // Only close if clicking on the container itself, not the ad
                if (e.target === e.currentTarget) {
                  setShowAd(false);
                  setAdCountdown(0);
                }
              }}
            >
              <GoogleAdSense
                adFormat="horizontal"
                fullWidthResponsive={true}
              />
              {/* Close ad when clicking on ad (after a short delay to allow ad click) */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10,
                  pointerEvents: 'none'
                }}
                onClick={() => {
                  // Allow ad click to go through, then close after a delay
                  setTimeout(() => {
                    setShowAd(false);
                    setAdCountdown(0);
                  }, 100);
                }}
              />
            </div>
          </div>
        )}

        <MindMapCanvas 
          isReadOnly={isReadOnly}
          onRefreshToLatest={refreshToLatestVersion}
          isRefreshing={isRefreshing}
          refreshProgress={refreshProgress}
          onSave={handleSaveCallback}
          onZoomChange={setZoom}
          zoom={zoom}
        />
        
        {/* Floating Toolbox */}
        {map && (
          <Toolbox
            isConnecting={isConnecting}
            zoom={zoom}
            onAddNode={() => {
              // Add node at center or near selected node
              const centerX = 600;
              const centerY = 400;
              const x = selectedNodeId 
                ? (map.nodes.find(n => n.id === selectedNodeId)?.x || centerX) + 180
                : centerX;
              const y = selectedNodeId
                ? (map.nodes.find(n => n.id === selectedNodeId)?.y || centerY) + 100
                : centerY;
              
              addNode({
                id: `n_${Date.now()}`,
                label: 'New Node',
                x,
                y,
                w: 150,
                h: 80,
                contentType: 'richeditor',
              });
            }}
            onConnect={() => {
              if (selectedNodeId) {
                // Dispatch custom event that MindMapCanvas will listen to
                window.dispatchEvent(new CustomEvent('toolbox-start-connection', { 
                  detail: { nodeId: selectedNodeId } 
                }));
                setIsConnecting(true);
              }
            }}
            onCancelConnection={() => {
              // Dispatch custom event to cancel connection
              window.dispatchEvent(new CustomEvent('toolbox-cancel-connection'));
              setIsConnecting(false);
            }}
            onEdit={() => {
              // Edit will be handled by keyboard shortcuts or context menu
              // This is a placeholder - actual edit logic is in MindMapCanvas
              if (selectedNodeId || selectedEdgeId) {
                // Trigger edit via keyboard event simulation
                const event = new KeyboardEvent('keydown', {
                  key: 'e',
                  code: 'KeyE',
                  bubbles: true,
                  cancelable: true,
                });
                document.dispatchEvent(event);
              }
            }}
            onDelete={() => {
              if (selectedNodeId) {
                if (confirm('Delete this node?')) {
                  deleteNode(selectedNodeId);
                  selectNode(null);
                }
              } else if (selectedEdgeId) {
                if (confirm('Delete this edge?')) {
                  deleteEdge(selectedEdgeId);
                  selectEdge(null);
                }
              }
            }}
            onChangeShape={() => {
              if (selectedNodeId) {
                // Shape change will be handled by context menu
                // This is a placeholder
                const event = new KeyboardEvent('keydown', {
                  key: 's',
                  code: 'KeyS',
                  bubbles: true,
                  cancelable: true,
                });
                document.dispatchEvent(event);
              }
            }}
            onEmbed={() => {
              if (selectedNodeId) {
                // Embed will be handled by context menu
                const event = new KeyboardEvent('keydown', {
                  key: 'i',
                  code: 'KeyI',
                  bubbles: true,
                  cancelable: true,
                });
                document.dispatchEvent(event);
              }
            }}
            onZoomIn={() => {
              const newZoom = Math.min(5.0, Math.round((zoom + 0.1) * 10) / 10);
              setZoom(newZoom);
            }}
            onZoomOut={() => {
              const newZoom = Math.max(0.1, Math.round((zoom - 0.1) * 10) / 10);
              setZoom(newZoom);
            }}
            onResetZoom={() => {
              setZoom(1.0);
            }}
            onFitToScreen={() => {
              // Dispatch custom event that MindMapCanvas will listen to
              window.dispatchEvent(new CustomEvent('toolbox-fit-to-screen'));
            }}
            onCenterView={() => {
              // Dispatch custom event that MindMapCanvas will listen to
              window.dispatchEvent(new CustomEvent('toolbox-center-view'));
            }}
            isReadOnly={isReadOnly}
          />
        )}
      </div>

      {/* Footer with Stats & Controls */}
      <footer className="editor-footer">
        <div className="editor-footer-content">
          <div className="editor-footer-left">
            <Link to="/about" className="editor-footer-link">
              {t('common.about')}
            </Link>
          </div>
          
          <div className="editor-footer-center">
            <span className="editor-footer-info">
              🔍 {Math.round(zoom * 100)}%
            </span>
            <span className="editor-footer-separator">·</span>
            <span className="editor-footer-info">
              📊 {map.nodes.length} {t('canvas.nodes')}
            </span>
            <span className="editor-footer-separator">·</span>
            <span className="editor-footer-info">
              🔗 {map.edges.length} {t('canvas.edges')}
            </span>
            {(() => {
              const collapsedCount = map.nodes.filter(n => n.collapsed).length;
              if (collapsedCount > 0) {
                return (
                  <>
                    <span className="editor-footer-separator">·</span>
                    <span className="editor-footer-info">
                      📁 {collapsedCount} collapsed
                    </span>
                  </>
                );
              }
              return null;
            })()}
            <span className="editor-footer-separator">·</span>
            <button 
              className="editor-footer-version-button"
              onClick={() => setShowVersionHistory(true)}
              title="View version history"
            >
              <span className="version-display">
                <span className="current-version">v{map.version}</span>
                {latestVersion && map.version < latestVersion && (
                  <span className="latest-indicator">
                    <span className="latest-version">→ v{latestVersion}</span>
                  </span>
                )}
              </span>
            </button>
          </div>
          
          <div className="editor-footer-right">
            <LanguageSelector />
            <span className="editor-footer-separator">·</span>
            <ToolbarHelp />
            <span className="editor-footer-separator">·</span>
            <button 
              onClick={handleLogout}
              className="button button-secondary"
              title={t('editor.logout')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('editor.logout')}
            </button>
          </div>
        </div>
      </footer>


      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Share Settings Modal */}
      {showShareModal && mapId && (
        <ShareSettingsModal
          mapId={mapId}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Version History Dialog */}
      {showVersionHistory && mapId && (
        <VersionHistoryDialog
          mapId={mapId}
          currentVersion={map.version}
          latestVersion={latestVersion}
          onVersionSelect={handleVersionSelect}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}
