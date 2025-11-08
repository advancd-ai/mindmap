import { type Node } from '../store/mindmap';
import { getNodeDisplayDimensions } from './nodeHelpers';

export const TOTAL_NODE_ANCHORS = 12;

interface AnchorPosition {
  index: number;
  edgePoint: { x: number; y: number };
  visualPoint: { x: number; y: number };
  angle: number;
}

interface Point {
  x: number;
  y: number;
}

const RECT_EDGE_FRACTIONS = [0.15, 0.5, 0.85] as const;
const DIAMOND_EDGE_FRACTIONS = [0.2, 0.5, 0.8] as const;
const HEX_EDGE_FRACTIONS = [0.35, 0.65] as const;

function interpolatePoint(start: Point, end: Point, fraction: number): Point {
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  };
}

function buildPolygonAnchors(vertices: Point[], fractions: readonly number[]): Point[] {
  const anchors: Point[] = [];
  const vertexCount = vertices.length;

  for (let i = 0; i < vertexCount; i += 1) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertexCount];
    for (const fraction of fractions) {
      anchors.push(interpolatePoint(start, end, fraction));
    }
  }

  return anchors;
}

function getPolygonVertices(node: Node): { vertices: Point[]; fractions: readonly number[] } {
  const { w, h } = getNodeDisplayDimensions(node);
  const centerX = node.x + w / 2;
  const centerY = node.y + h / 2;
  const halfWidth = w / 2;
  const halfHeight = h / 2;

  const left = centerX - halfWidth;
  const right = centerX + halfWidth;
  const top = centerY - halfHeight;
  const bottom = centerY + halfHeight;

  const shape = node.nodeType ?? 'rect';

  switch (shape) {
    case 'diamond': {
      const topPoint: Point = { x: centerX, y: top };
      const rightPoint: Point = { x: right, y: centerY };
      const bottomPoint: Point = { x: centerX, y: bottom };
      const leftPoint: Point = { x: left, y: centerY };
      return {
        vertices: [topPoint, rightPoint, bottomPoint, leftPoint],
        fractions: DIAMOND_EDGE_FRACTIONS,
      };
    }

    case 'hex': {
      const offset = w * 0.2;
      const topLeft: Point = { x: left + offset, y: top };
      const topRight: Point = { x: right - offset, y: top };
      const rightMid: Point = { x: right, y: centerY };
      const bottomRight: Point = { x: right - offset, y: bottom };
      const bottomLeft: Point = { x: left + offset, y: bottom };
      const leftMid: Point = { x: left, y: centerY };
      return {
        vertices: [topLeft, topRight, rightMid, bottomRight, bottomLeft, leftMid],
        fractions: HEX_EDGE_FRACTIONS,
      };
    }

    case 'file':
    case 'card':
    case 'capsule':
    case 'rect':
    default: {
      const topLeft: Point = { x: left, y: top };
      const topRight: Point = { x: right, y: top };
      const bottomRight: Point = { x: right, y: bottom };
      const bottomLeft: Point = { x: left, y: bottom };
      return {
        vertices: [topLeft, topRight, bottomRight, bottomLeft],
        fractions: RECT_EDGE_FRACTIONS,
      };
    }
  }
}

function getCircleAnchors(node: Node): Point[] {
  const { w, h } = getNodeDisplayDimensions(node);
  const centerX = node.x + w / 2;
  const centerY = node.y + h / 2;
  const radius = Math.min(w, h) / 2;

  const anchors: Point[] = [];
  for (let i = 0; i < TOTAL_NODE_ANCHORS; i += 1) {
    const angle = (i / TOTAL_NODE_ANCHORS) * Math.PI * 2 - Math.PI / 2;
    anchors.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return anchors;
}

function getCloudAnchors(node: Node): Point[] {
  const { w, h } = getNodeDisplayDimensions(node);
  const centerX = node.x + w / 2;
  const centerY = node.y + h / 2;
  const radius = Math.min(w, h) * 0.45;

  const anchors: Point[] = [];
  for (let i = 0; i < TOTAL_NODE_ANCHORS; i += 1) {
    const angle = (i / TOTAL_NODE_ANCHORS) * Math.PI * 2 - Math.PI / 2;
    anchors.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return anchors;
}

function getAnchorPointsForNode(node: Node): Point[] {
  const shape = node.nodeType ?? 'rect';

  if (shape === 'circle') {
    return getCircleAnchors(node);
  }

  if (shape === 'cloud') {
    return getCloudAnchors(node);
  }

  const { vertices, fractions } = getPolygonVertices(node);
  return buildPolygonAnchors(vertices, fractions);
}

export function getNodeAnchorPosition(node: Node, anchorIndex: number): AnchorPosition {
  const points = getAnchorPointsForNode(node);
  const pointCount = points.length || 1;
  const index = ((anchorIndex % pointCount) + pointCount) % pointCount;
  const edgePoint = points[index] ?? points[0];

  const { w, h } = getNodeDisplayDimensions(node);
  const centerX = node.x + w / 2;
  const centerY = node.y + h / 2;

  const dirX = edgePoint.x - centerX;
  const dirY = edgePoint.y - centerY;
  const length = Math.hypot(dirX, dirY) || 1;
  const normalX = dirX / length;
  const normalY = dirY / length;

  const visualOffset = Math.max(14, Math.max(w, h) * 0.08);

  return {
    index,
    angle: Math.atan2(dirY, dirX),
    edgePoint,
    visualPoint: {
      x: edgePoint.x + normalX * visualOffset,
      y: edgePoint.y + normalY * visualOffset,
    },
  };
}

export function getNodeAnchorPositions(node: Node): AnchorPosition[] {
  return Array.from({ length: TOTAL_NODE_ANCHORS }, (_, index) => getNodeAnchorPosition(node, index));
}
