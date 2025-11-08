/**
 * EdgeEditor - Inline text editor for edge labels
 */

import { useEffect, useRef, useState } from 'react';
import './EdgeEditor.css';

interface EdgeEditorProps {
  x: number;
  y: number;
  initialValue: string;
  onSave: (newLabel: string) => void;
  onCancel: () => void;
}

export default function EdgeEditor({
  x,
  y,
  initialValue,
  onSave,
  onCancel,
}: EdgeEditorProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleSave = () => {
    onSave(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <foreignObject
      x={x - 90}
      y={y - 50}
      width={200}
      height={110}
      className="edge-editor-wrapper"
    >
      <div
        className="edge-editor"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="edge-editor-textarea"
          placeholder="Edge details (Markdown supported)"
          maxLength={200}
          rows={3}
        />
        <div className="edge-editor-hint">
          Enter to save · Shift+Enter for newline · Esc to cancel
        </div>
      </div>
    </foreignObject>
  );
}

