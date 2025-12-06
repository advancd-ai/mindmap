/**
 * Share Page - Read-only map viewer via share link
 * Route: /share/:token
 * No authentication required
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchSharedMap } from '../api/share';
import { useMindMapStore } from '../store/mindmap';
import MindMapCanvas from '../components/MindMapCanvas';
import PasswordPrompt from '../components/PasswordPrompt';
import GoogleAdSense from '../components/GoogleAdSense';
import Toolbox from '../components/Toolbox';
import './SharePage.css';

export default function SharePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [zoom, setZoom] = useState(1.0); // Zoom level (1.0 = 100%)
  const [showAd, setShowAd] = useState(true); // Ad visibility
  const [adCountdown, setAdCountdown] = useState(10); // Ad countdown timer

  const setMap = useMindMapStore((state) => state.setMap);
  const map = useMindMapStore((state) => state.map);

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

  // Fetch shared map
  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-map', token, password],
    queryFn: () => fetchSharedMap(token!, password || undefined),
    enabled: !!token,
    retry: false,
  });

  // Show password prompt if password required
  useEffect(() => {
    if (error && (error as any).response?.status === 401) {
      const errorCode = (error as any).response?.data?.error?.code;
      if (errorCode === 'SHARE_401_PASSWORD_REQUIRED') {
        setShowPasswordPrompt(true);
        setPasswordError('');
      } else if (errorCode === 'SHARE_401_PASSWORD_INVALID') {
        setPasswordError('Invalid password. Please try again.');
        setShowPasswordPrompt(true);
      }
    }
  }, [error]);

  // Set map when data is loaded
  useEffect(() => {
    if (data?.ok && data.data?.map) {
      console.log('📝 Setting map in store:', data.data.map.id);
      setMap(data.data.map);
      console.log('✅ Map set in store');
    }
  }, [data, setMap]);

  // Auto-hide ad after 10 seconds with countdown
  useEffect(() => {
    if (map && data?.ok && showAd) {
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
  }, [map, data, showAd]);

  // Auto-fit to screen when map is first loaded (Share page only)
  const hasAutoFittedRef = useRef(false);
  useEffect(() => {
    if (map && map.nodes && map.nodes.length > 0 && !hasAutoFittedRef.current) {
      // Wait a bit for MindMapCanvas to be ready
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('toolbox-fit-to-screen'));
        hasAutoFittedRef.current = true;
        console.log('📐 Auto-fit to screen on initial load');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [map]);


  const handlePasswordSubmit = (pwd: string) => {
    setPassword(pwd);
    setShowPasswordPrompt(false);
    setPasswordError('');
  };

  const handlePasswordCancel = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="share-page loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading shared map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorData = (error as any).response?.data;
    const errorCode = errorData?.error?.code;
    const errorMessage = errorData?.error?.message || 'Failed to load shared map';

    if (errorCode === 'SHARE_401_PASSWORD_REQUIRED' || errorCode === 'SHARE_401_PASSWORD_INVALID') {
      // Password prompt will be shown
    } else {
      return (
        <div className="share-page error">
          <div className="error-content">
            <h1>Unable to Load Map</h1>
            <p>{errorMessage}</p>
            {errorCode === 'SHARE_403_EXPIRED' && (
              <p className="error-hint">This share link has expired.</p>
            )}
            {errorCode === 'SHARE_403_DISABLED' && (
              <p className="error-hint">This share link has been disabled.</p>
            )}
            {errorCode === 'SHARE_404_NOT_FOUND' && (
              <p className="error-hint">This share link does not exist or has been removed.</p>
            )}
            <button className="btn-primary" onClick={() => navigate('/')}>
              Go to Home
            </button>
          </div>
        </div>
      );
    }
  }

  if (!data?.ok || !data.data) {
    return (
      <div className="share-page error">
        <div className="error-content">
          <h1>Map Not Found</h1>
          <p>The shared map could not be loaded.</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { map: sharedMapData } = data.data;

  // Wait for map to be set in store before rendering canvas
  // Check if map is loaded and matches the shared map data
  if (!map || !map.nodes || !map.edges || map.id !== sharedMapData.id) {
    return (
      <div className="share-page loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="share-header-content">
          <h1>{map.title}</h1>
          <span className="share-readonly-badge">Read-only</span>
        </div>
        <button 
          className="btn-secondary share-open-in-app"
          onClick={() => navigate('/login')}
        >
          Open in App
        </button>
      </header>

      <div className="share-content">
        {/* Google AdSense - Positioned at 1/3 of screen height */}
        {map && data?.ok && showAd && (
          <div 
            className="share-ad-container"
            onClick={() => setShowAd(false)}
            style={{ cursor: 'pointer' }}
          >
            <div 
              className="share-ad-banner"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="share-ad-icon">✨</div>
              <div className="share-ad-message">{t('share.adBanner')}</div>
              {adCountdown > 0 && (
                <div className="share-ad-countdown">{adCountdown}</div>
              )}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <GoogleAdSense
                adFormat="horizontal"
                fullWidthResponsive={true}
              />
            </div>
          </div>
        )}
        <MindMapCanvas 
          isReadOnly={true}
          zoom={zoom}
        />
        
        {/* Floating Toolbox - Read-only with zoom controls */}
        {map && (
          <Toolbox
            isConnecting={false}
            zoom={zoom}
            onAddNode={() => {}} // Not used in read-only mode
            onConnect={() => {}} // Not used in read-only mode
            onCancelConnection={() => {}} // Not used in read-only mode
            onEdit={() => {}} // Not used in read-only mode
            onDelete={() => {}} // Not used in read-only mode
            onChangeShape={() => {}} // Not used in read-only mode
            onEmbed={() => {}} // Not used in read-only mode
            onZoomIn={() => {
              const newZoom = Math.min(5.0, Math.round((zoom + 0.1) * 10) / 10);
              setZoom(newZoom);
              // Dispatch event to ensure MindMapCanvas receives the zoom change
              window.dispatchEvent(new CustomEvent('toolbox-zoom-change', { detail: { zoom: newZoom } }));
            }}
            onZoomOut={() => {
              const newZoom = Math.max(0.1, Math.round((zoom - 0.1) * 10) / 10);
              setZoom(newZoom);
              // Dispatch event to ensure MindMapCanvas receives the zoom change
              window.dispatchEvent(new CustomEvent('toolbox-zoom-change', { detail: { zoom: newZoom } }));
            }}
            onResetZoom={() => {
              const newZoom = 1.0;
              setZoom(newZoom);
              // Dispatch event to ensure MindMapCanvas receives the zoom change
              window.dispatchEvent(new CustomEvent('toolbox-zoom-change', { detail: { zoom: newZoom } }));
            }}
            onFitToScreen={() => {
              // Dispatch custom event that MindMapCanvas will listen to
              window.dispatchEvent(new CustomEvent('toolbox-fit-to-screen'));
            }}
            onCenterView={() => {
              // Dispatch custom event that MindMapCanvas will listen to
              window.dispatchEvent(new CustomEvent('toolbox-center-view'));
            }}
            isReadOnly={true}
          />
        )}
      </div>

      {showPasswordPrompt && (
        <PasswordPrompt
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
          error={passwordError}
        />
      )}
    </div>
  );
}

