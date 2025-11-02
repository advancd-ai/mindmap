/**
 * NodeEditor - Inline text editor for node labels
 * Supports multi-line markdown editing with toolbar
 */

import { useState, useRef, useEffect } from 'react';
import './NodeEditor.css';

interface NodeEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  initialValue: string;
  textAlign?: 'left' | 'center' | 'right';
  onSave: (newLabel: string) => void;
  onCancel: () => void;
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
  editorType?: 'markdown' | 'richeditor' | 'text'; // 에디터 타입 (footer 라벨용)
}

export default function NodeEditor({
  x,
  y,
  width,
  height,
  initialValue,
  textAlign = 'left',
  onSave,
  onCancel,
  // @ts-ignore - Not used but kept for API compatibility
  onTextAlignChange,
  editorType = 'markdown',
}: NodeEditorProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and set cursor to end when editor appears
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end of text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      
      // Auto-resize textarea to fit content
      autoResize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoResize = () => {
    if (textareaRef.current) {
      // Reset height to auto to get scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set height to scrollHeight, but limit to max height (node height)
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = height;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Alt+Enter (Option+Enter on Mac): Save and exit
    if (e.key === 'Enter' && e.altKey) {
      e.preventDefault();
      onSave(value);
    }
    // Ctrl/Cmd + Enter: Save (backward compatibility)
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(value);
    } 
    // Escape: Cancel
    else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    // Tab: Insert 2 spaces (markdown convention)
    else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setValue(newValue);
        // Move cursor after inserted spaces
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
          autoResize();
        }, 0);
      }
    }
    // Allow normal Enter for new lines
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Don't close editor if focus is moving to toolbar
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.markdown-toolbar')) {
      // Focus is moving to toolbar, keep editor open
      return;
    }
    
    // Save on blur (click outside)
    if (value.trim()) {
      onSave(value);
    } else {
      onCancel();
    }
  };

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      className="node-editor-wrapper"
      pointerEvents="all"
      onClick={(e) => {
        // Prevent event from bubbling to canvas
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent dragging when clicking inside editor
        e.stopPropagation();
      }}
    >
      <div className="node-editor-container">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="node-editor-textarea"
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            fontSize: '14px',
            border: '2px solid #2563eb',
            borderRadius: '8px',
            outline: 'none',
            textAlign: textAlign,
            background: '#ffffff',
            fontFamily: 'inherit',
            resize: 'none',
            overflow: 'auto',
            lineHeight: '1.5',
          }}
          placeholder="Enter text... (Markdown supported)"
          wrap="soft"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <div className="node-editor-help">
          <span className="help-text">
            <span className="editor-type-label">
              {editorType === 'markdown' && 'Markdown'}
              {editorType === 'richeditor' && 'Rich Editor'}
              {editorType === 'text' && 'Text'}
            </span>
            <span className="separator">•</span>
            <kbd>Alt</kbd> + <kbd>Enter</kbd> 저장 후 종료 • <kbd>Esc</kbd> 취소
          </span>
        </div>
      </div>
    </foreignObject>
  );
}

