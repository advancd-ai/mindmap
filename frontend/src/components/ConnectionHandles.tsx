/**
 * ConnectionHandles Component - Visual handles for creating connections
 */

import { type Node } from '../store/mindmap';
import './ConnectionHandles.css';

interface ConnectionHandlesProps {
  node: Node;
  onStartConnection: (e: React.MouseEvent) => void;
}

export default function ConnectionHandles({ node, onStartConnection }: ConnectionHandlesProps) {
  const handles = [
    { cx: node.x + node.w / 2, cy: node.y, position: 'top' }, // Top
    { cx: node.x + node.w, cy: node.y + node.h / 2, position: 'right' }, // Right
    { cx: node.x + node.w / 2, cy: node.y + node.h, position: 'bottom' }, // Bottom
    { cx: node.x, cy: node.y + node.h / 2, position: 'left' }, // Left
  ];

  return (
    <>
      {handles.map((handle, index) => (
        <circle
          key={`${node.id}-handle-${index}`}
          cx={handle.cx}
          cy={handle.cy}
          r="6"
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth="2"
          className="connection-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartConnection(e);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={{ cursor: 'crosshair' }}
        />
      ))}
    </>
  );
}

