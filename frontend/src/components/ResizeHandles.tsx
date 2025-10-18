/**
 * ResizeHandles - Handles for resizing nodes
 */

import { type Node } from '../store/mindmap';
import './ResizeHandles.css';

interface ResizeHandlesProps {
  node: Node;
  onResizeStart: (e: React.MouseEvent, direction: ResizeDirection) => void;
}

export type ResizeDirection =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';

export default function ResizeHandles({ node, onResizeStart }: ResizeHandlesProps) {
  const baseRadius = 6;

  // Calculate handle positions at the center of each side/corner
  const handles = [
    { cx: node.x + node.w / 2, cy: node.y, cursor: 'ns-resize', dir: 'n' as ResizeDirection },
    { cx: node.x + node.w, cy: node.y, cursor: 'nesw-resize', dir: 'ne' as ResizeDirection },
    { cx: node.x + node.w, cy: node.y + node.h / 2, cursor: 'ew-resize', dir: 'e' as ResizeDirection },
    { cx: node.x + node.w, cy: node.y + node.h, cursor: 'nwse-resize', dir: 'se' as ResizeDirection },
    { cx: node.x + node.w / 2, cy: node.y + node.h, cursor: 'ns-resize', dir: 's' as ResizeDirection },
    { cx: node.x, cy: node.y + node.h, cursor: 'nesw-resize', dir: 'sw' as ResizeDirection },
    { cx: node.x, cy: node.y + node.h / 2, cursor: 'ew-resize', dir: 'w' as ResizeDirection },
    { cx: node.x, cy: node.y, cursor: 'nwse-resize', dir: 'nw' as ResizeDirection },
  ];

  return (
    <g className="resize-handles-group">
      {handles.map((handle, index) => (
        <g
          key={`resize-${node.id}-${index}`}
          className="resize-handle"
          data-direction={handle.dir}
          onMouseDown={(e) => {
            console.log('🔲 Resize handle clicked:', handle.dir);
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(e, handle.dir);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={{ cursor: handle.cursor, pointerEvents: 'all' }}
        >
          {/* Outer glow circle - larger hitbox for easier clicking */}
          <circle
            cx={handle.cx}
            cy={handle.cy}
            r={baseRadius + 6}
            fill="rgba(37, 99, 235, 0)"
            className="resize-handle-hitbox"
          />
          
          {/* Glow effect */}
          <circle
            cx={handle.cx}
            cy={handle.cy}
            r={baseRadius + 3}
            fill="rgba(37, 99, 235, 0)"
            className="resize-handle-glow"
          />
          
          {/* Main handle circle */}
          <circle
            cx={handle.cx}
            cy={handle.cy}
            r={baseRadius}
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="2"
            className="resize-handle-main"
          />
        </g>
      ))}
    </g>
  );
}
