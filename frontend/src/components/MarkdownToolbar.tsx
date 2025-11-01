/**
 * MarkdownToolbar - Toolbar for inserting markdown syntax
 * Used in NodeEditor to provide quick access to markdown formatting
 */

import { useRef } from 'react';
import './MarkdownToolbar.css';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onInsert: (newValue: string, cursorOffset?: number) => void;
  textAlign?: 'left' | 'center' | 'right';
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
}

export default function MarkdownToolbar({ 
  textareaRef, 
  onInsert, 
  textAlign = 'left',
  onTextAlignChange 
}: MarkdownToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const getSelection = (): { start: number; end: number; selectedText: string } | null => {
    const textarea = textareaRef.current;
    if (!textarea) return null;

    // Ensure textarea has focus before reading selection
    textarea.focus();
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    // Use textarea.value instead of value prop to ensure we get the actual current value
    const selectedText = textarea.value.substring(start, end);

    return { start, end, selectedText };
  };

  const wrapSelection = (before: string, after: string = '', placeholder?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Ensure focus before getting selection
    textarea.focus();
    
    const selection = getSelection();
    if (!selection) return;

    const { start, end, selectedText } = selection;

    const text = selectedText || placeholder || '';
    const wrappedText = before + text + after;
    // Use textarea.value to get the actual current value
    const currentValue = textarea.value;
    const beforeText = currentValue.substring(0, start);
    const afterText = currentValue.substring(end);
    const newValue = beforeText + wrappedText + afterText;
    const newCursorPos = start + before.length + text.length;

    onInsert(newValue, newCursorPos);
  };

  const insertAtCursor = (text: string, cursorOffset?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Ensure focus before getting selection
    textarea.focus();
    
    const selection = getSelection();
    if (!selection) return;

    const { start, end } = selection;
    // Use textarea.value to get the actual current value
    const currentValue = textarea.value;
    const before = currentValue.substring(0, start);
    const after = currentValue.substring(end);
    const newValue = before + text + after;
    const newCursorPos = cursorOffset !== undefined 
      ? start + cursorOffset 
      : start + text.length;

    onInsert(newValue, newCursorPos);
  };

  const handleBold = () => {
    wrapSelection('**', '**', 'bold text');
  };

  const handleItalic = () => {
    wrapSelection('*', '*', 'italic text');
  };

  const handleStrikethrough = () => {
    wrapSelection('~~', '~~', 'strikethrough text');
  };

  const handleCode = () => {
    wrapSelection('`', '`', 'code');
  };

  const handleLink = () => {
    const selection = getSelection();
    if (!selection) return;

    const { selectedText } = selection;
    if (selectedText.trim()) {
      // If text is selected, wrap it as link
      wrapSelection('[', '](url)', selectedText.trim());
      // Placeholder selection for URL
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const after = textarea.value.substring(cursorPos);
          if (after.startsWith('(url)')) {
            const urlStart = cursorPos;
            const urlEnd = urlStart + 4; // 'url' length
            textarea.setSelectionRange(urlStart, urlEnd);
          }
        }
      }, 10);
    } else {
      // Insert link template
      insertAtCursor('[text](url)', 1); // Cursor after '['
      // Select 'text' for easy replacement
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const before = textarea.value.substring(0, cursorPos);
          // Find the position of 'text' in the link template
          const linkTemplateIndex = before.lastIndexOf('[text](url)');
          if (linkTemplateIndex >= 0) {
            const textStart = linkTemplateIndex + 1; // After '['
            textarea.setSelectionRange(textStart, textStart + 4); // Select 'text'
          }
        }
      }, 10);
    }
  };

  const handleHeading = (level: 1 | 2 | 3) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    
    const selection = getSelection();
    if (!selection) return;

    const { start, end } = selection;
    const prefix = '#'.repeat(level) + ' ';
    const currentValue = textarea.value;
    const lines = currentValue.substring(start, end).split('\n');
    const newLines = lines.map(line => prefix + line).join('\n');
    const newValue = currentValue.substring(0, start) + newLines + currentValue.substring(end);
    onInsert(newValue, start + prefix.length);
  };

  const handleList = (ordered: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    
    const selection = getSelection();
    if (!selection) return;

    const { start, end } = selection;
    const currentValue = textarea.value;
    const lines = currentValue.substring(start, end).split('\n');
    const prefix = ordered ? '1. ' : '- ';
    const newLines = lines.map(line => prefix + line).join('\n');
    const newValue = currentValue.substring(0, start) + newLines + currentValue.substring(end);
    onInsert(newValue, start + prefix.length);
  };

  const handleBlockquote = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    
    const selection = getSelection();
    if (!selection) return;

    const { start } = selection;
    // Check if we're at the start of a line
    const before = textarea.value.substring(0, start);
    const isStartOfLine = before === '' || before.endsWith('\n');
    
    const prefix = isStartOfLine ? '> ' : '\n> ';
    wrapSelection(prefix, '', 'Quote');
  };

  const handleCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    
    const selection = getSelection();
    if (!selection) return;

    const { start, selectedText } = selection;
    // Check if we're at the start of a line
    const before = textarea.value.substring(0, start);
    const isStartOfLine = before === '' || before.endsWith('\n');
    
    const prefix = isStartOfLine ? '```\n' : '\n```\n';
    const suffix = '\n```';
    const text = selectedText || 'code';
    
    wrapSelection(prefix, suffix, text);
  };

  const handleHorizontalRule = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    insertAtCursor('\n---\n', 4); // Cursor after '---'
  };

  const handleTextAlign = (align: 'left' | 'center' | 'right') => {
    onTextAlignChange?.(align);
  };

  return (
    <div 
      ref={toolbarRef} 
      className="markdown-toolbar"
      onClick={(e) => {
        // Prevent event from bubbling to parent
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Prevent dragging when clicking toolbar
        // Prevent blur on textarea when clicking toolbar buttons
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleBold();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleItalic();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleStrikethrough();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Strikethrough"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCode();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Inline Code"
        >
          <code style={{ fontSize: '12px' }}>`</code>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleLink();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Link (Ctrl+K)"
        >
          🔗
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleHeading(1);
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleHeading(2);
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleHeading(3);
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleList(false);
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Unordered List"
        >
          •
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleList(true);
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Ordered List"
        >
          1.
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleBlockquote();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Blockquote"
        >
          "
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCodeBlock();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Code Block"
        >
          {'</>'}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleHorizontalRule();
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Horizontal Rule"
        >
          ─
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn ${textAlign === 'left' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleTextAlign('left');
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Align Left"
        >
          ⬅
        </button>
        <button
          type="button"
          className={`toolbar-btn ${textAlign === 'center' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleTextAlign('center');
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Align Center"
        >
          ⬌
        </button>
        <button
          type="button"
          className={`toolbar-btn ${textAlign === 'right' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleTextAlign('right');
          }}
          onMouseDown={(e) => {
            // Prevent blur on textarea
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Align Right"
        >
          ➡
        </button>
      </div>
    </div>
  );
}

