/**
 * EmbedPreview - Preview panel for embedded content
 */

import { type Node } from '../store/mindmap';
import './EmbedPreview.css';

interface EmbedPreviewProps {
  node: Node;
  onClose: () => void;
  onRemove: () => void;
}

// Convert YouTube URL to embed URL
function getYoutubeEmbedUrl(url: string): string {
  const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (videoIdMatch) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return url;
}

export default function EmbedPreview({ node, onClose, onRemove }: EmbedPreviewProps) {
  if (!node.embedUrl) return null;

  const embedUrl =
    node.embedType === 'youtube' ? getYoutubeEmbedUrl(node.embedUrl) : node.embedUrl;

  return (
    <div className="embed-preview-panel">
      <div className="embed-preview-header">
        <div className="embed-preview-title">
          <span className="embed-preview-icon">
            {node.embedType === 'youtube' ? '🎥' 
             : node.embedType === 'image' ? '🖼️'
             : node.embedType === 'pdf' ? '📄'
             : '🌐'}
          </span>
          <span>{node.label}</span>
        </div>
        <div className="embed-preview-actions">
          <button
            className="embed-preview-button"
            onClick={onRemove}
            title="Remove embed"
          >
            🗑️
          </button>
          <button className="embed-preview-button" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="embed-preview-content">
        <iframe
          src={embedUrl}
          title={node.label}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="embed-preview-iframe"
        />
      </div>

      <div className="embed-preview-footer">
        <a
          href={node.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="embed-preview-link"
        >
          🔗 Open in new tab
        </a>
      </div>
    </div>
  );
}

