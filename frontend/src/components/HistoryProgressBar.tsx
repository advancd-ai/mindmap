/**
 * History Progress Bar Component
 */

import { useTranslation } from 'react-i18next';
import AppleIcon from './AppleIcon';
import './HistoryProgressBar.css';

interface HistoryProgressBarProps {
  progress: number;
  stage: 'fetching' | 'processing' | 'complete';
  message?: string;
  totalVersions?: number;
  processedVersions?: number;
}

export default function HistoryProgressBar({
  progress,
  stage,
  message,
  totalVersions,
  processedVersions
}: HistoryProgressBarProps) {
  const { t } = useTranslation();

  const getStageIcon = () => {
    switch (stage) {
      case 'fetching':
        return <AppleIcon name="loading" size="medium" />;
      case 'processing':
        return <AppleIcon name="settings" size="medium" />;
      case 'complete':
        return <AppleIcon name="success" size="medium" />;
      default:
        return <AppleIcon name="loading" size="medium" />;
    }
  };

  const getStageText = () => {
    switch (stage) {
      case 'fetching':
        return t('versionHistory.progress.fetching');
      case 'processing':
        return t('versionHistory.progress.processing');
      case 'complete':
        return t('versionHistory.progress.complete');
      default:
        return t('versionHistory.loading');
    }
  };

  return (
    <div className="history-progress-container">
      <div className="history-progress-header">
        <span className="history-progress-icon">{getStageIcon()}</span>
        <span className="history-progress-title">{getStageText()}</span>
      </div>

      <div className="history-progress-bar">
        <div 
          className="history-progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="history-progress-info">
        <div className="history-progress-percentage">
          {Math.round(progress)}%
        </div>
        
        {totalVersions && processedVersions && (
          <div className="history-progress-stats">
            {processedVersions} of {totalVersions} versions processed
          </div>
        )}
        
        {message && (
          <div className="history-progress-message">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
