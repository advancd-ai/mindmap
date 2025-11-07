import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import AppleIcon from './AppleIcon';
import './DeleteConfirmDialog.css';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  type: 'node' | 'edge' | 'map';
  label?: string;
  description?: string;
  stats?: Array<{ label: string; value: string; icon?: string }>;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function DeleteConfirmDialog({
  isOpen,
  type,
  label,
  description,
  stats,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmLabel,
  cancelLabel,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus the confirm button initially
    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Only trigger if focus is on buttons
        const activeElement = document.activeElement;
        if (activeElement === cancelButtonRef.current || activeElement === confirmButtonRef.current) {
          if (e.shiftKey) {
            // Shift+Enter = Cancel
            e.preventDefault();
            onCancel();
          } else {
            // Enter = Confirm (only if on cancel button, confirm button will be default)
            if (activeElement === cancelButtonRef.current) {
              e.preventDefault();
              // Move focus to confirm button instead
              confirmButtonRef.current?.focus();
            }
          }
        }
      }

      // Tab key handling for focus trap
      if (e.key === 'Tab') {
        const focusableElements = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          // Shift+Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const titleMap: Record<'node' | 'edge' | 'map', string> = {
    node: t('deleteDialog.nodeTitle', '노드 삭제'),
    edge: t('deleteDialog.edgeTitle', '엣지 삭제'),
    map: t('deleteDialog.mapTitle', '마인드맵 삭제'),
  };

  const defaultDescriptions: Record<'node' | 'edge' | 'map', string> = {
    node: t('deleteDialog.nodeDescription', '선택한 노드와 연결된 엣지가 삭제됩니다.'),
    edge: t('deleteDialog.edgeDescription', '선택한 연결이 삭제됩니다.'),
    map: t('deleteDialog.mapDescription', {
      title: label || t('deleteDialog.mapTitle', '마인드맵 삭제'),
      defaultValue: '이 마인드맵을 삭제하면 브랜치와 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
    }),
  };

  const dialogTitle = titleMap[type];
  const dialogDescription = description || defaultDescriptions[type];
  const cancelText = cancelLabel || t('deleteDialog.cancel', '취소');
  const confirmText = confirmLabel || t('deleteDialog.confirm', '삭제');

  return createPortal(
    <div className="delete-confirm-overlay" onClick={onCancel}>
      <div
        className="delete-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-label={dialogTitle}
      >
        <div className="delete-confirm-body">
          <div className="delete-confirm-icon">
            <AppleIcon name="delete" size="large" />
          </div>
          <div className="delete-confirm-message">
            <h3 className="delete-confirm-title">{dialogTitle}</h3>
            {label && type === 'map' && (
              <p className="delete-confirm-label">{label}</p>
            )}
            <p className="delete-confirm-description">{dialogDescription}</p>
            {stats && stats.length > 0 && (
              <div className="delete-confirm-stats">
                {stats.map((item, index) => (
                  <div key={index} className="delete-confirm-stat">
                    {item.icon && <span className="delete-confirm-stat-icon">{item.icon}</span>}
                    <span className="delete-confirm-stat-label">{item.label}</span>
                    <span className="delete-confirm-stat-value">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="delete-confirm-actions">
          <button
            ref={cancelButtonRef}
            onClick={() => {
              if (isLoading) return;
              onCancel();
            }}
            className="button button-secondary button-large"
            type="button"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isLoading) return;
              onConfirm();
            }}
            className={`button button-danger button-large${isLoading ? ' loading' : ''}`}
            type="button"
            autoFocus
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="delete-confirm-loading">
                <AppleIcon name="refresh" size="small" className="spin" />
                {confirmText}
              </span>
            ) : (
              <>
                <AppleIcon name="delete" size="small" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
