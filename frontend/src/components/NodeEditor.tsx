/**
 * NodeEditor - Inline text editor for node labels
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
}

export default function NodeEditor({
  x,
  y,
  width,
  height,
  initialValue,
  textAlign = 'center',
  onSave,
  onCancel,
}: NodeEditorProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus and select text when editor appears
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
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
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="node-editor-input"
        style={{
          width: '100%',
          height: '100%',
          padding: '8px',
          fontSize: '14px',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          outline: 'none',
          textAlign: textAlign,
          background: '#ffffff',
        }}
        maxLength={200}
      />
    </foreignObject>
  );
}

