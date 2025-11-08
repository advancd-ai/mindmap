import { useMemo } from 'react';
import {
  type Edge,
  type Node,
} from '../store/mindmap';
import { getNodeDisplayDimensions } from '../utils/nodeHelpers';
import './BoundaryEdge.css';

interface BoundaryEdgeProps {
  edge: Edge;
  nodes: Node[];
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const THEME_MAP: Record<string, { fill: string; stroke: string }> = {
  default: {
    fill: 'rgba(191, 219, 254, 0.18)',
    stroke: 'rgba(59, 130, 246, 0.6)',
  },
  info: {
    fill: 'rgba(165, 243, 252, 0.2)',
    stroke: 'rgba(14, 165, 233, 0.6)',
  },
  success: {
    fill: 'rgba(187, 247, 208, 0.22)',
    stroke: 'rgba(34, 197, 94, 0.6)',
  },
  warning: {
    fill: 'rgba(254, 240, 138, 0.25)',
    stroke: 'rgba(234, 179, 8, 0.6)',
  },
};

const DEFAULT_PADDING = 36;

export default function BoundaryEdge({
  edge,
  nodes,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: BoundaryEdgeProps) {
  const boundary = edge.boundary;
  const nodeLookup = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  if (!boundary || boundary.nodeIds.length === 0) {
    return null;
  }

  const targetNodes = boundary.nodeIds
    .map((id) => nodeLookup.get(id))
    .filter((node): node is Node => Boolean(node));

  if (targetNodes.length === 0) {
    return null;
  }

  const rects = targetNodes.map((node) => {
    const { w, h } = getNodeDisplayDimensions(node);
    return {
      x: node.x,
      y: node.y,
      w,
      h,
    };
  });

  const padding = boundary.padding ?? DEFAULT_PADDING;
  const left = Math.min(...rects.map((r) => r.x)) - padding;
  const right = Math.max(...rects.map((r) => r.x + r.w)) + padding;
  const top = Math.min(...rects.map((r) => r.y)) - padding;
  const bottom = Math.max(...rects.map((r) => r.y + r.h)) + padding;

  const width = right - left;
  const height = bottom - top;

  const themeKey = boundary.theme ?? 'default';
  const theme = THEME_MAP[themeKey] ?? THEME_MAP.default;
  const strokeWidth = isSelected
    ? (edge.style?.strokeWidth ?? 1.5) + 1
    : edge.style?.strokeWidth ?? 1.5;

  const title = boundary.title ?? edge.label ?? 'Boundary';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e);
  };

  return (
    <g className={`boundary-edge ${isSelected ? 'selected' : ''}`}>
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={boundary.shape === 'organic' ? 48 : 18}
        ry={boundary.shape === 'organic' ? 48 : 18}
        fill="transparent"
        stroke="transparent"
        strokeWidth={strokeWidth + 32}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />

      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={boundary.shape === 'organic' ? 48 : 18}
        ry={boundary.shape === 'organic' ? 48 : 18}
        fill={theme.fill}
        stroke={theme.stroke}
        strokeWidth={strokeWidth}
        className="boundary-edge__shape"
        pointerEvents="none"
      />

      <foreignObject
        x={left}
        y={top - 32}
        width={Math.max(120, width)}
        height={28}
        pointerEvents="none"
      >
        <div className="boundary-edge__title-wrapper">
          <div className="boundary-edge__title">{title}</div>
        </div>
      </foreignObject>
    </g>
  );
}

