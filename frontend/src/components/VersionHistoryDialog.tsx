/**
 * VersionHistoryDialog - Show version history and allow version switching
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchMapHistory, type MapVersion } from '../api/maps';
import HistoryProgressBar from './HistoryProgressBar';
import AppleIcon from './AppleIcon';
import './VersionHistoryDialog.css';

interface VersionHistoryDialogProps {
  mapId: string;
  currentVersion: number;
  latestVersion?: number | null;
  onVersionSelect: (version: number) => void;
  onClose: () => void;
}

export default function VersionHistoryDialog({
  mapId,
  currentVersion,
  latestVersion,
  onVersionSelect,
  onClose,
}: VersionHistoryDialogProps) {
  const { t, i18n } = useTranslation();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<'fetching' | 'processing' | 'complete'>('fetching');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressStats, setProgressStats] = useState<{ processed: number; total: number } | undefined>();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['mapHistory', mapId],
    queryFn: () => fetchMapHistory(mapId, (progress, stage, message, stats) => {
      setProgress(progress);
      setProgressStage(stage as 'fetching' | 'processing' | 'complete');
      setProgressMessage(message || '');
      setProgressStats(stats);
    }),
    enabled: !!mapId,
  });

  const handleVersionSelect = (version: number) => {
    setSelectedVersion(version);
  };

  const handleConfirm = () => {
    if (selectedVersion !== null) {
      onVersionSelect(selectedVersion);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Get the current language and set appropriate locale
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: i18n.language === 'ko' // Use 12-hour format for Korean, 24-hour for English
    });
  };

  const formatCommitMessage = (message: string) => {
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  };

  if (isLoading) {
    return (
      <div className="version-history-overlay" onClick={onClose}>
        <div className="version-history-dialog version-history-dialog-loading" onClick={(e) => e.stopPropagation()}>
          <div className="version-history-header">
            <h3><AppleIcon name="history" size="small" /> {t('versionHistory.title')}</h3>
            <button className="close-button" onClick={onClose}><AppleIcon name="close" size="small" /></button>
          </div>
          <div className="version-history-content">
            <HistoryProgressBar
              progress={progress}
              stage={progressStage}
              message={progressMessage}
              totalVersions={progressStats?.total}
              processedVersions={progressStats?.processed}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="version-history-overlay" onClick={onClose}>
        <div className="version-history-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="version-history-header">
            <h3><AppleIcon name="history" size="small" /> {t('versionHistory.title')}</h3>
            <button className="close-button" onClick={onClose}><AppleIcon name="close" size="small" /></button>
          </div>
          <div className="version-history-content">
            <div className="error">{t('versionHistory.error')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="version-history-overlay" onClick={onClose}>
      <div className="version-history-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="version-history-header">
          <h3>📚 {t('versionHistory.title')}</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="version-history-content">
          {history && history.length > 0 ? (
            <div className="version-list">
              {history.map((version: MapVersion) => (
                <div
                  key={version.version}
                  className={`version-item ${
                    version.version === currentVersion ? 'current' : ''
                  } ${selectedVersion === version.version ? 'selected' : ''}`}
                  onClick={() => handleVersionSelect(version.version)}
                >
                  <div className="version-header">
                    <span className="version-number">v{version.version}</span>
                    {version.version === currentVersion && (
                      <span className="current-badge">{t('versionHistory.current')}</span>
                    )}
                    {latestVersion && version.version === latestVersion && version.version !== currentVersion && (
                      <span className="latest-badge">{t('versionHistory.latest')}</span>
                    )}
                    <span className="commit-sha">{version.commitSha.substring(0, 7)}</span>
                  </div>
                  
                  <div className="version-message">
                    {formatCommitMessage(version.message)}
                  </div>
                  
                  <div className="version-meta">
                    <span className="author">{version.author}</span>
                    <span className="date">{formatDate(version.date)}</span>
                    <span className="stats">
                      {version.nodeCount} {t('versionHistory.nodes')}, {version.edgeCount} {t('versionHistory.edges')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-versions">{t('versionHistory.noVersions')}</div>
          )}
        </div>
        
        <div className="version-history-footer">
          <button className="button button-secondary" onClick={onClose}>
            {t('versionHistory.cancel')}
          </button>
          <button 
            className="button button-primary" 
            onClick={handleConfirm}
            disabled={selectedVersion === null}
          >
            {t('versionHistory.loadVersion')} {selectedVersion || ''}
          </button>
        </div>
      </div>
    </div>
  );
}
