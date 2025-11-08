/**
 * ToolbarHelp - Helper component showing keyboard shortcuts and instructions
 */

import { useEffect, useRef } from 'react';
import './ToolbarHelp.css';

export default function ToolbarHelp() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="toolbar-help">
      <details ref={detailsRef}>
        <summary className="help-summary">
          ℹ️ Help
        </summary>
        <div className="help-content">
          <h4 className="help-section-title">Nodes</h4>
          <ul className="help-list">
            <li><strong>Add:</strong> Click "Add Node" button (near selected node)</li>
            <li><strong>Add here:</strong> Right-click canvas → Add Node Here</li>
            <li><strong>Add child:</strong> Right-click node → Add Child Node</li>
            <li><strong>Edit:</strong> Double-click or right-click → Edit</li>
            <li><strong>Move:</strong> Click and drag</li>
            <li><strong>Resize:</strong> Drag corners/edges (8 handles)</li>
            <li><strong>Embed:</strong> Right-click → Add Embed (YouTube/Web)</li>
            <li><strong>Collapse:</strong> Click ‹ button (top-right)</li>
            <li><strong>Connect:</strong> Click blue handles</li>
            <li><strong>Change shape:</strong> Right-click → Change Shape</li>
            <li><strong>Text align:</strong> Right-click → Text Align (Horizontal/Vertical)</li>
          </ul>
          
          <h4 className="help-section-title">Edges</h4>
          <ul className="help-list">
            <li><strong>Select:</strong> Click on edge line</li>
            <li><strong>Add label:</strong> Double-click or right-click edge</li>
            <li><strong>Change type:</strong> Right-click → Edge Type (Straight/Curved/Bezier)</li>
            <li><strong>Menu:</strong> Right-click for more options</li>
          </ul>
          
          <h4 className="help-section-title">Zoom & View</h4>
          <ul className="help-list">
            <li><strong>Zoom:</strong> Ctrl + Scroll (or use 🔍 buttons)</li>
            <li><strong>Pan:</strong> Click and drag background</li>
            <li><strong>Reset:</strong> Click ⟲ button (100%)</li>
          </ul>
          
          <h4 className="help-section-title">Shortcuts</h4>
          <ul className="help-list">
            <li><strong>Enter:</strong> Save text</li>
            <li><strong>ESC:</strong> Cancel action</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
