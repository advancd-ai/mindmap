/**
 * JsonPreviewDialog - JSON 데이터 미리보기 다이얼로그
 * 디버깅 목적으로 저장되는 JSON 데이터를 표시
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppleIcon from './AppleIcon';
import './JsonPreviewDialog.css';

interface JsonPreviewDialogProps {
  data: any;
  changeLog?: string[];
  onClose: () => void;
  onConfirm?: () => void;
}

export default function JsonPreviewDialog({ data, changeLog, onClose, onConfirm }: JsonPreviewDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChangeLogExpanded, setIsChangeLogExpanded] = useState(false);
 
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${data.id || 'preview'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="json-preview-overlay" onClick={onClose}>
      <div className="json-preview-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="preview-sheet">
          <header className="preview-header">
            <div className="preview-title">
              <AppleIcon name="save" size="medium" />
              <div>
                <h2>{t('jsonPreview.title')}</h2>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            <div className="preview-header-actions">
              <button className="ghost-button" onClick={handleDownload}>
                <AppleIcon name="download" size="small" />
                {t('jsonPreview.download')}
              </button>
              <button className="icon-button" onClick={onClose}>
                <AppleIcon name="close" size="small" />
              </button>
            </div>
          </header>

          <div className="preview-layout">
            <aside className="preview-sidebar">
              <section className="summary-tile emphasis">
                <div className="tile-icon">
                  <AppleIcon name="save" size="small" />
                </div>
                <div className="tile-content">
                  <span className="tile-label">{t('jsonPreview.summaryTitle', 'Save Summary')}</span>
                  <span className="tile-value">{data?.title || data?.name || 'Untitled Map'}</span>
                </div>
              </section>

              <section className="metric-group">
                <div className="metric-card">
                  <span className="metric-label">{t('jsonPreview.nodes')}</span>
                  <span className="metric-value">{data.nodes?.length || 0}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">{t('jsonPreview.edges')}</span>
                  <span className="metric-value">{data.edges?.length || 0}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">{t('jsonPreview.size')}</span>
                  <span className="metric-value">{(jsonString.length / 1024).toFixed(1)} KB</span>
                </div>
              </section>

              <section className="sidebar-actions">
                <button className="ghost-button" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <AppleIcon name="success" size="small" />
                      {t('jsonPreview.copied')}
                    </>
                  ) : (
                    <>
                      <AppleIcon name="copy" size="small" />
                      {t('jsonPreview.copy')}
                    </>
                  )}
                </button>
                <button className="ghost-button" onClick={() => setIsExpanded(prev => !prev)}>
                  {isExpanded ? '▾ ' + t('jsonPreview.hideDetails', 'Hide Details') : '▸ ' + t('jsonPreview.showDetails', 'Show Details')}
                </button>
              </section>

              {changeLog && changeLog.length > 0 && (
                <section className="history-panel">
                  <div className="history-header">
                    <span className="history-label">{t('jsonPreview.changeLogTitle')}</span>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setIsChangeLogExpanded(prev => !prev)}
                    >
                      {isChangeLogExpanded ? '▾ ' + t('jsonPreview.hideHistory', 'Hide History') : '▸ ' + t('jsonPreview.showHistory', 'Show History')}
                    </button>
                  </div>
                  {isChangeLogExpanded && (
                    <ul className="history-list">
                      {changeLog.map((change, index) => (
                        <li key={index} style={{ '--item-index': index } as React.CSSProperties}>
                          {change}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </aside>

            <main className="preview-main">
              <div className="main-toolbar">
                {onConfirm ? (
                  <div className="toolbar-actions">
                    <button className="ghost-button" onClick={onClose}>
                      {t('jsonPreview.cancel')}
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => {
                        if (isConfirming) return;
                        setIsConfirming(true);
                        onConfirm?.();
                      }}
                      disabled={isConfirming}
                    >
                      {t('jsonPreview.confirmSave')}
                    </button>
                  </div>
                ) : (
                  <button className="ghost-button" onClick={onClose}>
                    {t('jsonPreview.cancel')}
                  </button>
                )}
              </div>

              {isExpanded ? (
                <div className="code-surface">
                  <pre className="json-preview-code">
                    <code>{jsonString}</code>
                  </pre>
                </div>
              ) : (
                <div className="code-placeholder">
                  <AppleIcon name="document" size="large" />
                  <p>{t('jsonPreview.placeholder', 'Show details to inspect JSON payload')}</p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

