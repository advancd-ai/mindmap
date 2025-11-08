/**
 * Map validation using AJV
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

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
          labelPosition: { type: 'string', enum: ['source', 'middle', 'target'] },
          labelOffset: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
          edgeType: { type: 'string', enum: ['straight', 'curved', 'bezier'] },
          category: { type: 'string', enum: ['branch', 'relationship', 'summary', 'boundary'] },
          routing: { type: 'string', enum: ['organic', 'orthogonal'] },
          controlPoints: {
            type: 'array',
            items: {
              type: 'object',
              required: ['x', 'y'],
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
              },
            },
            maxItems: 6,
          },
          style: {
            type: 'object',
            properties: {
              strokeColor: { type: 'string', pattern: '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$' },
              strokeWidth: { type: 'number', minimum: 0.5, maximum: 8 },
              dashPattern: {
                type: 'array',
                items: { type: 'number', minimum: 0 },
                maxItems: 6,
              },
              markerStart: { type: 'string', enum: ['none', 'arrow', 'circle'] },
              markerEnd: { type: 'string', enum: ['none', 'arrow', 'circle'] },
            },
          },
          summary: {
            type: 'object',
            properties: {
              nodeIds: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 50,
              },
              title: { type: 'string', maxLength: 80 },
              padding: { type: 'number', minimum: 0, maximum: 200 },
              height: { type: 'number', minimum: 10, maximum: 400 },
              collapsed: { type: 'boolean' },
            },
            required: ['nodeIds'],
          },
          boundary: {
            type: 'object',
            properties: {
              nodeIds: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 200,
              },
              title: { type: 'string', maxLength: 80 },
              padding: { type: 'number', minimum: 0, maximum: 300 },
              theme: { type: 'string', enum: ['default', 'info', 'success', 'warning'] },
              shape: { type: 'string', enum: ['rounded', 'organic'] },
            },
            required: ['nodeIds'],
          },
          decorators: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['icon', 'highlight'] },
                position: { type: 'number', minimum: 0, maximum: 1 },
                icon: { type: 'string', maxLength: 30 },
                label: { type: 'string', maxLength: 40 },
                color: { type: 'string', pattern: '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$' },
                length: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['type'],
              additionalProperties: false,
            },
          },
          meta: { type: 'object' },
        },
        additionalProperties: false,
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

export function validateMap(mapData: any): { valid: boolean; errors?: any[] } {
  const valid = validate(mapData);

  if (!valid) {
    return { valid: false, errors: validate.errors || [] };
  }

  // Type guard to ensure mapData has the expected structure
  if (!mapData || typeof mapData !== 'object' || !Array.isArray(mapData.nodes) || !Array.isArray(mapData.edges)) {
    return { valid: false, errors: ['Invalid map data structure'] };
  }

  // Cross-validation: check edge references
  const nodeIds = new Set(mapData.nodes.map((n: any) => n.id));
  const edgeErrors = [];

  for (const edge of mapData.edges) {
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
    if (edge.summary && Array.isArray(edge.summary.nodeIds)) {
      for (const nodeId of edge.summary.nodeIds) {
        if (!nodeIds.has(nodeId)) {
          edgeErrors.push({
            field: 'edges',
            message: `Summary edge ${edge.id} references non-existent node: ${nodeId}`,
          });
        }
      }
    }
    if (edge.boundary && Array.isArray(edge.boundary.nodeIds)) {
      for (const nodeId of edge.boundary.nodeIds) {
        if (!nodeIds.has(nodeId)) {
          edgeErrors.push({
            field: 'edges',
            message: `Boundary edge ${edge.id} references non-existent node: ${nodeId}`,
          });
        }
      }
    }
  }

  if (edgeErrors.length > 0) {
    return { valid: false, errors: edgeErrors };
  }

  return { valid: true };
}

