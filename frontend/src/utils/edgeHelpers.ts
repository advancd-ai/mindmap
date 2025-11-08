import type {
  EdgeControlPoint,
  EdgeLabelOffset,
  EdgeLabelPosition,
} from '../store/mindmap';

/**
 * Edge helper functions
 */

// Generate path based on edge type
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
  
  // Calculate edge endpoints on node boundaries
  let startX = x1, startY = y1, endX = x2, endY = y2;
  
  if (sourceWidth && sourceHeight && targetWidth && targetHeight) {
    // Calculate intersection points on node boundaries
    const sourceEdge = getNodeEdgePoint(x1, y1, sourceWidth, sourceHeight, x2, y2);
    const targetEdge = getNodeEdgePoint(x2, y2, targetWidth, targetHeight, x1, y1);
    
    startX = sourceEdge.x;
    startY = sourceEdge.y;
    endX = targetEdge.x;
    endY = targetEdge.y;
  }

  const defaultOrthogonalPoints = () => {
    const dx = endX - startX;
    const dy = endY - startY;
    const horizontalDominant = Math.abs(dx) >= Math.abs(dy);

    if (horizontalDominant) {
      const midX = startX + dx / 2;
      return [
        { x: midX, y: startY },
        { x: midX, y: endY },
      ];
    }

    const midY = startY + dy / 2;
    return [
      { x: startX, y: midY },
      { x: endX, y: midY },
    ];
  };

  switch (type) {
    case 'orthogonal': {
      const points =
        controlPoints && controlPoints.length > 0
          ? controlPoints
          : defaultOrthogonalPoints();
      const segments = [`M ${startX} ${startY}`];
      for (const point of points) {
        segments.push(`L ${point.x} ${point.y}`);
      }
      segments.push(`L ${endX} ${endY}`);
      return segments.join(' ');
    }

    case 'curved': {
      // Smooth curve using quadratic bezier
      const dx = endX - startX;
      const dy = endY - startY;
      const controlPoint =
        controlPoints && controlPoints[0]
          ? controlPoints[0]
          : {
              x: startX + dx / 2,
              y: startY + dy / 2 - Math.abs(dx) * 0.2,
            };
      return `M ${startX} ${startY} Q ${controlPoint.x} ${controlPoint.y}, ${endX} ${endY}`;
    }
    
    case 'bezier': {
      // Free-form bezier curve
      const dx = endX - startX;
      const dy = endY - startY;
      const control1 =
        controlPoints && controlPoints[0]
          ? controlPoints[0]
          : { x: startX + dx * 0.3, y: startY + dy * 0.1 };
      const control2 =
        controlPoints && controlPoints[1]
          ? controlPoints[1]
          : { x: startX + dx * 0.7, y: startY + dy * 0.9 };
      return `M ${startX} ${startY} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${endX} ${endY}`;
    }
    
    case 'straight':
    default:
      // Straight line
      return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
}

// Calculate label position on the curve (at t=0.5)
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
  
  // Calculate edge endpoints on node boundaries
  let startX = x1, startY = y1, endX = x2, endY = y2;
  
  if (sourceWidth && sourceHeight && targetWidth && targetHeight) {
    // Calculate intersection points on node boundaries
    const sourceEdge = getNodeEdgePoint(x1, y1, sourceWidth, sourceHeight, x2, y2);
    const targetEdge = getNodeEdgePoint(x2, y2, targetWidth, targetHeight, x1, y1);
    
    startX = sourceEdge.x;
    startY = sourceEdge.y;
    endX = targetEdge.x;
    endY = targetEdge.y;
  }

  const applyOffset = (point: { x: number; y: number }) => ({
    x: point.x + (offset?.x ?? 0),
    y: point.y + (offset?.y ?? 0),
  });

  if (position === 'source') {
    return applyOffset({ x: startX, y: startY });
  }

  if (position === 'target') {
    return applyOffset({ x: endX, y: endY });
  }

  switch (type) {
    case 'orthogonal': {
      const dx = endX - startX;
      const dy = endY - startY;
      const horizontalDominant = Math.abs(dx) >= Math.abs(dy);
      const points =
        controlPoints && controlPoints.length > 0
          ? controlPoints
          : horizontalDominant
          ? [
              { x: startX + dx / 2, y: startY },
              { x: startX + dx / 2, y: endY },
            ]
          : [
              { x: startX, y: startY + dy / 2 },
              { x: endX, y: startY + dy / 2 },
            ];

      const pathPoints = [{ x: startX, y: startY }, ...points, { x: endX, y: endY }];
      const totalLength = pathPoints.reduce((acc, point, index) => {
        if (index === 0) return acc;
        const prev = pathPoints[index - 1];
        return acc + Math.hypot(point.x - prev.x, point.y - prev.y);
      }, 0);

      const targetDistance = totalLength / 2;
      let accum = 0;

      for (let i = 1; i < pathPoints.length; i += 1) {
        const prev = pathPoints[i - 1];
        const point = pathPoints[i];
        const segmentLength = Math.hypot(point.x - prev.x, point.y - prev.y);

        if (accum + segmentLength >= targetDistance) {
          const ratio = (targetDistance - accum) / segmentLength;
          const x = prev.x + (point.x - prev.x) * ratio;
          const y = prev.y + (point.y - prev.y) * ratio;
          return applyOffset({ x, y });
        }

        accum += segmentLength;
      }

      return applyOffset({ x: endX, y: endY });
    }

    case 'curved': {
      // Quadratic Bezier: P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const dx = endX - startX;
      const dy = endY - startY;
      const controlX = startX + dx / 2;
      const controlY = startY + dy / 2 - Math.abs(dx) * 0.2;
      
      const t = 0.5;
      const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX;
      const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY;
      
      return applyOffset({ x, y });
    }
    
    case 'bezier': {
      // Cubic Bezier: P(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
      const dx = endX - startX;
      const dy = endY - startY;
      const control1X = startX + dx * 0.3;
      const control1Y = startY + dy * 0.1;
      const control2X = startX + dx * 0.7;
      const control2Y = startY + dy * 0.9;
      
      const t = 0.5;
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      
      const x = mt3 * startX + 3 * mt2 * t * control1X + 3 * mt * t2 * control2X + t3 * endX;
      const y = mt3 * startY + 3 * mt2 * t * control1Y + 3 * mt * t2 * control2Y + t3 * endY;
      
      return applyOffset({ x, y });
    }
    
    case 'straight':
    default:
      // Midpoint between edge endpoints
      return applyOffset({
        x: (startX + endX) / 2,
        y: (startY + endY) / 2,
      });
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

