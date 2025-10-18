#!/usr/bin/env node

/**
 * validate.mjs - Schema validation script for mindmap files
 * 
 * Validates all map JSON files against the schema and performs
 * cross-validation checks (e.g., edge source/target must reference existing nodes)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Initialize AJV with formats support
const ajv = new Ajv({ 
  allErrors: true, 
  strict: false,
  validateFormats: true,
  allowUnionTypes: true
});
addFormats(ajv);

// Load schemas
const mapSchema = JSON.parse(
  readFileSync(join(rootDir, 'schemas/map.schema.json'), 'utf-8')
);
const indexSchema = JSON.parse(
  readFileSync(join(rootDir, 'schemas/index.schema.json'), 'utf-8')
);

const validateMap = ajv.compile(mapSchema);
const validateIndex = ajv.compile(indexSchema);

/**
 * Cross-validate map data
 * - Check that edge source/target reference existing nodes
 * - Check for cycles (optional)
 */
function crossValidateMap(map, filename) {
  const errors = [];
  const nodeIds = new Set(map.nodes.map((n) => n.id));

  // Check edge references
  for (const edge of map.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(
        `Edge ${edge.id} references non-existent source node: ${edge.source}`
      );
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(
        `Edge ${edge.id} references non-existent target node: ${edge.target}`
      );
    }
  }

  // Check file size limit (2MB)
  const fileContent = JSON.stringify(map);
  const sizeInBytes = Buffer.byteLength(fileContent, 'utf-8');
  const sizeInMB = sizeInBytes / (1024 * 1024);
  if (sizeInMB > 2) {
    errors.push(`File size ${sizeInMB.toFixed(2)}MB exceeds 2MB limit`);
  }

  // Check node count
  if (map.nodes.length > 5000) {
    errors.push(`Node count ${map.nodes.length} exceeds limit of 5000`);
  }

  return errors;
}

/**
 * Validate all map files in the maps directory
 */
function validateMaps() {
  const mapsDir = join(rootDir, 'maps');
  let errors = 0;
  let warnings = 0;

  try {
    const files = readdirSync(mapsDir).filter((f) => f.endsWith('.json'));

    console.log(`\n🔍 Validating ${files.length} file(s) in maps/\n`);

    for (const file of files) {
      const filepath = join(mapsDir, file);

      // Skip index.json
      if (file === 'index.json') {
        const indexData = JSON.parse(readFileSync(filepath, 'utf-8'));
        const valid = validateIndex(indexData);

        if (!valid) {
          console.error(`❌ ${file}: Schema validation failed`);
          console.error(JSON.stringify(validateIndex.errors, null, 2));
          errors++;
        } else {
          console.log(`✅ ${file}: Valid index file`);
        }
        continue;
      }

      // Validate map files
      const mapData = JSON.parse(readFileSync(filepath, 'utf-8'));
      const valid = validateMap(mapData);

      if (!valid) {
        console.error(`❌ ${file}: Schema validation failed`);
        console.error(JSON.stringify(validateMap.errors, null, 2));
        errors++;
        continue;
      }

      // Cross-validation
      const crossErrors = crossValidateMap(mapData, file);
      if (crossErrors.length > 0) {
        console.error(`❌ ${file}: Cross-validation failed`);
        crossErrors.forEach((err) => console.error(`   - ${err}`));
        errors++;
      } else {
        console.log(`✅ ${file}: Valid (${mapData.nodes.length} nodes, ${mapData.edges.length} edges)`);
      }
    }

    console.log(`\n${errors === 0 ? '✅' : '❌'} Validation complete: ${files.length} files, ${errors} errors, ${warnings} warnings\n`);

    if (errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️  maps/ directory not found, skipping validation');
      process.exit(0);
    }
    throw error;
  }
}

// Run validation
validateMaps();

