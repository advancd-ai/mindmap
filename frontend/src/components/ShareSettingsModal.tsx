/**
 * Share Settings Modal
 * Accessed from EditorPage toolbar
 */

import { useState, useEffect } from 'react';
import { useShare } from '../hooks/useShare';
import Toast, { type ToastType } from './Toast';
import './ShareSettingsModal.css';

interface ShareSettingsModalProps {
  mapId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareSettingsModal({
  mapId,
  isOpen,
  onClose
}: ShareSettingsModalProps) {
  const {
    shareStatus,
    isLoading: isLoadingStatus,
    isShared,
    shareUrl,
    createShare,
    updateShare,
    disableShare,
    copyShareLink,
    isCreating,
    isUpdating,
    isDisabling,
    createShareMutation,
    updateShareMutation,
    disableShareMutation,
  } = useShare(mapId);

  const [expiresAt, setExpiresAt] = useState<string>('');
  const [allowEmbed, setAllowEmbed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Initialize form when share status loads
  useEffect(() => {
    if (shareStatus) {
      // Convert ISO date to datetime-local format
      // Important: datetime-local expects local time, not UTC
      if (shareStatus.expiresAt) {
        const date = new Date(shareStatus.expiresAt);
        if (!isNaN(date.getTime())) {
          // Use getFullYear, getMonth, etc. (local time) instead of UTC methods
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          setExpiresAt(`${year}-${month}-${day}T${hours}:${minutes}`);
        } else {
          setExpiresAt('');
        }
      } else {
        setExpiresAt('');
      }
      setAllowEmbed(shareStatus.allowEmbed || false);
      setPassword(''); // Don't show existing password
    }
  }, [shareStatus]);

  const handleEnable = () => {
    // Convert datetime-local string to ISO string
    // datetime-local is in local time, so we need to create a Date object
    // which will interpret it correctly, then convert to ISO
    let expiresAtISO: string | undefined = undefined;
    if (expiresAt && expiresAt.trim()) {
      // Create date from datetime-local string (local time)
      const localDate = new Date(expiresAt);
      if (!isNaN(localDate.getTime())) {
        expiresAtISO = localDate.toISOString();
      }
    }
    
    const config = {
      enabled: true,
      expiresAt: expiresAtISO,
      allowEmbed,
      password: password || undefined,
    };

    if (isShared) {
      updateShare(config);
    } else {
      createShare(config);
    }
  };

  const handleRegenerate = () => {
    updateShare({ regenerateToken: true });
  };

  const handleCopyLink = async () => {
    const success = await copyShareLink();
    if (success) {
      setToast({ message: 'Link copied to clipboard!', type: 'success' });
    } else {
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
  };

  const handleDisable = () => {
    if (window.confirm('Are you sure you want to disable sharing? The share link will no longer work.')) {
      disableShare();
    }
  };

  // Handle mutation success/error via useEffect
  useEffect(() => {
    if (createShareMutation?.isSuccess) {
      setToast({ message: 'Share link created!', type: 'success' });
    } else if (createShareMutation?.isError) {
      const errorMessage = createShareMutation.error instanceof Error 
        ? createShareMutation.error.message 
        : 'Failed to create share link';
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [createShareMutation?.isSuccess, createShareMutation?.isError]);

  useEffect(() => {
    if (updateShareMutation?.isSuccess) {
      setToast({ message: 'Share settings updated!', type: 'success' });
    } else if (updateShareMutation?.isError) {
      const errorMessage = updateShareMutation.error instanceof Error 
        ? updateShareMutation.error.message 
        : 'Failed to update share settings';
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [updateShareMutation?.isSuccess, updateShareMutation?.isError]);

  useEffect(() => {
    if (disableShareMutation?.isSuccess) {
      setToast({ message: 'Share disabled', type: 'success' });
      const timer = setTimeout(() => {
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (disableShareMutation?.isError) {
      const errorMessage = disableShareMutation.error instanceof Error 
        ? disableShareMutation.error.message 
        : 'Failed to disable share';
      setToast({ message: errorMessage, type: 'error' });
    }
  }, [disableShareMutation?.isSuccess, disableShareMutation?.isError, onClose]);

  if (!isOpen) return null;

  if (isLoadingStatus) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content share-settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">
            <p>Loading share settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Map</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {isShared && shareStatus ? (
            // Share is enabled
            <>
              <div className="share-link-section">
                <label>Share Link</label>
                <div className="share-link-input-group">
                  <input 
                    type="text" 
                    value={shareUrl} 
                    readOnly 
                    className="share-link-input"
                  />
                  <button 
                    className="btn-copy"
                    onClick={handleCopyLink}
                  >
                    Copy
                  </button>
                </div>
                <p className="share-link-hint">
                  Anyone with this link can view the map (read-only)
                </p>
              </div>

              <div className="share-stats">
                <div className="stat-item">
                  <span className="stat-label">Views:</span>
                  <span className="stat-value">{shareStatus.stats?.viewCount || 0}</span>
                </div>
                {shareStatus.stats?.lastViewedAt && (
                  <div className="stat-item">
                    <span className="stat-label">Last viewed:</span>
                    <span className="stat-value">
                      {new Date(shareStatus.stats.lastViewedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {shareStatus.expiresAt ? (
                  <div className="stat-item">
                    <span className="stat-label">Expires:</span>
                    <span className="stat-value">
                      {new Date(shareStatus.expiresAt).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="stat-item">
                    <span className="stat-label">Expires:</span>
                    <span className="stat-value" style={{ color: '#28a745', fontWeight: 500 }}>
                      Never (Permanent)
                    </span>
                  </div>
                )}
              </div>

              <div className="share-settings-section">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={allowEmbed}
                    onChange={(e) => setAllowEmbed(e.target.checked)}
                  />
                  <span>Allow embedding (iframe)</span>
                </label>

                <div className="form-group">
                  <label>Expiration Date (Optional)</label>
                  <div className="expiration-input-group">
                    <input 
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      placeholder="No expiration"
                    />
                    {expiresAt && (
                      <button
                        type="button"
                        className="btn-clear-expiration"
                        onClick={() => setExpiresAt('')}
                        title="Remove expiration"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="form-hint">
                    Leave empty for permanent share link
                  </p>
                </div>

                <div className="form-group">
                  <label>
                    Password Protection (Optional)
                    {shareStatus.passwordProtected && (
                      <span className="badge-active">Active</span>
                    )}
                  </label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder={shareStatus.passwordProtected ? "Enter new password (leave blank to keep current)" : "Enter password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="share-actions">
                <button 
                  className="btn-secondary"
                  onClick={handleRegenerate}
                  disabled={isUpdating}
                >
                  Regenerate Link
                </button>
                <button 
                  className="btn-danger"
                  onClick={handleDisable}
                  disabled={isDisabling}
                >
                  Disable Share
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleEnable}
                  disabled={isUpdating}
                >
                  Update Settings
                </button>
              </div>
            </>
          ) : (
            // Share is disabled
            <>
              <p className="share-description">
                Create a share link to allow anyone to view this map without authentication.
              </p>
              
              <div className="share-settings-section">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={allowEmbed}
                    onChange={(e) => setAllowEmbed(e.target.checked)}
                  />
                  <span>Allow embedding (iframe)</span>
                </label>

                <div className="form-group">
                  <label>Expiration Date (Optional)</label>
                  <div className="expiration-input-group">
                    <input 
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      placeholder="No expiration"
                    />
                    {expiresAt && (
                      <button
                        type="button"
                        className="btn-clear-expiration"
                        onClick={() => setExpiresAt('')}
                        title="Remove expiration"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="form-hint">
                    Leave empty for permanent share link
                  </p>
                </div>

                <div className="form-group">
                  <label>Password Protection (Optional)</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password (optional)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="share-actions">
                <button 
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleEnable}
                  disabled={isCreating}
                >
                  Create Share Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

