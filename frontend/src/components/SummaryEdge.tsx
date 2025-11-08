import { useMemo } from 'react';
import {
  type Edge,
  type Node,
  type EdgeStyle,
} from '../store/mindmap';
import { getNodeDisplayDimensions } from '../utils/nodeHelpers';
import './SummaryEdge.css';

interface SummaryEdgeProps {
  edge: Edge;
  nodes: Node[];
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const DEFAULT_PADDING = 28;
const DEFAULT_HEIGHT = 64;

const getThemeColor = (style?: EdgeStyle) =>
  style?.strokeColor ?? '#60a5fa';

export default function SummaryEdge({
  edge,
  nodes,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: SummaryEdgeProps) {
  const summary = edge.summary;
  const nodeLookup = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  if (!summary || summary.nodeIds.length === 0) {
    return null;
  }

  const targetNodes = summary.nodeIds
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

  const left = Math.min(...rects.map((r) => r.x));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const top = Math.min(...rects.map((r) => r.y));

  const collapsed = summary.collapsed ?? false;
  const padding = summary.padding ?? DEFAULT_PADDING;
  const arcHeight = collapsed ? 24 : summary.height ?? DEFAULT_HEIGHT;
  const baseY = top - padding;
  const span = Math.max(right - left, 1);

  const startX = left;
  const endX = right;
  const apexY = baseY - arcHeight;

  const displayColor = getThemeColor(edge.style);
  const strokeWidth = isSelected
    ? (edge.style?.strokeWidth ?? 2) + 0.6
    : edge.style?.strokeWidth ?? 2;

  const transparentStroke = strokeWidth + 14;

  const onSummaryContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e);
  };

  const title = summary.title ?? edge.label ?? 'Summary';

  const arcPath = `M ${startX} ${baseY} C ${startX + span / 3} ${apexY}, ${
    endX - span / 3
  } ${apexY}, ${endX} ${baseY}`;

  return (
    <g className={`summary-edge ${isSelected ? 'selected' : ''}`}>
      <path
        d={arcPath}
        stroke="transparent"
        strokeWidth={transparentStroke}
        fill="none"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onSummaryContextMenu}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />

      <path
        d={arcPath}
        stroke={displayColor}
        strokeWidth={strokeWidth}
        fill="none"
        className="summary-edge__arc"
        pointerEvents="none"
      />
      <path
        d={`M ${startX} ${baseY} L ${endX} ${baseY}`}
        stroke={displayColor}
        strokeWidth={strokeWidth / 2}
        strokeDasharray="6 6"
        pointerEvents="none"
        opacity={0.6}
      />

      <foreignObject
        x={startX + span / 2 - 80}
        y={apexY - 42}
        width={160}
        height={56}
        pointerEvents="none"
      >
        <div
          className={`summary-edge__label ${isSelected ? 'selected' : ''}`}
          style={{ borderColor: displayColor }}
        >
          {title}
          {summary.collapsed && (
            <span className="summary-edge__badge">Collapsed</span>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

