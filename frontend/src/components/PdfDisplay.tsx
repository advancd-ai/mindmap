/**
 * PdfDisplay - PDF 파일을 인증된 다운로드 API를 통해 표시
 */

import { useState, useEffect } from 'react';

interface PdfDisplayProps {
  pdfUrl: string;
  title: string;
  onError: () => void;
  onRequestFullView?: (viewerUrl: string) => void;
}

export default function PdfDisplay({ pdfUrl, title, onError, onRequestFullView }: PdfDisplayProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let abortController: AbortController | null = new AbortController();
    let isActive = true;

    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(false);

        console.log('📄 PdfDisplay: Fetching PDF from:', pdfUrl);

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

        // Prepare headers with authentication
        const headers: HeadersInit = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        // Add share token to URL if on Share page
        let fetchUrl = pdfUrl;
        try {
          const url = new URL(pdfUrl);
          if (shareToken) {
            url.searchParams.set('shareToken', shareToken);
          }
          fetchUrl = url.toString();
        } catch {
          if (shareToken) {
            const separator = pdfUrl.includes('?') ? '&' : '?';
            fetchUrl = `${pdfUrl}${separator}shareToken=${shareToken}`;
          }
        }

        // Fetch PDF with authentication
        const response = await fetch(fetchUrl, {
          mode: 'cors',
          credentials: 'omit',
          headers,
          signal: abortController?.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        // Create object URLs for display and download
        const displayUrl = URL.createObjectURL(blob);

        if (!isActive) {
          URL.revokeObjectURL(displayUrl);
          return;
        }

        setPdfBlobUrl(displayUrl);
        setLoading(false);
      } catch (err) {
        if (abortController?.signal.aborted) {
          console.log('📄 PdfDisplay: fetch aborted');
          return;
        }
        console.error('❌ Failed to fetch PDF:', err);
        setError(true);
        setLoading(false);
        onError();
      }
    };

    fetchPdf();

    return () => {
      isActive = false;
      abortController?.abort();
      abortController = null;
    };
  }, [pdfUrl, onError]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
          <div>Loading PDF...</div>
        </div>
      </div>
    );
  }

  if (error || !pdfBlobUrl) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        textAlign: 'center',
        padding: '16px',
      }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
          <div>Failed to load PDF</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <iframe
        src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        title={title}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        onError={() => {
          console.error('❌ Failed to display PDF in iframe');
          setError(true);
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (pdfBlobUrl) {
              onRequestFullView?.(pdfBlobUrl);
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '999px',
            color: '#374151',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(55, 65, 81, 0.15)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
          }}
          type="button"
          aria-label="Open PDF viewer"
          tabIndex={0}
          disabled={!pdfBlobUrl}
        >
          📄 Open Viewer
        </button>
      </div>
    </div>
  );
}

