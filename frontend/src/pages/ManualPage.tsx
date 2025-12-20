/**
 * Manual Page - User manual documentation
 * Route: /manual
 * No authentication required
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useTranslation } from 'react-i18next';
import AppleIcon from '../components/AppleIcon';
import './ManualPage.css';

interface TocItem {
  id: string;
  title: string;
  level: number;
}

export default function ManualPage() {
  const { t, i18n } = useTranslation();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [isTocOpen, setIsTocOpen] = useState(true);

  useEffect(() => {
    // Load markdown file based on current language
    const loadManual = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine file name based on current language
        const lang = i18n.language || 'en';
        const langCode = lang.startsWith('ko') ? 'ko' : 'en';
        const fileName = `/docs/manual.${langCode}.md`;
        
        // Try to load language-specific file
        let response = await fetch(fileName);
        
        // Fallback to English if language-specific file doesn't exist
        if (!response.ok && langCode !== 'en') {
          console.warn(`Manual file ${fileName} not found, falling back to English`);
          response = await fetch('/docs/manual.en.md');
        }
        
        // Final fallback to Korean if English also doesn't exist
        if (!response.ok) {
          console.warn('English manual not found, falling back to Korean');
          response = await fetch('/docs/manual.ko.md');
        }
        
        if (!response.ok) {
          throw new Error('Failed to load manual');
        }
        
        const text = await response.text();
        setMarkdown(text);
      } catch (err) {
        console.error('Error loading manual:', err);
        setError(err instanceof Error ? err.message : 'Failed to load manual');
      } finally {
        setLoading(false);
      }
    };

    loadManual();
  }, [i18n.language]);

  // Handle anchor links for table of contents
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href')?.slice(1);
        if (id) {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL without scrolling
            window.history.pushState(null, '', `#${id}`);
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // Extract table of contents from markdown
  useEffect(() => {
    if (!markdown) return;

    const lines = markdown.split('\n');
    const tocItems: TocItem[] = [];

    lines.forEach((line) => {
      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);
      const h4Match = line.match(/^#### (.+)$/);

      if (h1Match) {
        const title = h1Match[1].replace(/\*\*/g, '').trim();
        const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        tocItems.push({ id, title, level: 1 });
      } else if (h2Match) {
        const title = h2Match[1].replace(/\*\*/g, '').trim();
        const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        tocItems.push({ id, title, level: 2 });
      } else if (h3Match) {
        const title = h3Match[1].replace(/\*\*/g, '').trim();
        const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        tocItems.push({ id, title, level: 3 });
      } else if (h4Match) {
        const title = h4Match[1].replace(/\*\*/g, '').trim();
        const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        tocItems.push({ id, title, level: 4 });
      }
    });

    setToc(tocItems);
  }, [markdown]);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const headers = document.querySelectorAll('.manual-markdown h1, .manual-markdown h2, .manual-markdown h3');
      let currentSection = '';

      headers.forEach((header) => {
        const rect = header.getBoundingClientRect();
        if (rect.top <= 200 && rect.top >= -100) {
          currentSection = header.id;
        }
      });

      if (currentSection) {
        setActiveSection(currentSection);
      }
    };

    // Listen to scroll on the page itself (since manual-page has overflow-y: auto)
    const pageElement = document.querySelector('.manual-page');
    if (pageElement) {
      pageElement.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => pageElement.removeEventListener('scroll', handleScroll);
    }
  }, [markdown]);

  // Scroll to anchor on mount if hash exists
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(id);
        }
      }, 100);
    }
  }, [markdown]);

  if (loading) {
    return (
      <div className="manual-page page">
        <div className="manual-loading">
          <div className="manual-loading-spinner" />
          <p>{t('manual.loading', 'Loading manual...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manual-page page">
        <div className="manual-error">
          <h2>{t('manual.error', 'Error loading manual')}</h2>
          <p>{error}</p>
          <Link to="/dashboard" className="button button-primary">
            {t('manual.backToDashboard', 'Back to Dashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="manual-page page">
      <div className="manual-content-wrapper">
        <aside className={`manual-toc ${isTocOpen ? 'open' : ''}`}>
          <div className="manual-toc-header">
            <h3>{t('manual.toc', 'Table of Contents')}</h3>
            <button
              className="manual-toc-toggle"
              onClick={() => setIsTocOpen(!isTocOpen)}
              aria-label={isTocOpen ? 'Close TOC' : 'Open TOC'}
            >
              <AppleIcon name={isTocOpen ? 'collapse' : 'expand'} size="small" />
            </button>
          </div>
          {isTocOpen && (
            <nav className="manual-toc-nav">
              <ul className="manual-toc-list">
                {toc.map((item) => (
                  <li
                    key={item.id}
                    className={`manual-toc-item manual-toc-level-${item.level} ${
                      activeSection === item.id ? 'active' : ''
                    }`}
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById(item.id);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          setActiveSection(item.id);
                          window.history.pushState(null, '', `#${item.id}`);
                        }
                      }}
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>

        <div className="manual-content">
          <div className="manual-markdown">
            <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} {...props} />
              ),
              a: ({ node, ...props }) => {
                if (props.href?.startsWith('#')) {
                  return <a {...props} onClick={(e) => {
                    e.preventDefault();
                    const id = props.href?.slice(1);
                    if (id) {
                      const element = document.getElementById(id);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        window.history.pushState(null, '', `#${id}`);
                      }
                    }
                  }} />;
                }
                if (props.href?.startsWith('http')) {
                  return <a {...props} target="_blank" rel="noopener noreferrer" />;
                }
                return <a {...props} />;
              },
              table: ({ node, ...props }) => (
                <div className="manual-table-wrapper">
                  <table {...props} />
                </div>
              ),
              code: ({ node, className, children, ...props }: any) => {
                const isInline = !className || !className.includes('language-');
                if (isInline) {
                  return <code className="manual-inline-code" {...props}>{children}</code>;
                }
                return <code className="manual-code-block" {...props}>{children}</code>;
              },
              pre: ({ node, ...props }) => (
                <pre className="manual-pre" {...props} />
              ),
            }}
          >
            {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      <footer className="manual-footer">
        <div className="manual-footer-content">
          <p>{t('manual.footer', 'Need more help?')}</p>
          <div className="manual-footer-links">
            <Link to="/about" className="manual-footer-link">
              {t('manual.about', 'About')}
            </Link>
            <a
              href="https://github.com/ziin-ai/mindmap/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="manual-footer-link"
            >
              {t('manual.reportIssue', 'Report Issue')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

