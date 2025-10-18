/**
 * Helper functions for node operations
 */

import type { Node } from '../store/mindmap';

/**
 * Get the display dimensions of a node considering collapsed state
 */
export function getNodeDisplayDimensions(node: Node): { w: number; h: number } {
  if (node.collapsed) {
    return { w: 180, h: 50 };
  }
  return { w: node.w, h: node.h };
}

/**
 * Get the center point of a node considering collapsed state
 */
export function getNodeCenter(node: Node): { x: number; y: number } {
  const dim = getNodeDisplayDimensions(node);
  return {
    x: node.x + dim.w / 2,
    y: node.y + dim.h / 2,
  };
}

/**
 * Check if a node has embeddable content
 */
export function hasEmbeddableContent(node: Node): boolean {
  return !!node.embedUrl;
}

/**
 * Get collapsed node title (truncated)
 */
export function getCollapsedTitle(label: string, maxLength: number = 15): string {
  if (label.length <= maxLength) return label;
  return `${label.substring(0, maxLength)}...`;
}

