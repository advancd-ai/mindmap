import type {
  EdgeControlPoint,
  EdgeLabelOffset,
  EdgeLabelPosition,
} from '../store/mindmap';

/**
 * Edge helper functions
 */

interface Point {
  x: number;
  y: number;
}

const EDGE_PATH_MODES = [
  'straight',
  'orthogonal',
  'curved',
  'bezier',
  'organic',
  'radial',
  'spline',
  'bundle',
  'hierarchical',
] as const;

type EdgePathMode = (typeof EDGE_PATH_MODES)[number];

const toPoint = (point: EdgeControlPoint | Point): Point => ({
  x: point.x,
  y: point.y,
});

const lengthBetween = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const cubicPoint = (t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
};

const normalizePathMode = (value?: string): EdgePathMode => {
  const candidate = (value ?? 'straight').toLowerCase();
  return EDGE_PATH_MODES.includes(candidate as EdgePathMode)
    ? (candidate as EdgePathMode)
    : 'straight';
};

const controlOverride = (controlPoints?: EdgeControlPoint[]): Point[] | null => {
  if (!controlPoints || controlPoints.length === 0) {
    return null;
  }

  if (controlPoints.length === 1) {
    const point = toPoint(controlPoints[0]);
    return [point, point];
  }

  return [toPoint(controlPoints[0]), toPoint(controlPoints[1])];
};

const computeCubicControls = (
  mode: EdgePathMode,
  start: Point,
  end: Point,
  controlPoints?: EdgeControlPoint[]
): [Point, Point] => {
  const override = controlOverride(controlPoints);
  if (override) {
    return [override[0], override[1]];
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy) || 1;
  const direction = { x: dx / distance, y: dy / distance };
  const perp = { x: -direction.y, y: direction.x };

  switch (mode) {
    case 'bezier': {
      return [
        { x: start.x + dx * 0.3, y: start.y + dy * 0.1 },
        { x: start.x + dx * 0.7, y: start.y + dy * 0.9 },
      ];
    }

    case 'radial': {
      const arcSign = dx >= 0 ? 1 : -1;
      const offset = Math.max(60, distance * 0.55);
      return [
        {
          x: start.x + dx * 0.25 + perp.x * offset * arcSign,
          y: start.y + dy * 0.25 + perp.y * offset * arcSign,
        },
        {
          x: start.x + dx * 0.75 + perp.x * offset * arcSign,
          y: start.y + dy * 0.75 + perp.y * offset * arcSign,
        },
      ];
    }

    case 'spline': {
      const offset = distance * 0.3;
      return [
        {
          x: start.x + dx * 0.2 + perp.x * offset,
          y: start.y + dy * 0.2 + perp.y * offset,
        },
        {
          x: start.x + dx * 0.8 - perp.x * offset,
          y: start.y + dy * 0.8 - perp.y * offset,
        },
      ];
    }

    case 'bundle': {
      const verticalDirection = start.y <= end.y ? 1 : -1;
      const lift = Math.min(220, Math.max(70, Math.abs(dx) * 0.25 + Math.abs(dy) * 0.35));
      return [
        { x: start.x, y: start.y + verticalDirection * lift },
        { x: end.x, y: start.y + verticalDirection * lift * 0.9 },
      ];
    }

    case 'organic':
    case 'curved':
    default: {
      const offset = distance * 0.22;
      return [
        {
          x: start.x + dx * 0.25 + perp.x * offset,
          y: start.y + dy * 0.25 + perp.y * offset,
        },
        {
          x: start.x + dx * 0.75 - perp.x * offset,
          y: start.y + dy * 0.75 - perp.y * offset,
        },
      ];
    }
  }
};

const buildPolylinePath = (points: Point[]): string => {
  if (points.length === 0) {
    return '';
  }

  const [first, ...rest] = points;
  const segments = [`M ${first.x} ${first.y}`];
  rest.forEach((point) => segments.push(`L ${point.x} ${point.y}`));
  return segments.join(' ');
};

const polylineMidPoint = (points: Point[], offset: EdgeLabelOffset): Point => {
  if (points.length === 0) {
    return { x: offset.x ?? 0, y: offset.y ?? 0 };
  }

  const totalLength = points.reduce((acc, point, index) => {
    if (index === 0) return 0;
    return acc + lengthBetween(points[index - 1], point);
  }, 0);

  const target = totalLength / 2;
  let traversed = 0;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const current = points[i];
    const segmentLength = lengthBetween(prev, current);

    if (traversed + segmentLength >= target) {
      const ratio = segmentLength === 0 ? 0 : (target - traversed) / segmentLength;
      const point = lerpPoint(prev, current, ratio);
      return {
        x: point.x + (offset?.x ?? 0),
        y: point.y + (offset?.y ?? 0),
      };
    }

    traversed += segmentLength;
  }

  const last = points[points.length - 1];
  return {
    x: last.x + (offset?.x ?? 0),
    y: last.y + (offset?.y ?? 0),
  };
};

