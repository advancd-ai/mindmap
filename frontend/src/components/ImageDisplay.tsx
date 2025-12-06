/**
 * ImageDisplay - Component for displaying images with local download capability
 */

import { useState, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface ImageDisplayProps {
  imageUrl: string;
  alt: string;
  onError: () => void;
}

export default function ImageDisplay({ imageUrl, alt, onError }: ImageDisplayProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    const attemptFetch = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(false);

        console.log('🖼️ ImageDisplay: Attempting to download image from:', imageUrl);

        // Check if we're on a Share page
        const isSharePage = window.location.pathname.startsWith('/share/');
        let shareToken: string | null = null;
        if (isSharePage) {
          const pathMatch = window.location.pathname.match(/^\/share\/([^/]+)/);
          if (pathMatch) {
            shareToken = pathMatch[1];
          }
        }

        // Get auth token from localStorage (only if not on Share page)
        let authToken = null;
        if (!isSharePage) {
          const auth = localStorage.getItem('auth-storage');
          if (auth) {
            const { token } = JSON.parse(auth).state;
            authToken = token;
          }
        }

        // Prepare headers
        const headers: HeadersInit = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        // Cache buster to avoid stale responses
        let fetchUrl = imageUrl;
        try {
          const url = new URL(imageUrl);
          url.searchParams.set('_r', Date.now().toString());
          // Add share token if on Share page
          if (shareToken) {
            url.searchParams.set('shareToken', shareToken);
          }
          fetchUrl = url.toString();
        } catch {
          const separator = imageUrl.includes('?') ? '&' : '?';
          fetchUrl = `${imageUrl}${separator}_r=${Date.now()}${shareToken ? `&shareToken=${shareToken}` : ''}`;
        }

        // Download image as blob
        const response = await fetch(fetchUrl, {
          mode: 'cors',
          credentials: 'omit',
          headers,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();

        if (!isMounted) {
          return;
        }

        cleanup();
        objectUrl = URL.createObjectURL(blob);
        setImageData(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error('❌ Failed to download image:', err);
        if (!isMounted) return;
        setError(true);
        setLoading(false);
        onErrorRef.current?.();
      }
    };

    if (isVisible) {
      attemptFetch();
    }

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [imageUrl, isVisible, reloadKey]);

  if (loading) {
    return (
      <div
        ref={containerRef}
        style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f9fafb',
        color: '#6b7280',
        fontSize: '12px'
      }}>
        📥 Downloading image...
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div
        ref={containerRef}
        style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f9fafb',
        color: '#6b7280',
        fontSize: '12px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '8px' }}>⚠️ Failed to load image</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setError(false);
            setLoading(true);
            setReloadKey((key) => key + 1);
          }}
          style={{
            padding: '6px 12px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <img
        src={imageData}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        onError={() => {
          console.error('❌ Failed to display local image');
          setError(true);
          onErrorRef.current?.();
        }}
      />
      
    </div>
  );
}
