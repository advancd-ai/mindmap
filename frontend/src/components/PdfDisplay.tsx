/**
 * PdfDisplay - PDF 파일을 인증된 다운로드 API를 통해 표시
 */

import { useState, useEffect } from 'react';

interface PdfDisplayProps {
  pdfUrl: string;
  title: string;
  onError: () => void;
}

export default function PdfDisplay({ pdfUrl, title, onError }: PdfDisplayProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true);
        setError(false);

        console.log('📄 PdfDisplay: Fetching PDF from:', pdfUrl);

        // Get auth token from localStorage
        const auth = localStorage.getItem('auth-storage');
        let authToken = null;
        if (auth) {
          const { token } = JSON.parse(auth).state;
          authToken = token;
        }

        // Prepare headers with authentication
        const headers: HeadersInit = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        // Fetch PDF with authentication
        const response = await fetch(pdfUrl, {
          mode: 'cors',
          credentials: 'omit',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Create object URL for PDF display
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
        setLoading(false);

        // Clean up object URL when component unmounts
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (err) {
        console.error('❌ Failed to fetch PDF:', err);
        setError(true);
        setLoading(false);
        onError();
      }
    };

    fetchPdf();
  }, [pdfUrl, onError]);

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

      const response = await fetch(pdfUrl, { headers });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = title || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Failed to download PDF:', err);
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
        color: '#dc2626'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌</div>
          <div>Failed to load PDF</div>
          <button
            onClick={handleDownload}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Download Instead
          </button>
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
      {/* PDF overlay with controls */}
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
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: '#dc2626',
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          📄 Open PDF
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          style={{
            marginLeft: '8px',
            padding: '6px 12px',
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          💾 Download
        </button>
      </div>
    </div>
  );
}

