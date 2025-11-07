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
        <div className="json-preview-header">
          <h3>
            <AppleIcon name="save" size="medium" />
            Save Preview
          </h3>
          <button className="json-preview-close" onClick={onClose}>
            <AppleIcon name="close" size="small" />
          </button>
        </div>

        {/* Actions - Moved to top, always visible */}
        {onConfirm && (
          <div className="json-preview-actions-top">
            <button
              className="button"
              onClick={() => {
                if (isConfirming) return;
                setIsConfirming(true);
                onConfirm?.();
              }}
              disabled={isConfirming}
            >
              Save
            </button>
            <button className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}

        {/* Change Log */}
        {changeLog && changeLog.length > 0 && (
          <div className="json-preview-changelog">
            <h4 className="changelog-title">
              <AppleIcon name="edit" size="small" />
              {t('jsonPreview.changeLogTitle')}
            </h4>
            <ul className="changelog-list">
              {changeLog.map((change, index) => (
                <li 
                  key={index} 
                  className="changelog-item"
                  style={{ '--item-index': index } as React.CSSProperties}
                >
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="json-preview-toolbar">
          <button 
            className="button button-secondary" 
            onClick={handleCopy}
            title="Copy JSON to clipboard"
          >
            {copied ? (
              <>
                <AppleIcon name="success" size="small" />
                Copied!
              </>
            ) : (
              <>
                <AppleIcon name="copy" size="small" />
                Copy
              </>
            )}
          </button>
          <button 
            className="button button-secondary" 
            onClick={handleDownload}
            title="Download JSON file"
          >
            <AppleIcon name="download" size="small" />
            Download
          </button>
          <div className="json-preview-stats">
            <span>Nodes: {data.nodes?.length || 0}</span>
            <span>Edges: {data.edges?.length || 0}</span>
            <span>Size: {(jsonString.length / 1024).toFixed(1)} KB</span>
          </div>
          <button
            className="button button-secondary"
            onClick={() => setIsExpanded(prev => !prev)}
            style={{ marginLeft: 'auto' }}
          >
            {isExpanded ? '▾ Hide Details' : '▸ Show Details'}
          </button>
        </div>

        {isExpanded && (
          <div className="json-preview-content">
            <pre className="json-preview-code">
              <code>{jsonString}</code>
            </pre>
          </div>
        )}

        {/* Bottom actions - only Cancel if no onConfirm */}
        {!onConfirm && (
          <div className="json-preview-actions">
            <button className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

