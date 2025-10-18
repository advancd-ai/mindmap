/**
 * Map validation using AJV
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Map } from '../types';

// Import schema (in production, load from file system or embed)
const mapSchema = {
  type: 'object',
  required: ['id', 'title', 'nodes', 'edges', 'updatedAt', 'version'],
  properties: {
    id: { type: 'string', pattern: '^map_[a-z0-9-]{6,}$' },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    tags: { type: 'array', items: { type: 'string', maxLength: 32 }, maxItems: 20 },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label', 'x', 'y', 'w', 'h'],
        properties: {
          id: { type: 'string', pattern: '^n_[A-Za-z0-9_-]{4,}$' },
          label: { type: 'string', maxLength: 200 },
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number', minimum: 20, maximum: 1000 },
          h: { type: 'number', minimum: 20, maximum: 1000 },
          collapsed: { type: 'boolean' },
          embedUrl: { type: 'string', format: 'uri' },
          embedType: { type: 'string', enum: ['youtube', 'webpage', 'image', 'pdf'] },
          meta: { type: 'object' },
        },
      },
      maxItems: 5000,
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'source', 'target'],
        properties: {
          id: { type: 'string', pattern: '^e_[A-Za-z0-9_-]{4,}$' },
          source: { type: 'string' },
          target: { type: 'string' },
          label: { type: 'string', maxLength: 50 },
          meta: { type: 'object' },
        },
      },
    },
    viewState: {
      type: 'object',
      properties: {
        zoom: { type: 'number', minimum: 0.1, maximum: 5.0 },
        viewBox: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number', minimum: 100 },
            height: { type: 'number', minimum: 100 },
          },
          required: ['x', 'y', 'width', 'height'],
        },
      },
    },
    updatedAt: { type: 'string', format: 'date-time' },
    version: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
};

const ajv = new Ajv({ 
  allErrors: true,
  strict: false,
  validateFormats: true
});
addFormats(ajv);

const validate = ajv.compile(mapSchema);

export function validateMap(map: any): { valid: boolean; errors?: any[] } {
  const valid = validate(map);

  if (!valid) {
    return { valid: false, errors: validate.errors };
  }

  // Cross-validation: check edge references
  const nodeIds = new Set(map.nodes.map((n: any) => n.id));
  const edgeErrors = [];

  for (const edge of map.edges) {
    if (!nodeIds.has(edge.source)) {
      edgeErrors.push({
        field: 'edges',
        message: `Edge ${edge.id} references non-existent source: ${edge.source}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      edgeErrors.push({
        field: 'edges',
        message: `Edge ${edge.id} references non-existent target: ${edge.target}`,
      });
    }
  }

  if (edgeErrors.length > 0) {
    return { valid: false, errors: edgeErrors };
  }

  return { valid: true };
}

