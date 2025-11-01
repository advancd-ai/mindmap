/**
 * MarkdownRenderer - Render markdown text as HTML
 * Used inside SVG foreignObject for node labels
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  textAlign?: 'left' | 'center' | 'right';
  textVerticalAlign?: 'top' | 'middle' | 'bottom';
  maxLines?: number; // Limit number of lines for collapsed nodes
}

export default function MarkdownRenderer({
  content,
  textAlign = 'left',
  textVerticalAlign = 'middle',
  maxLines,
}: MarkdownRendererProps) {
  // If content is empty or whitespace, return empty
  if (!content || !content.trim()) {
    return <div className="markdown-renderer empty" />;
  }

  // Get collapsed preview if maxLines is set
  const displayContent = maxLines
    ? content.split('\n').slice(0, maxLines).join('\n')
    : content;

  const alignClass = `text-align-${textAlign}`;
  const vAlignClass = `text-vertical-align-${textVerticalAlign}`;

  return (
    <div className={`markdown-renderer ${alignClass} ${vAlignClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              attributes: {
                ...defaultSchema.attributes,
                a: [
                  ...(defaultSchema.attributes?.a || []),
                  ['target', '_blank'],
                  ['rel', 'noopener noreferrer'],
                ],
              },
            },
          ],
        ]}
        components={{
          // Customize heading styles
          h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
          // Customize list styles
          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
          li: ({ children }) => <li className="markdown-li">{children}</li>,
          // Customize link styles
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="markdown-link"
              onClick={(e) => {
                // Prevent event propagation to avoid triggering node selection
                e.stopPropagation();
              }}
            >
              {children}
            </a>
          ),
          // Customize code styles
          code: (props) => {
            const { className, children } = props;
            const isInline = !className || !className.includes('language-');
            if (isInline) {
              return <code className="markdown-code-inline">{children}</code>;
            }
            return <code className={`markdown-code-block ${className || ''}`}>{children}</code>;
          },
          // Customize paragraph
          p: ({ children }) => <p className="markdown-p">{children}</p>,
          // Customize blockquote
          blockquote: ({ children }) => (
            <blockquote className="markdown-blockquote">{children}</blockquote>
          ),
          // Customize strong/bold
          strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
          // Customize emphasis/italic
          em: ({ children }) => <em className="markdown-em">{children}</em>,
          // Customize strikethrough
          del: ({ children }) => <del className="markdown-del">{children}</del>,
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}

