/**
 * EmbedFallback - Fallback UI when webpage cannot be embedded
 */

import './EmbedFallback.css';

interface EmbedFallbackProps {
  url: string;
  title: string;
}

export default function EmbedFallback({ url, title }: EmbedFallbackProps) {
  const domain = new URL(url).hostname;

  return (
    <div className="embed-fallback">
      <div className="embed-fallback-icon">🌐</div>
      <div className="embed-fallback-title">{title}</div>
      <div className="embed-fallback-domain">{domain}</div>
      <div className="embed-fallback-message">
        This website cannot be embedded due to security restrictions.
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="embed-fallback-link button"
        onClick={(e) => e.stopPropagation()}
      >
        🔗 Open in New Tab
      </a>
      <div className="embed-fallback-hint">
        💡 Tip: Use embeddable URLs (YouTube, Google Docs, CodePen, etc.)
      </div>
    </div>
  );
}

