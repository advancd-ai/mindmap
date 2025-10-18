/**
 * Schema Manager - Handles schema version management and migration
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Map } from '../types.js';

export interface SchemaInfo {
  version: string;
  format: string;
  description: string;
  schema: any;
  migrators: Record<string, Migrator>;
}

export interface Migrator {
  fromVersion: string;
  toVersion: string;
  migrate(data: any): any;
}

export interface MigrationResult {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

export class SchemaManager {
  private ajv: Ajv;
  private schemas: Map<string, SchemaInfo> = new Map();
  private registry: any;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      strict: false,
      validateFormats: true
    });
    addFormats(this.ajv);
    
    this.loadRegistry();
    this.loadSchemas();
    this.registerMigrators();
  }

  /**
   * Load schema registry
   */
  private async loadRegistry(): Promise<void> {
    try {
      // In production, load from file system or API
      const registryData = {
        "registryVersion": "1.0.0",
        "lastUpdated": "2024-01-15T10:30:00Z",
        "schemas": {
          "mindmap-v1": {
            "format": "mindmap-v1",
            "latest": "1.2.0",
            "versions": ["1.0.0", "1.1.0", "1.2.0"],
            "migrationPaths": {
              "1.0.0": ["1.1.0"],
              "1.1.0": ["1.2.0"],
              "1.2.0": ["2.0.0"]
            }
          },
          "mindmap-v2": {
            "format": "mindmap-v2",
            "latest": "2.0.0",
            "versions": ["2.0.0"],
            "migrationPaths": {
              "2.0.0": []
            }
          }
        }
      };
      
      this.registry = registryData;
    } catch (error) {
      console.error('Failed to load schema registry:', error);
      throw new Error('Schema registry not available');
    }
  }

  /**
   * Load all available schemas
   */
  private async loadSchemas(): Promise<void> {
    // In production, load schemas from file system
    // For now, we'll use the existing schema structure
    this.registerSchema('1.0.0', 'mindmap-v1', 'Initial mindmap schema', this.getV1Schema());
    this.registerSchema('1.1.0', 'mindmap-v1', 'Enhanced schema with styling', this.getV1EnhancedSchema());
    this.registerSchema('2.0.0', 'mindmap-v2', 'Advanced schema with 3D support', this.getV2Schema());
  }

  /**
   * Register a schema version
   */
  private registerSchema(version: string, format: string, description: string, schema: any): void {
    const schemaInfo: SchemaInfo = {
      version,
      format,
      description,
      schema,
      migrators: {}
    };

    this.schemas.set(version, schemaInfo);
    this.ajv.addSchema(schema, version);
  }

  /**
   * Register migration functions
   */
  private registerMigrators(): void {
    // Register migrator from 1.0.0 to 1.1.0
    this.registerMigrator('1.0.0', '1.1.0', this.migrateV1_0_0_to_V1_1_0);
    
    // Register migrator from 1.1.0 to 1.2.0
    this.registerMigrator('1.1.0', '1.2.0', this.migrateV1_1_0_to_V1_2_0);
    
    // Register migrator from 1.2.0 to 2.0.0
    this.registerMigrator('1.2.0', '2.0.0', this.migrateV1_2_0_to_V2_0_0);
  }

  /**
   * Register a migration function
   */
  private registerMigrator(fromVersion: string, toVersion: string, migrator: (data: any) => any): void {
    const schemaInfo = this.schemas.get(toVersion);
    if (schemaInfo) {
      schemaInfo.migrators[fromVersion] = {
        fromVersion,
        toVersion,
        migrate: migrator
      };
    }
  }

  /**
   * Validate data against a specific schema version
   */
  validate(data: any, version: string): { valid: boolean; errors?: any[] } {
    const schemaInfo = this.schemas.get(version);
    if (!schemaInfo) {
      return { valid: false, errors: [`Unknown schema version: ${version}`] };
    }

    const validate = this.ajv.getSchema(version);
    if (!validate) {
      return { valid: false, errors: [`Schema not loaded for version: ${version}`] };
    }

    const valid = validate(data);
    return {
      valid,
      errors: valid ? undefined : validate.errors
    };
  }

  /**
   * Migrate data from one version to another
   */
  migrate(data: any, fromVersion: string, toVersion: string): MigrationResult {
    try {
      if (fromVersion === toVersion) {
        return { success: true, data };
      }

      const schemaInfo = this.schemas.get(toVersion);
      if (!schemaInfo) {
        return { 
          success: false, 
          errors: [`Unknown target schema version: ${toVersion}`] 
        };
      }

      const migrator = schemaInfo.migrators[fromVersion];
      if (!migrator) {
        return { 
          success: false, 
          errors: [`No migration path from ${fromVersion} to ${toVersion}`] 
        };
      }

      const migratedData = migrator.migrate(data);
      
      // Validate migrated data
      const validation = this.validate(migratedData, toVersion);
      if (!validation.valid) {
        return {
          success: false,
          errors: [`Migration validation failed: ${JSON.stringify(validation.errors)}`]
        };
      }

      return { success: true, data: migratedData };
    } catch (error) {
      return {
        success: false,
        errors: [`Migration failed: ${error.message}`]
      };
    }
  }

  /**
   * Get latest version for a format
   */
  getLatestVersion(format: string): string | null {
    const formatInfo = this.registry.schemas[format];
    return formatInfo ? formatInfo.latest : null;
  }

  /**
   * Get available migration paths
   */
  getMigrationPaths(fromVersion: string): string[] {
    for (const formatName in this.registry.schemas) {
      const format = this.registry.schemas[formatName];
      if (format.migrationPaths[fromVersion]) {
        return format.migrationPaths[fromVersion];
      }
    }
    return [];
  }

  /**
   * Detect schema version from data
   */
  detectVersion(data: any): string | null {
    if (data.schemaVersion && data.schemaFormat) {
      return data.schemaVersion;
    }
    
    // Fallback to legacy format detection
    if (data.version && data.nodes && data.edges) {
      return '1.0.0'; // Legacy format
    }
    
    return null;
  }

  // Migration functions
  private migrateV1_0_0_to_V1_1_0 = (data: any): any => {
    return {
      ...data,
      schemaVersion: '1.1.0',
      schemaFormat: 'mindmap-v1',
      nodes: data.nodes.map((node: any) => ({
        ...node,
        nodeType: 'rect',
        textAlign: 'center',
        textVerticalAlign: 'middle',
        fontSize: 14,
        fontWeight: 'normal',
        fontColor: '#000000',
        borderWidth: 1
      })),
      edges: data.edges.map((edge: any) => ({
        ...edge,
        edgeType: 'straight',
        width: 2
      }))
    };
  };

  private migrateV1_1_0_to_V1_2_0 = (data: any): any => {
    return {
      ...data,
      schemaVersion: '1.2.0',
      schemaFormat: 'mindmap-v1',
      // Add new features for 1.2.0
      groups: []
    };
  };

  private migrateV1_2_0_to_V2_0_0 = (data: any): any => {
    return {
      ...data,
      schemaVersion: '2.0.0',
      schemaFormat: 'mindmap-v2',
      metadata: {
        ...data.metadata,
        visibility: 'private',
        collaborators: []
      },
      nodes: data.nodes.map((node: any) => ({
        id: node.id,
        label: node.label,
        position: {
          x: node.x,
          y: node.y,
          z: 0
        },
        dimensions: {
          w: node.w,
          h: node.h,
          d: 1
        },
        style: {
          nodeType: node.nodeType || 'rect',
          backgroundColor: node.backgroundColor,
          borderColor: node.borderColor,
          borderWidth: node.borderWidth || 1,
          borderRadius: 4
        },
        text: {
          align: node.textAlign || 'center',
          verticalAlign: node.textVerticalAlign || 'middle',
          fontSize: node.fontSize || 14,
          fontWeight: node.fontWeight || 'normal',
          fontColor: node.fontColor || '#000000',
          fontFamily: 'system-ui, sans-serif'
        },
        collapsed: node.collapsed || false,
        locked: false,
        embed: node.embedUrl ? {
          url: node.embedUrl,
          type: node.embedType || 'webpage'
        } : undefined,
        animation: {
          enabled: false
        }
      })),
      edges: data.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        style: {
          type: edge.edgeType || 'straight',
          color: edge.color,
          width: edge.width || 2,
          arrowhead: {
            enabled: true,
            size: 8,
            type: 'arrow'
          }
        },
        animation: {
          enabled: false
        }
      })),
      groups: [],
      viewState: {
        zoom: data.viewState?.zoom || 1.0,
        rotation: { x: 0, y: 0, z: 0 },
        viewBox: data.viewState?.viewBox || { x: 0, y: 0, width: 1200, height: 800 },
        perspective: 1000,
        camera: {
          position: { x: 0, y: 0, z: 1000 },
          target: { x: 0, y: 0, z: 0 }
        }
      },
      collaboration: {
        enabled: false,
        activeUsers: [],
        history: {
          enabled: true,
          retentionDays: 30
        }
      }
    };
  };

  // Schema definitions
  private getV1Schema(): any {
    // Return the current schema structure
    return {
      type: 'object',
      required: ['id', 'title', 'nodes', 'edges', 'updatedAt', 'version'],
      properties: {
        id: { type: 'string', pattern: '^map_[a-z0-9-]{6,}$' },
        title: { type: 'string', minLength: 1, maxLength: 120 },
        nodes: { type: 'array', maxItems: 5000 },
        edges: { type: 'array' },
        updatedAt: { type: 'string', format: 'date-time' },
        version: { type: 'integer', minimum: 1 }
      }
    };
  }

  private getV1EnhancedSchema(): any {
    // Enhanced version with styling
    return {
      ...this.getV1Schema(),
      properties: {
        ...this.getV1Schema().properties,
        // Add enhanced properties
      }
    };
  }

  private getV2Schema(): any {
    // Advanced version with 3D support
    return {
      type: 'object',
      required: ['schemaVersion', 'schemaFormat', 'id', 'title', 'nodes', 'edges', 'metadata'],
      properties: {
        schemaVersion: { type: 'string', const: '2.0.0' },
        schemaFormat: { type: 'string', const: 'mindmap-v2' },
        id: { type: 'string', pattern: '^map_[a-z0-9-]{6,}$' },
        title: { type: 'string', minLength: 1, maxLength: 120 },
        metadata: { type: 'object' },
        nodes: { type: 'array', maxItems: 10000 },
        edges: { type: 'array' },
        groups: { type: 'array' },
        viewState: { type: 'object' },
        collaboration: { type: 'object' }
      }
    };
  }
}

// Export singleton instance
export const schemaManager = new SchemaManager();
