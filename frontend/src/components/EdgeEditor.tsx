/**
 * EdgeEditor - Inline text editor for edge labels
 */

import { useState, useRef, useEffect } from 'react';
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
    onSave(value);
  };

  return (
    <foreignObject
      x={x - 60}
      y={y - 15}
      width={120}
      height={30}
      className="edge-editor-wrapper"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="edge-editor-input"
        placeholder="Label"
        maxLength={50}
      />
    </foreignObject>
  );
}

