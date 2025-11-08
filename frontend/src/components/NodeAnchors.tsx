import { memo } from 'react';
import { type Node } from '../store/mindmap';
import { getNodeAnchorPosition, TOTAL_NODE_ANCHORS } from '../utils/anchorHelpers';
import './NodeAnchors.css';

interface NodeAnchorsProps {
  node: Node;
  visible: boolean;
  activeAnchor?: number | null;
  hoveredAnchor?: number | null;
  interactive?: boolean;
  onAnchorClick?: (anchorIndex: number) => void;
  onAnchorEnter?: (anchorIndex: number) => void;
  onAnchorLeave?: () => void;
}

function NodeAnchors({
  node,
  visible,
  activeAnchor,
  hoveredAnchor,
  interactive = false,
  onAnchorClick,
  onAnchorEnter,
  onAnchorLeave,
}: NodeAnchorsProps) {
  if (!visible) {
    return null;
  }

  const anchors = Array.from({ length: TOTAL_NODE_ANCHORS }, (_, index) =>
    getNodeAnchorPosition(node, index)
  );

  return (
    <g className="node-anchors" data-node={node.id}>
      {anchors.map(({ index, visualPoint }) => {
        const isActive = activeAnchor === index;
        const isHovered = hoveredAnchor === index;
        const classNames = [
          'node-anchor',
          isActive ? 'active' : '',
          isHovered ? 'hovered' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <circle
            key={`${node.id}-anchor-${index}`}
            className={classNames}
            cx={visualPoint.x}
            cy={visualPoint.y}
            r={isActive ? 8 : 6}
            onPointerDown={(event) => {
              if (!interactive) return;
              if (event.button !== 0) return;
              event.stopPropagation();
              event.preventDefault();
              onAnchorClick?.(index);
            }}
            onPointerEnter={(event) => {
              if (!interactive) return;
              event.stopPropagation();
              onAnchorEnter?.(index);
            }}
            onPointerLeave={(event) => {
              if (!interactive) return;
              event.stopPropagation();
              onAnchorLeave?.();
            }}
          />
        );
      })}
    </g>
  );
}

export default memo(NodeAnchors);