// Generate path based on edge type / routing
export function getEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: string = 'straight',
  sourceWidth?: number,
  sourceHeight?: number,
  targetWidth?: number,
  targetHeight?: number,
  controlPoints?: EdgeControlPoint[]
): string {
  let startX = x1;
  let startY = y1;
  let endX = x2;
  let endY = y2;

  if (sourceWidth && sourceHeight && targetWidth && targetHeight) {
    const sourceEdge = getNodeEdgePoint(x1, y1, sourceWidth, sourceHeight, x2, y2);
    const targetEdge = getNodeEdgePoint(x2, y2, targetWidth, targetHeight, x1, y1);

    startX = sourceEdge.x;
    startY = sourceEdge.y;
    endX = targetEdge.x;
    endY = targetEdge.y;
  }

  const start = { x: startX, y: startY };
  const end = { x: endX, y: endY };
  const mode = normalizePathMode(type);

  switch (mode) {
    case 'orthogonal': {
      if (controlPoints && controlPoints.length > 0) {
        const points = [start, ...controlPoints.map(toPoint), end];
        return buildPolylinePath(points);
      }

      const dx = endX - startX;
      const dy = endY - startY;
      const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

      const points = horizontalDominant
        ? [
            start,
            { x: startX + dx / 2, y: startY },
            { x: startX + dx / 2, y: endY },
            end,
          ]
        : [
            start,
            { x: startX, y: startY + dy / 2 },
            { x: endX, y: startY + dy / 2 },
            end,
          ];

      return buildPolylinePath(points);
    }

    case 'hierarchical': {
      if (controlPoints && controlPoints.length > 0) {
        const points = [start, ...controlPoints.map(toPoint), end];
        return buildPolylinePath(points);
      }

      const dy = endY - startY;
      const dx = endX - startX;

      if (Math.abs(dy) < 4 && Math.abs(dx) < 4) {
        return `M ${startX} ${startY} L ${endX} ${endY}`;
      }

      const verticalDirection = startY <= endY ? 1 : -1;
      const levelOffset = Math.min(240, Math.max(70, Math.abs(dy) * 0.6));
      const pivotY = startY + verticalDirection * levelOffset;

      const points = [
        start,
        { x: startX, y: pivotY },
        { x: endX, y: pivotY },
        end,
      ];

      return buildPolylinePath(points);
    }

    case 'straight':
      return `M ${startX} ${startY} L ${endX} ${endY}`;

    case 'curved':
    case 'bezier':
    case 'organic':
    case 'radial':
    case 'spline':
    case 'bundle':
    default: {
      const [cp1, cp2] = computeCubicControls(mode, start, end, controlPoints);
      return `M ${startX} ${startY} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endX} ${endY}`;
    }
  }
}

