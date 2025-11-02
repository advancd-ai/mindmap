/**
 * MarkdownEditorModal - Overlay modal for markdown editing
 * Provides a large editing area with split view (editor + preview)
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import MarkdownToolbar from '../MarkdownToolbar';
import './MarkdownEditorModal.css';

interface MarkdownEditorModalProps {
  initialValue: string;
  textAlign?: 'left' | 'center' | 'right';
  onSave: (newLabel: string) => void;
  onCancel: () => void;
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
}

export default function MarkdownEditorModal({
  initialValue,
  textAlign = 'left',
  onSave,
  onCancel,
  onTextAlignChange,
}: MarkdownEditorModalProps) {
  const [value, setValue] = useState(initialValue);
  const [currentTextAlign, setCurrentTextAlign] = useState<'left' | 'center' | 'right'>(textAlign);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }

    // Trap focus within modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onCancel]);

  useEffect(() => {
    setCurrentTextAlign(textAlign);
  }, [textAlign]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  const handleInsert = (newValue: string, cursorOffset?: number) => {
    setValue(newValue);
    
    if (textareaRef.current && cursorOffset !== undefined) {
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(cursorOffset, cursorOffset);
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt+Enter: Save and exit
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      onSave(value);
    }
    // Ctrl/Cmd + Enter: Save
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(value);
    }
    // Escape: Cancel (handled by document listener)
    else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Tab: Insert 2 spaces
    else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setValue(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const modalContent = (
    <div className="markdown-editor-modal-overlay" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className="markdown-editor-modal"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="markdown-editor-modal-header">
          <h3>Markdown Editor</h3>
          <div className="markdown-editor-view-toggle">
            <button
              className={viewMode === 'edit' ? 'active' : ''}
              onClick={() => setViewMode('edit')}
              title="Edit only"
            >
              편집
            </button>
            <button
              className={viewMode === 'split' ? 'active' : ''}
              onClick={() => setViewMode('split')}
              title="Split view"
            >
              분할
            </button>
            <button
              className={viewMode === 'preview' ? 'active' : ''}
              onClick={() => setViewMode('preview')}
              title="Preview only"
            >
              미리보기
            </button>
          </div>
          <button
            className="markdown-editor-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="markdown-editor-modal-body">
          <MarkdownToolbar
            textareaRef={textareaRef}
            onInsert={handleInsert}
            textAlign={currentTextAlign}
            onTextAlignChange={(align) => {
              setCurrentTextAlign(align);
              onTextAlignChange?.(align);
            }}
          />
          <div className={`markdown-editor-content markdown-editor-${viewMode}`}>
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className="markdown-editor-editor">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className="markdown-editor-textarea"
                  placeholder="Enter markdown text..."
                />
              </div>
            )}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="markdown-editor-preview">
                <div className="markdown-preview-content" style={{ textAlign: currentTextAlign }}>
                  {value.trim() ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                    >
                      {value}
                    </ReactMarkdown>
                  ) : (
                    <div className="markdown-preview-empty">미리보기</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="markdown-editor-modal-footer">
          <div className="markdown-editor-modal-help">
            <kbd>Alt</kbd> + <kbd>Enter</kbd> 저장 후 종료 • <kbd>Esc</kbd> 취소 • <kbd>Tab</kbd> 들여쓰기
          </div>
          <div className="markdown-editor-modal-actions">
            <button className="markdown-editor-modal-button cancel" onClick={onCancel}>
              취소
            </button>
            <button className="markdown-editor-modal-button save" onClick={() => onSave(value)}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

