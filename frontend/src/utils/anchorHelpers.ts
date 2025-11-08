import { type Node } from '../store/mindmap';
import { getNodeDisplayDimensions } from './nodeHelpers';

export const TOTAL_NODE_ANCHORS = 12;

interface AnchorPosition {
  index: number;
  edgePoint: { x: number; y: number };
  visualPoint: { x: number; y: number };
  angle: number;
}

function computeBoundaryIntersection(
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
  dirX: number,
  dirY: number
): { x: number; y: number } {
  const candidates: Array<{ x: number; y: number; t: number }> = [];

  if (dirX > 0) {
    const t = halfWidth / dirX;
    const y = centerY + dirY * t;
    if (Math.abs(y - centerY) <= halfHeight + 1e-6) {
      candidates.push({ x: centerX + halfWidth, y, t });
    }
  } else if (dirX < 0) {
    const t = -halfWidth / dirX;
    const y = centerY + dirY * t;
    if (Math.abs(y - centerY) <= halfHeight + 1e-6) {
      candidates.push({ x: centerX - halfWidth, y, t });
    }
  }

  if (dirY > 0) {
    const t = halfHeight / dirY;
    const x = centerX + dirX * t;
    if (Math.abs(x - centerX) <= halfWidth + 1e-6) {
      candidates.push({ x, y: centerY + halfHeight, t });
    }
  } else if (dirY < 0) {
    const t = -halfHeight / dirY;
    const x = centerX + dirX * t;
    if (Math.abs(x - centerX) <= halfWidth + 1e-6) {
      candidates.push({ x, y: centerY - halfHeight, t });
    }
  }

  if (candidates.length === 0) {
    return { x: centerX, y: centerY };
  }

  let closest = candidates[0];
  for (const candidate of candidates) {
    if (candidate.t < closest.t) {
      closest = candidate;
    }
  }
  return { x: closest.x, y: closest.y };
}

export function getNodeAnchorPosition(node: Node, anchorIndex: number): AnchorPosition {
  const { w, h } = getNodeDisplayDimensions(node);
  const centerX = node.x + w / 2;
  const centerY = node.y + h / 2;
  const halfWidth = w / 2;
  const halfHeight = h / 2;

  const angle = (anchorIndex / TOTAL_NODE_ANCHORS) * Math.PI * 2 - Math.PI / 2; // 0 at top
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  const boundary = computeBoundaryIntersection(centerX, centerY, halfWidth, halfHeight, dirX, dirY);
  const visualOffset = Math.max(14, Math.max(halfWidth, halfHeight) * 0.15);

  return {
    index: anchorIndex,
    angle,
    edgePoint: boundary,
    visualPoint: {
      x: boundary.x + dirX * visualOffset,
      y: boundary.y + dirY * visualOffset,
    },
  };
}

export function getNodeAnchorPositions(node: Node): AnchorPosition[] {
  const anchors: AnchorPosition[] = [];
  for (let i = 0; i < TOTAL_NODE_ANCHORS; i += 1) {
    anchors.push(getNodeAnchorPosition(node, i));
  }
  return anchors;
}
