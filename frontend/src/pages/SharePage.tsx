/**
 * Share Page - Read-only map viewer via share link
 * Route: /share/:token
 * No authentication required
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSharedMap } from '../api/share';
import { useMindMapStore } from '../store/mindmap';
import MindMapCanvas from '../components/MindMapCanvas';
import PasswordPrompt from '../components/PasswordPrompt';
import './SharePage.css';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');

  const setMap = useMindMapStore((state) => state.setMap);
  const map = useMindMapStore((state) => state.map);

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
        <MindMapCanvas 
          isReadOnly={true}
        />
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

