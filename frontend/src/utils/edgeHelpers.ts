/**
 * Edge helper functions
 */

// Generate path based on edge type
export function getEdgePath(
  x1: number, y1: number, x2: number, y2: number, 
  type: string = 'straight',
  sourceWidth?: number, sourceHeight?: number,
  targetWidth?: number, targetHeight?: number
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

  switch (type) {
    case 'curved': {
      // Smooth curve using quadratic bezier
      const dx = endX - startX;
      const dy = endY - startY;
      const controlX = startX + dx / 2;
      const controlY = startY + dy / 2 - Math.abs(dx) * 0.2;
      return `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`;
    }
    
    case 'bezier': {
      // Free-form bezier curve
      const dx = endX - startX;
      const dy = endY - startY;
      const control1X = startX + dx * 0.3;
      const control1Y = startY + dy * 0.1;
      const control2X = startX + dx * 0.7;
      const control2Y = startY + dy * 0.9;
      return `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
    }
    
    case 'straight':
    default:
      // Straight line
      return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
}

// Calculate label position on the curve (at t=0.5)
export function getLabelPosition(
  x1: number, y1: number, x2: number, y2: number, 
  type: string = 'straight',
  sourceWidth?: number, sourceHeight?: number,
  targetWidth?: number, targetHeight?: number
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

  switch (type) {
    case 'curved': {
      // Quadratic Bezier: P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const dx = endX - startX;
      const dy = endY - startY;
      const controlX = startX + dx / 2;
      const controlY = startY + dy / 2 - Math.abs(dx) * 0.2;
      
      const t = 0.5;
      const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX;
      const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY;
      
      return { x, y };
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
      
      return { x, y };
    }
    
    case 'straight':
    default:
      // Midpoint between edge endpoints
      return {
        x: (startX + endX) / 2,
        y: (startY + endY) / 2,
      };
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

