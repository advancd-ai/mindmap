/**
 * Edge Component - Connection line between nodes
 */

import type { CSSProperties } from 'react';
import {
  type Edge as EdgeType,
  type EdgeMarker,
  type Node,
} from '../store/mindmap';
import { getEdgePath, getLabelPosition } from '../utils/edgeHelpers';
import { getNodeAnchorPosition } from '../utils/anchorHelpers';
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
  if (edge.category === 'summary' || edge.category === 'boundary') {
    return null;
  }
  // Get display dimensions considering collapsed state
  const sourceDim = getNodeDisplayDimensions(sourceNode);
  const targetDim = getNodeDisplayDimensions(targetNode);

  const defaultSource = {
    x: sourceNode.x + sourceDim.w / 2,
    y: sourceNode.y + sourceDim.h / 2,
  };
  const defaultTarget = {
    x: targetNode.x + targetDim.w / 2,
    y: targetNode.y + targetDim.h / 2,
  };

  const sourceAnchor =
    typeof edge.sourceAnchor === 'number'
      ? getNodeAnchorPosition(sourceNode, Math.max(0, Math.min(11, edge.sourceAnchor)))
      : null;
  const targetAnchor =
    typeof edge.targetAnchor === 'number'
      ? getNodeAnchorPosition(targetNode, Math.max(0, Math.min(11, edge.targetAnchor)))
      : null;

  const startPoint = sourceAnchor?.edgePoint ?? defaultSource;
  const endPoint = targetAnchor?.edgePoint ?? defaultTarget;

  const category = edge.category ?? 'branch';
  const routing = edge.routing ?? 'straight';
  const pathType = (() => {
    if (edge.edgeType) {
      return edge.edgeType;
    }

    if (routing === 'organic') {
      return category === 'relationship' ? 'bezier' : 'organic';
    }

    return routing;
  })();

  const style = edge.style ?? {};
  const strokeColor =
    style.strokeColor ?? (category === 'relationship' ? '#f97316' : '#94a3b8');
  const baseStrokeWidth =
    style.strokeWidth ?? (category === 'relationship' ? 1.75 : 1.5);
  const strokeWidth = isSelected ? baseStrokeWidth + 0.75 : baseStrokeWidth;
  const dashPattern = style.dashPattern?.length
    ? style.dashPattern.join(' ')
    : undefined;
  const markerStart = (style.markerStart ?? 'none') as EdgeMarker;
  const markerEnd = (style.markerEnd ?? 'arrow') as EdgeMarker;

  const markerStartId =
    markerStart !== 'none' ? `edge-marker-start-${edge.id}` : undefined;
  const markerEndId =
    markerEnd !== 'none' ? `edge-marker-end-${edge.id}` : undefined;

  const pathData = getEdgePath(
    startPoint.x,
    startPoint.y,
    endPoint.x,
    endPoint.y,
    pathType,
    sourceAnchor ? undefined : sourceDim.w,
    sourceAnchor ? undefined : sourceDim.h,
    targetAnchor ? undefined : targetDim.w,
    targetAnchor ? undefined : targetDim.h,
    edge.controlPoints
  );

  // Calculate label position on the curve using node boundaries
  const labelPos = getLabelPosition(
    startPoint.x,
    startPoint.y,
    endPoint.x,
    endPoint.y,
    pathType,
    sourceAnchor ? undefined : sourceDim.w,
    sourceAnchor ? undefined : sourceDim.h,
    targetAnchor ? undefined : targetDim.w,
    targetAnchor ? undefined : targetDim.h,
    edge.labelPosition,
    edge.labelOffset,
    edge.controlPoints
  );
  const midX = labelPos.x;
  const midY = labelPos.y;
  const iconDecorators =
    edge.decorators?.filter((decorator) => decorator.type === 'icon') ?? [];

  // Edge classes for styling
  const edgeClasses = [
    'edge',
    isSelected ? 'selected' : '',
    sourceNode.collapsed ? 'from-collapsed' : '',
    targetNode.collapsed ? 'to-collapsed' : '',
    `edge-${pathType}`,
    `edge-routing-${routing}`,
    `edge-kind-${category}`,
  ].filter(Boolean).join(' ');

  return (
    <g
      className={edgeClasses}
      data-kind={category}
      style={
        {
          '--edge-hover-width': strokeWidth + 0.75,
        } as CSSProperties
      }
    >
      <defs>
        {markerStartId && (
          <marker
            id={markerStartId}
            markerWidth="10"
            markerHeight="10"
            orient="auto"
            refX={markerStart === 'arrow' ? 1 : 4}
            refY={markerStart === 'arrow' ? 3 : 3}
          >
            {markerStart === 'arrow' ? (
              <polygon points="10 0, 0 3, 10 6" fill={strokeColor} />
            ) : (
              <circle cx="3" cy="3" r="3" fill={strokeColor} />
            )}
          </marker>
        )}
        {markerEndId && (
          <marker
            id={markerEndId}
            markerWidth="10"
            markerHeight="10"
            orient="auto"
            refX={markerEnd === 'arrow' ? 9 : 3}
            refY={markerEnd === 'arrow' ? 3 : 3}
          >
            {markerEnd === 'arrow' ? (
              <polygon points="0 0, 10 3, 0 6" fill={strokeColor} />
            ) : (
              <circle cx="3" cy="3" r="3" fill={strokeColor} />
            )}
          </marker>
        )}
      </defs>

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
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
        markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        pointerEvents="none"
        className="edge-visible-path"
        strokeDasharray={dashPattern}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: isSelected
            ? 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.35))'
            : undefined,
        }}
      />

      {/* Label */}
      {edge.label && (
        <foreignObject
          x={midX - 90}
          y={midY - 26}
          width={180}
          height={80}
          className="edge-label-fo"
          pointerEvents="none"
        >
          <div
            className={`edge-label-card ${isSelected ? 'selected' : ''}`}
            data-kind={category}
          >
            <div className="edge-label-text">{edge.label}</div>
            {iconDecorators.length > 0 && (
              <div className="edge-label-badges">
                {iconDecorators.map((decorator, index) => (
                  <span key={`${edge.id}-decorator-${index}`} className="edge-label-badge" style={{ borderColor: decorator.color ?? 'rgba(148,163,184,0.45)' }}>
                    {decorator.icon ?? '●'} {decorator.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </foreignObject>
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
