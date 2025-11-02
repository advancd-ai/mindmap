/**
 * RichEditorModal - Overlay modal for rich text editing
 * Provides a large editing area with WYSIWYG formatting tools
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import RichEditorToolbar from '../RichEditorToolbar';
import './RichEditorModal.css';

// Constants
const PASTE_MODE_RESET_DELAY = 100; // ms - Reset paste mode after paste event
const MIN_EDITOR_HEIGHT = 400; // px - Minimum height for editor content area

interface RichEditorModalProps {
  initialValue: string;
  textAlign?: 'left' | 'center' | 'right';
  onSave: (newLabel: string) => void;
  onCancel: () => void;
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
}

export default function RichEditorModal({
  initialValue,
  textAlign = 'left',
  onSave,
  onCancel,
  onTextAlignChange,
}: RichEditorModalProps) {
  const [currentTextAlign, setCurrentTextAlign] = useState<'left' | 'center' | 'right'>(textAlign);
  const [pasteAsPlainText, setPasteAsPlainText] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);

  // Update onCancel ref when prop changes
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.innerHTML = initialValue || '';
      
      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
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

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelRef.current();
      }
    };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [initialValue]);

  useEffect(() => {
    setCurrentTextAlign(textAlign);
  }, [textAlign]);

  const autoResize = () => {
    if (editorRef.current) {
      const scrollHeight = editorRef.current.scrollHeight;
      editorRef.current.style.minHeight = `${Math.max(scrollHeight, MIN_EDITOR_HEIGHT)}px`;
    }
  };

  const handleInput = () => {
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Alt+Enter: Save and exit
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      handleSave();
    }
    // Ctrl/Cmd + Enter: Save
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    // Escape: Cancel (handled by document listener)
    else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Keyboard shortcuts for formatting
    else if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      execCommand('bold');
    }
    else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      execCommand('italic');
    }
    else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      execCommand('underline');
    }
    else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const toolbar = modalRef.current?.querySelector('.rich-editor-toolbar');
      const linkBtn = toolbar?.querySelector('[title*="Link"]') as HTMLButtonElement;
      linkBtn?.click();
    }
    // Shift + Ctrl/Cmd + V: 플레인 텍스트 붙여넣기
    else if (e.key === 'v' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      // Set flag for next paste event
      setPasteAsPlainText(true);
      // Note: paste event will be handled in handlePaste
      // The flag will be reset after paste or timeout
      setTimeout(() => {
        setPasteAsPlainText(false);
      }, PASTE_MODE_RESET_DELAY);
    }
  };

  // Check if content is empty (only whitespace/formatting tags)
  const isEmpty = (html: string): boolean => {
    if (!html || html.trim() === '') return true;
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || '';
    const images = temp.querySelectorAll('img, iframe, embed, object');
    
    // Empty if no text and no media elements
    return text.trim() === '' && images.length === 0;
  };

  const handleSave = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      console.log('💾 RichEditorModal: Saving content', { html, length: html.length });
      
      if (isEmpty(html)) {
        // Empty content - save empty string
        console.log('⚠️ RichEditorModal: Content appears empty, saving empty string');
        onSave('');
      } else {
        // Save HTML content
        onSave(html);
      }
    } else {
      console.error('❌ RichEditorModal: editorRef.current is null');
      // Fallback: save empty string or initial value
      onSave(initialValue || '');
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    autoResize();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    const pastedHTML = clipboardData.getData('text/html');
    const pastedText = clipboardData.getData('text/plain');

    // Handle plain text paste (Shift+Ctrl/Cmd+V or no HTML available)
    if (pasteAsPlainText || !pastedHTML) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(pastedText || '');
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      // Reset paste mode flag after handling
      setPasteAsPlainText(false);
      autoResize();
      return;
    }

    const sanitized = DOMPurify.sanitize(pastedHTML, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'hr',
        'a', 'span', 'div',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      FORBID_ATTR: ['style', 'class', 'id'],
    });

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitized;
      const links = tempDiv.querySelectorAll('a');
      links.forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      range.insertNode(fragment);
      range.setStartAfter(fragment.lastChild || range.startContainer);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    autoResize();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const modalContent = (
    <div className="rich-editor-modal-overlay" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className="rich-editor-modal"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="rich-editor-modal-header">
          <h3>Rich Text Editor</h3>
          <button
            className="rich-editor-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="rich-editor-modal-body">
          <RichEditorToolbar
            editorRef={editorRef}
            textAlign={currentTextAlign}
            onTextAlignChange={(align) => {
              setCurrentTextAlign(align);
              onTextAlignChange?.(align);
            }}
            onCommand={execCommand}
          />
          <div
            ref={editorRef}
            contentEditable
            role="textbox"
            aria-label="Rich text editor"
            aria-multiline="true"
            aria-describedby="rich-editor-help"
            className="rich-editor-modal-content"
            style={{
              textAlign: currentTextAlign,
            }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            suppressContentEditableWarning
          />
        </div>

        <div className="rich-editor-modal-footer">
          <div id="rich-editor-help" className="rich-editor-modal-help">
            <kbd>Alt</kbd> + <kbd>Enter</kbd> 저장 후 종료 • <kbd>Esc</kbd> 취소 • <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>V</kbd> 텍스트만 붙여넣기
          </div>
          <div className="rich-editor-modal-actions">
            <button className="rich-editor-modal-button cancel" onClick={onCancel}>
              취소
            </button>
            <button 
              className="rich-editor-modal-button save" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