// Calculate label position on the edge path
export function getLabelPosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: string = 'straight',
  sourceWidth?: number,
  sourceHeight?: number,
  targetWidth?: number,
  targetHeight?: number,
  position: EdgeLabelPosition = 'middle',
  offset: EdgeLabelOffset = { x: 0, y: 0 },
  controlPoints?: EdgeControlPoint[]
): { x: number; y: number } {
  let startX = x1;
  let startY = y1;
  let endX = x2;
  let endY = y2;

  if (sourceWidth && sourceHeight && targetWidth && targetHeight) {
    const sourceEdge = getNodeEdgePoint(x1, y1, sourceWidth, sourceHeight, x2, y2);
    const targetEdge = getNodeEdgePoint(x2, y2, targetWidth, targetHeight, x1, y1);

    startX = sourceEdge.x;
    startY = sourceEdge.y;
    endX = targetEdge.x;
    endY = targetEdge.y;
  }

  const start = { x: startX, y: startY };
  const end = { x: endX, y: endY };
  const mode = normalizePathMode(type);

  if (position === 'source') {
    return {
      x: start.x + (offset?.x ?? 0),
      y: start.y + (offset?.y ?? 0),
    };
  }

  if (position === 'target') {
    return {
      x: end.x + (offset?.x ?? 0),
      y: end.y + (offset?.y ?? 0),
    };
  }

  switch (mode) {
    case 'orthogonal':
    case 'hierarchical': {
      const points =
        controlPoints && controlPoints.length > 0
          ? [start, ...controlPoints.map(toPoint), end]
          : (() => {
              const dx = endX - startX;
              const dy = endY - startY;
              const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

              if (mode === 'hierarchical') {
                const verticalDirection = startY <= endY ? 1 : -1;
                const levelOffset = Math.min(240, Math.max(70, Math.abs(dy) * 0.6));
                const pivotY = startY + verticalDirection * levelOffset;
                return [
                  start,
                  { x: startX, y: pivotY },
                  { x: endX, y: pivotY },
                  end,
                ];
              }

              return horizontalDominant
                ? [
                    start,
                    { x: startX + dx / 2, y: startY },
                    { x: startX + dx / 2, y: endY },
                    end,
                  ]
                : [
                    start,
                    { x: startX, y: startY + dy / 2 },
                    { x: endX, y: startY + dy / 2 },
                    end,
                  ];
            })();

      return polylineMidPoint(points, offset);
    }

    case 'straight': {
      return {
        x: (startX + endX) / 2 + (offset?.x ?? 0),
        y: (startY + endY) / 2 + (offset?.y ?? 0),
      };
    }

    case 'curved':
    case 'bezier':
    case 'organic':
    case 'radial':
    case 'spline':
    case 'bundle':
    default: {
      const [cp1, cp2] = computeCubicControls(mode, start, end, controlPoints);
      const point = cubicPoint(0.5, start, cp1, cp2, end);
      return {
        x: point.x + (offset?.x ?? 0),
        y: point.y + (offset?.y ?? 0),
      };
    }
  }
}

// Calculate intersection point of line from node center to target with node boundary
function getNodeEdgePoint(
  nodeX: number, nodeY: number, nodeWidth: number, nodeHeight: number,
  targetX: number, targetY: number
): { x: number; y: number } {
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;
  
  // Calculate direction vector from node center to target
  const dx = targetX - nodeX;
  const dy = targetY - nodeY;
  
  // Normalize direction vector
  const length = Math.sqrt(dx * dx + dy * dy);
  const dirX = dx / length;
  const dirY = dy / length;
  
  // Calculate intersection with node rectangle
  // Check intersections with each edge of the rectangle
  const intersections = [];
  
  // Left edge (x = nodeX - halfWidth)
  if (dirX !== 0) {
    const t = (nodeX - halfWidth - nodeX) / dirX;
    if (t > 0) {
      const y = nodeY + dirY * t;
      if (y >= nodeY - halfHeight && y <= nodeY + halfHeight) {
        intersections.push({ x: nodeX - halfWidth, y });
      }
    }
  }
  
  // Right edge (x = nodeX + halfWidth)
  if (dirX !== 0) {
    const t = (nodeX + halfWidth - nodeX) / dirX;
    if (t > 0) {
      const y = nodeY + dirY * t;
      if (y >= nodeY - halfHeight && y <= nodeY + halfHeight) {
        intersections.push({ x: nodeX + halfWidth, y });
      }
    }
  }
  
  // Top edge (y = nodeY - halfHeight)
  if (dirY !== 0) {
    const t = (nodeY - halfHeight - nodeY) / dirY;
    if (t > 0) {
      const x = nodeX + dirX * t;
      if (x >= nodeX - halfWidth && x <= nodeX + halfWidth) {
        intersections.push({ x, y: nodeY - halfHeight });
      }
    }
  }
  
  // Bottom edge (y = nodeY + halfHeight)
  if (dirY !== 0) {
    const t = (nodeY + halfHeight - nodeY) / dirY;
    if (t > 0) {
      const x = nodeX + dirX * t;
      if (x >= nodeX - halfWidth && x <= nodeX + halfWidth) {
        intersections.push({ x, y: nodeY + halfHeight });
      }
    }
  }
  
  // Return the closest intersection point to the target
  if (intersections.length > 0) {
    let closest = intersections[0];
    let minDistance = Math.sqrt(
      Math.pow(closest.x - targetX, 2) + Math.pow(closest.y - targetY, 2)
    );
    
    for (const intersection of intersections) {
      const distance = Math.sqrt(
        Math.pow(intersection.x - targetX, 2) + Math.pow(intersection.y - targetY, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = intersection;
      }
    }
    
    return closest;
  }
  
  // Fallback to node center if no intersection found
  return { x: nodeX, y: nodeY };
}

