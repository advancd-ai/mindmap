/**
 * RichEditor - WYSIWYG rich text editor component
 * Uses contentEditable for inline editing with formatting toolbar
 */

import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import RichEditorToolbar from './RichEditorToolbar';
import './RichEditor.css';

interface RichEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  initialValue: string;
  textAlign?: 'left' | 'center' | 'right';
  onSave: (newLabel: string) => void;
  onCancel: () => void;
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
}

export default function RichEditor({
  x,
  y,
  width,
  height,
  initialValue,
  textAlign = 'left',
  onSave,
  onCancel,
  onTextAlignChange,
}: RichEditorProps) {
  const [currentTextAlign, setCurrentTextAlign] = useState<'left' | 'center' | 'right'>(textAlign);
  const [pasteAsPlainText, setPasteAsPlainText] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      // Set initial content
      editorRef.current.innerHTML = initialValue || '';
      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      autoResize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update currentTextAlign when textAlign prop changes
  useEffect(() => {
    setCurrentTextAlign(textAlign);
  }, [textAlign]);

  const autoResize = () => {
    if (editorRef.current) {
      const scrollHeight = editorRef.current.scrollHeight;
      const maxHeight = height - 60; // Reserve space for toolbar
      editorRef.current.style.minHeight = `${Math.min(scrollHeight, maxHeight)}px`;
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
    // Ctrl/Cmd + Enter: Save (backward compatibility)
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    // Escape: Cancel
    else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Allow normal Enter for new lines (but handle formatting)
    else if (e.key === 'Enter' && !e.shiftKey) {
      // If we're in a list, create new list item
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const listItem = (container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : container as Element)?.closest('li');
        
        if (listItem) {
          // Let default behavior create new list item
          return;
        }
      }
      // Allow default Enter behavior for new paragraphs
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
      // Trigger link insertion via toolbar
      const toolbar = document.querySelector('.rich-editor-toolbar');
      const linkBtn = toolbar?.querySelector('[title="Link (Ctrl+K)"]') as HTMLButtonElement;
      linkBtn?.click();
    }
    // Shift + Ctrl/Cmd + V: 플레인 텍스트 붙여넣기 모드
    else if (e.key === 'v' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      setPasteAsPlainText(true);
      // 다음 paste 이벤트에서만 적용되도록 setTimeout으로 리셋
      setTimeout(() => {
        setPasteAsPlainText(false);
      }, 100);
      // 실제 paste는 handlePaste에서 처리
      document.execCommand('paste');
    }
  };

  const handleSave = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onSave(html);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Don't close editor if focus is moving to toolbar
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.rich-editor-toolbar')) {
      // Focus is moving to toolbar, keep editor open
      return;
    }

    // Save on blur (click outside)
    if (editorRef.current && editorRef.current.innerHTML.trim()) {
      handleSave();
    } else {
      onCancel();
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    autoResize();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault(); // 기본 동작 방지

    const clipboardData = e.clipboardData;
    const pastedHTML = clipboardData.getData('text/html');
    const pastedText = clipboardData.getData('text/plain');

    // 플레인 텍스트 모드 또는 HTML이 없으면 텍스트만 붙여넣기
    if (pasteAsPlainText || !pastedHTML) {
      // 플레인 텍스트 붙여넣기
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // 텍스트 노드 삽입
        const textNode = document.createTextNode(pastedText || '');
        range.insertNode(textNode);

        // 커서 이동
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      autoResize();
      return;
    }

    // HTML 내용을 sanitize
    const sanitized = DOMPurify.sanitize(pastedHTML, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'hr',
        'a', 'span', 'div',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      // 인라인 스타일 제거 (깔끔한 HTML 유지)
      FORBID_ATTR: ['style', 'class', 'id'],
    });

    // Selection에 HTML 삽입
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      // sanitized HTML을 DOM에 삽입
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitized;

      // 링크에 보안 속성 추가
      const links = tempDiv.querySelectorAll('a');
      links.forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });

      // Fragment를 만들어 삽입
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      range.insertNode(fragment);

      // 커서를 삽입된 내용 뒤로 이동
      range.setStartAfter(fragment.lastChild || range.startContainer);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    autoResize();
  };

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      className="rich-editor-wrapper"
      pointerEvents="all"
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="rich-editor-container">
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
          className="rich-editor-content"
          style={{
            textAlign: currentTextAlign,
          }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          suppressContentEditableWarning
        />
        <div className="rich-editor-help">
          <span className="help-text">
            <kbd>Alt</kbd> + <kbd>Enter</kbd> 저장 후 종료 • <kbd>Esc</kbd> 취소 • <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>V</kbd> 텍스트만 붙여넣기
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

