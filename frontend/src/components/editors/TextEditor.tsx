/**
 * TextEditor - Simple inline text editor for quick text editing
 * Minimal UI with basic input field for fast text modifications
 */

import { useState, useRef, useEffect } from 'react';
import './TextEditor.css';

interface TextEditorProps {
  x: number;
  y: number;
  width: number;
  height: number;
  initialValue: string;
  textAlign?: 'left' | 'center' | 'right';
  onSave: (newLabel: string) => void;
  onCancel: () => void;
  editorType?: 'markdown' | 'richeditor' | 'text'; // 에디터 타입 (footer 라벨용)
}

export default function TextEditor({
  x,
  y,
  width,
  height,
  initialValue,
  textAlign = 'left',
  onSave,
  onCancel,
  editorType = 'text',
}: TextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Use textarea if content seems multiline or longer
    const shouldUseTextarea = initialValue.includes('\n') || initialValue.length > 50;
    
    if (shouldUseTextarea && textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = Math.min(height - 20, 150); // Max 5 lines approximately
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    } else if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current) {
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = Math.min(height - 20, 150);
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Enter: Save (for input) or Save and exit (for textarea with Alt)
    if (e.key === 'Enter') {
      if (textareaRef.current && !e.altKey) {
        // Allow normal Enter in textarea for new lines
        return;
      }
      // Alt+Enter or Enter in input: Save
      e.preventDefault();
      onSave(value.trim() || value);
    }
    // Escape: Cancel
    else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // Save on blur if content exists
    if (value.trim()) {
      onSave(value.trim() || value);
    } else {
      onCancel();
    }
  };

  const shouldUseTextarea = initialValue.includes('\n') || initialValue.length > 50;

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      className="text-editor-wrapper"
      pointerEvents="all"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="text-editor-container">
        {shouldUseTextarea ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-editor-textarea"
            style={{
              width: '100%',
              minHeight: '40px',
              maxHeight: `${Math.min(height - 20, 150)}px`,
              padding: '8px',
              fontSize: '14px',
              border: '2px solid #2563eb',
              borderRadius: '6px',
              outline: 'none',
              textAlign,
              background: '#ffffff',
              fontFamily: 'inherit',
              resize: 'none',
              overflow: 'auto',
              lineHeight: '1.5',
            }}
            placeholder="Enter text..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-editor-input"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '2px solid #2563eb',
              borderRadius: '6px',
              outline: 'none',
              textAlign,
              background: '#ffffff',
              fontFamily: 'inherit',
            }}
            placeholder="Enter text..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
        <div className="text-editor-help">
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

