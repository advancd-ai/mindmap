/**
 * Edge Component - Connection line between nodes
 */

import { type Edge as EdgeType, type Node } from '../store/mindmap';
import { getEdgePath, getLabelPosition } from '../utils/edgeHelpers';
import { getNodeDisplayDimensions } from '../utils/nodeHelpers';
import './Edge.css';

interface EdgeProps {
  edge: EdgeType;
  sourceNode: Node;
  targetNode: Node;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function Edge({ 
  edge, 
  sourceNode, 
  targetNode, 
  isSelected, 
  onClick,
  onDoubleClick,
  onContextMenu
}: EdgeProps) {
  // Get display dimensions considering collapsed state
  const sourceDim = getNodeDisplayDimensions(sourceNode);
  const targetDim = getNodeDisplayDimensions(targetNode);

  const x1 = sourceNode.x + sourceDim.w / 2;
  const y1 = sourceNode.y + sourceDim.h / 2;
  const x2 = targetNode.x + targetDim.w / 2;
  const y2 = targetNode.y + targetDim.h / 2;

  // Get path based on edge type using node boundaries
  const edgeType = edge.edgeType || 'straight';
  const pathData = getEdgePath(
    x1, y1, x2, y2, edgeType,
    sourceDim.w, sourceDim.h,
    targetDim.w, targetDim.h
  );

  // Calculate label position on the curve using node boundaries
  const labelPos = getLabelPosition(
    x1, y1, x2, y2, edgeType,
    sourceDim.w, sourceDim.h,
    targetDim.w, targetDim.h
  );
  const midX = labelPos.x;
  const midY = labelPos.y;

  // Edge classes for styling
  const edgeClasses = [
    'edge',
    isSelected ? 'selected' : '',
    sourceNode.collapsed ? 'from-collapsed' : '',
    targetNode.collapsed ? 'to-collapsed' : '',
    `edge-${edgeType}`,
  ].filter(Boolean).join(' ');

  return (
    <g className={edgeClasses}>
      {/* Invisible wider path for easier clicking */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="12"
        fill="none"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onContextMenu) {
            onContextMenu(e);
          }
        }}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />
      
      {/* Visible path */}
      <path
        d={pathData}
        stroke={isSelected ? '#2563eb' : '#CBD5E1'}
        strokeWidth={isSelected ? 2 : 1.5}
        fill="none"
        markerEnd="url(#arrowhead)"
        pointerEvents="none"
        className="edge-visible-path"
      />

      {/* Label */}
      {edge.label && (
        <g pointerEvents="none">
          <rect
            x={midX - 40}
            y={midY - 12}
            width="80"
            height="24"
            rx="4"
            fill="#ffffff"
            stroke={isSelected ? '#2563eb' : '#9ca3af'}
            strokeWidth="1"
          />
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill={isSelected ? '#2563eb' : '#6b7280'}
            fontWeight="500"
          >
            {edge.label}
          </text>
        </g>
      )}

      {/* Hint when selected but no label */}
      {isSelected && !edge.label && (
        <text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
          fontStyle="italic"
          pointerEvents="none"
        >
          Double-click to add label
        </text>
      )}
    </g>
  );
}
