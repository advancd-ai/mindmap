/**
 * ImageDisplay - Component for displaying images with local download capability
 */

import { useState, useEffect } from 'react';

interface ImageDisplayProps {
  imageUrl: string;
  alt: string;
  onError: () => void;
}

export default function ImageDisplay({ imageUrl, alt, onError }: ImageDisplayProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const downloadAndDisplayImage = async () => {
      try {
        setLoading(true);
        setError(false);

        console.log('🖼️ ImageDisplay: Attempting to download image from:', imageUrl);

        // Get auth token from localStorage
        const auth = localStorage.getItem('auth-storage');
        let authToken = null;
        if (auth) {
          const { token } = JSON.parse(auth).state;
          authToken = token;
        }

        // Prepare headers
        const headers: HeadersInit = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        // Download image as blob
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        
        // Create object URL for local display
        const objectUrl = URL.createObjectURL(blob);
        setImageData(objectUrl);
        setLoading(false);

        // Clean up object URL when component unmounts
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (err) {
        console.error('❌ Failed to download image:', err);
        setError(true);
        setLoading(false);
        onError();
      }
    };

    downloadAndDisplayImage();
  }, [imageUrl, onError]);

  const handleDownload = async () => {
    try {
      // Get auth token
      const auth = localStorage.getItem('auth-storage');
      let authToken = null;
      if (auth) {
        const { token } = JSON.parse(auth).state;
        authToken = token;
      }

      // Prepare headers
      const headers: HeadersInit = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(imageUrl, { headers });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = alt || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Failed to download image:', err);
    }
  };

  const handleOpenFullPage = () => {
    // For full page view, we need to handle authentication differently
    // Since we can't pass headers in window.open, we'll create a temporary link
    // that the user can click to download/view the full image
    const auth = localStorage.getItem('auth-storage');
    if (auth) {
      const { token } = JSON.parse(auth).state;
      if (token) {
        // Create a temporary download link with auth
        const tempLink = document.createElement('a');
        tempLink.href = imageUrl;
        tempLink.target = '_blank';
        tempLink.rel = 'noopener noreferrer';
        
        // Add auth header by creating a custom request
        fetch(imageUrl, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(response => {
          if (response.ok) {
            response.blob().then(blob => {
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener,noreferrer');
            });
          }
        }).catch(err => {
          console.error('❌ Failed to open full page:', err);
          // Fallback: try to open original URL
          window.open(imageUrl, '_blank', 'noopener,noreferrer');
        });
      } else {
        window.open(imageUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div style={{ 
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
      <div style={{ 
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
          onClick={handleOpenFullPage}
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
          🔗 Open in new tab
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
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
          onError();
        }}
      />
      
      {/* Image overlay with controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
          padding: '20px 8px 8px 8px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: '#10b981',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
            marginRight: '8px',
          }}
        >
          💾 Download
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenFullPage();
          }}
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          🔗 Open Full Page
        </button>
      </div>
    </div>
  );
}
