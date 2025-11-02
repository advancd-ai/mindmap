import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AppleIcon from './AppleIcon';
import './DeleteConfirmDialog.css';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  type: 'node' | 'edge';
  label?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  type,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
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

  const title = type === 'node' ? '노드 삭제' : '엣지 삭제';

  return createPortal(
    <div className="delete-confirm-overlay" onClick={onCancel}>
      <div
        className="delete-confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-label={title}
      >
        {/* Actions */}
        <div className="delete-confirm-actions">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="button button-secondary button-large"
            type="button"
          >
            취소
          </button>
          <button
            ref={confirmButtonRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            className="button button-danger button-large"
            type="button"
            autoFocus
          >
            <AppleIcon name="delete" size="small" />
            삭제
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
