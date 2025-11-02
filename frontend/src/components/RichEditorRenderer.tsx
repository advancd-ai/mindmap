/**
 * RichEditorRenderer - Render HTML content safely
 * Used inside SVG foreignObject for node labels with rich editor content
 */

import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import './RichEditorRenderer.css';

interface RichEditorRendererProps {
  content: string;
  textAlign?: 'left' | 'center' | 'right';
  textVerticalAlign?: 'top' | 'middle' | 'bottom';
}

export default function RichEditorRenderer({
  content,
  textAlign = 'left',
  textVerticalAlign = 'middle',
}: RichEditorRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sanitize and set HTML content
  useEffect(() => {
    if (!containerRef.current) return;

    // Sanitize HTML content
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'hr',
        'a', 'span', 'div', 'b', 'i', 'strike',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      FORBID_ATTR: ['style', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target', 'rel'],
    });

    // Set innerHTML safely
    containerRef.current.innerHTML = sanitized;

    // Add security attributes to all links
    const links = containerRef.current.querySelectorAll('a');
    links.forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }, [content]);

  // If content is empty or whitespace, return empty
  if (!content || !content.trim()) {
    return <div className="rich-editor-renderer empty" />;
  }

  const alignClass = `text-align-${textAlign}`;
  const vAlignClass = `text-vertical-align-${textVerticalAlign}`;

  return (
    <div
      ref={containerRef}
      className={`rich-editor-renderer ${alignClass} ${vAlignClass}`}
      style={{
        pointerEvents: 'none',
      }}
    />
  );
}

