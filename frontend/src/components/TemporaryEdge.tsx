/**
 * TemporaryEdge Component - Preview line while creating connection
 */

import { type Node } from '../store/mindmap';

// Get display dimensions considering collapsed state
function getNodeDisplayDimensions(node: Node): { w: number; h: number } {
  if (node.collapsed) {
    return { w: 180, h: 50 };
  }
  return { w: node.w, h: node.h };
}

interface TemporaryEdgeProps {
  sourceNode: Node;
  endPoint: { x: number; y: number };
}

export default function TemporaryEdge({ sourceNode, endPoint }: TemporaryEdgeProps) {
  // Consider collapsed state
  const { w: displayW, h: displayH } = getNodeDisplayDimensions(sourceNode);
  
  const x1 = sourceNode.x + displayW / 2;
  const y1 = sourceNode.y + displayH / 2;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={endPoint.x}
      y2={endPoint.y}
      stroke="#2563eb"
      strokeWidth="2"
      strokeDasharray="5,5"
      opacity="0.6"
      pointerEvents="none"
    />
  );
}

