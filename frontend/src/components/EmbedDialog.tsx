/**
 * EmbedDialog - Dialog for adding web embed URLs
 */

import { useState } from 'react';
import './EmbedDialog.css';

interface EmbedDialogProps {
  mapId: string;
  onSave: (url: string, type: 'youtube' | 'webpage' | 'image' | 'pdf') => void;
  onCancel: () => void;
}

export default function EmbedDialog({ mapId, onSave, onCancel }: EmbedDialogProps) {
  const [url, setUrl] = useState('');
  const [embedType, setEmbedType] = useState<'youtube' | 'webpage' | 'image' | 'pdf'>('webpage');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const detectEmbedType = (inputUrl: string): 'youtube' | 'webpage' | 'image' | 'pdf' => {
    // Detect YouTube URLs by parsing and checking the hostname rather than using a substring match
    try {
      const urlObj = new URL(inputUrl);
      const hostname = urlObj.hostname.toLowerCase();
      const isYoutubeDomain =
        hostname === 'youtube.com' ||
        hostname === 'www.youtube.com' ||
        hostname === 'm.youtube.com' ||
        hostname === 'youtu.be' ||
        hostname.endsWith('.youtube.com');
      if (isYoutubeDomain) {
        return 'youtube';
      }
    } catch (e) {
      // If URL parsing fails (e.g., relative URL), fall back to a conservative substring check
      const lower = inputUrl.toLowerCase();
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        return 'youtube';
      }
    }
    
    // Check for image URLs
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(inputUrl)) {
      return 'image';
    }
    
    // Check for PDF URLs
    if (/\.pdf(\?.*)?$/i.test(inputUrl)) {
      return 'pdf';
    }
    
    return 'webpage';
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      setEmbedType(detectEmbedType(value));
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // Get auth token from localStorage
      const auth = localStorage.getItem('auth-storage');
      let authToken = null;
      if (auth) {
        const { token } = JSON.parse(auth).state;
        authToken = token;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapId', mapId);
      
      // Prepare headers
      const headers: HeadersInit = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      
      // Upload file to backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📤 File upload successful:', result);
      setUrl(result.url);
      setEmbedType(file.type.startsWith('image/') ? 'image' : 'pdf');
      setUploadedFile(file);
      
      // Auto-save after successful upload
      if (result.url) {
        console.log('🔄 Auto-saving uploaded file...');
        onSave(result.url, file.type.startsWith('image/') ? 'image' : 'pdf');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('파일 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('이미지 또는 PDF 파일만 업로드할 수 있습니다.');
        return;
      }
      
      handleFileUpload(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      console.log('🔗 EmbedDialog: Saving embed with URL:', url, 'Type:', embedType);
      onSave(url.trim(), embedType);
    } else {
      console.warn('⚠️ EmbedDialog: No URL provided for saving');
    }
  };

  return (
    <div className="embed-dialog-overlay" onClick={onCancel}>
      <div className="embed-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="embed-dialog-title">Add Embed</h3>
        
        <form onSubmit={handleSubmit}>
          {/* File Upload Section */}
          <div className="embed-dialog-field">
            <label htmlFor="file-upload">파일 업로드</label>
            <div className="file-upload-area">
              <input
                id="file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="file-upload" 
                className={`file-upload-button ${uploading ? 'uploading' : ''}`}
              >
                {uploading ? '📤 업로드 중...' : '📁 파일 선택'}
              </label>
              {uploadedFile && (
                <div className="uploaded-file-info">
                  <span>✅ {uploadedFile.name}</span>
                  <span className="file-size">({(uploadedFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                </div>
              )}
            </div>
            <p className="embed-dialog-hint">
              이미지 (JPG, PNG, GIF, WebP) 또는 PDF 파일 (최대 10MB)
            </p>
          </div>

          <div className="embed-dialog-divider">
            <span>또는</span>
          </div>

          {/* URL Input Section */}
          <div className="embed-dialog-field">
            <label htmlFor="embed-url">URL</label>
            <input
              id="embed-url"
              type="url"
              className="input"
              placeholder="https://www.youtube.com/watch?v=... or https://example.com"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              autoFocus
              required
            />
            <p className="embed-dialog-hint">
              {embedType === 'youtube' 
                ? '🎥 YouTube video detected' 
                : embedType === 'image'
                ? '🖼️ Image detected'
                : embedType === 'pdf'
                ? '📄 PDF document detected'
                : '🌐 Web page - Some sites may not allow embedding'}
            </p>
            <details style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                💡 Recommended embeddable sites
              </summary>
              <div style={{ 
                marginTop: '8px', 
                padding: '10px', 
                background: '#f9fafb', 
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                  <li>✅ YouTube (youtube.com)</li>
                  <li>✅ Google Docs/Sheets/Slides</li>
                  <li>✅ CodeSandbox, CodePen, JSFiddle</li>
                  <li>✅ Figma, Miro, Whimsical</li>
                  <li>✅ Loom, Vimeo</li>
                  <li>✅ Images (JPG, PNG, GIF, WebP, SVG)</li>
                  <li>✅ PDF documents</li>
                  <li>⚠️ Most regular websites are blocked by CORS</li>
                </ul>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', fontStyle: 'italic' }}>
                  If a page doesn't load, use "Open Full Page" button
                </p>
              </div>
            </details>
          </div>

          <div className="embed-dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="button"
              disabled={uploading || !url.trim()}
            >
              {uploading ? '업로드 중...' : 'Add Embed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

