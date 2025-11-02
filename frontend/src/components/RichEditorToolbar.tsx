/**
 * RichEditorToolbar - Toolbar for rich text formatting
 * Used in RichEditor to provide WYSIWYG formatting buttons
 */

import { useRef } from 'react';
import './RichEditorToolbar.css';

interface RichEditorToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
  textAlign?: 'left' | 'center' | 'right';
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
  onCommand: (command: string, value?: string) => void;
}

export default function RichEditorToolbar({
  editorRef,
  textAlign = 'left',
  onTextAlignChange,
  onCommand,
}: RichEditorToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleBold = () => {
    onCommand('bold');
  };

  const handleItalic = () => {
    onCommand('italic');
  };

  const handleUnderline = () => {
    onCommand('underline');
  };

  const handleStrikethrough = () => {
    onCommand('strikeThrough');
  };

  const handleCode = () => {
    onCommand('formatBlock', '<code>');
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      // Text is selected, wrap it as link
      const url = prompt('Enter URL:');
      if (url) {
        onCommand('createLink', url);
        // Add security attributes
        const editor = editorRef.current;
        if (editor) {
          setTimeout(() => {
            const links = editor.querySelectorAll('a');
            links.forEach((link) => {
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener noreferrer');
            });
          }, 0);
        }
      }
    } else {
      // No text selected, insert link template
      const url = prompt('Enter URL:');
      if (url) {
        const text = prompt('Enter link text:', 'link') || 'link';
        const editor = editorRef.current;
        if (editor) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = text;
            range.deleteContents();
            range.insertNode(link);
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.setStartAfter(link);
            newRange.collapse(true);
            selection.addRange(newRange);
            editor.focus();
          }
        }
      }
    }
  };

  const handleHeading = (level: 1 | 2 | 3) => {
    onCommand('formatBlock', `<h${level}>`);
  };

  const handleList = (ordered: boolean) => {
    if (ordered) {
      onCommand('insertOrderedList');
    } else {
      onCommand('insertUnorderedList');
    }
  };

  const handleBlockquote = () => {
    onCommand('formatBlock', '<blockquote>');
  };

  const handleCodeBlock = () => {
    onCommand('formatBlock', '<pre>');
  };

  const handleHorizontalRule = () => {
    onCommand('insertHorizontalRule');
  };

  const handleTextAlign = (align: 'left' | 'center' | 'right') => {
    onCommand('justifyLeft');
    if (align === 'center') {
      onCommand('justifyCenter');
    } else if (align === 'right') {
      onCommand('justifyRight');
    }
    onTextAlignChange?.(align);
  };

  return (
    <div
      ref={toolbarRef}
      className="rich-editor-toolbar"
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
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
            handleUnderline();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
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
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Bullet List"
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
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Numbered List"
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

