#!/usr/bin/env node

/**
 * build-index.mjs - Build index file from all map files
 * 
 * Scans maps/ directory and generates index.json with metadata
 * for all maps (id, title, tags, updatedAt, commitSha)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Get the current commit SHA from git
 */
function getCurrentCommitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.warn('⚠️  Unable to get commit SHA, using placeholder');
    return '0000000000000000000000000000000000000000';
  }
}

/**
 * Get the commit SHA for a specific file
 */
function getFileCommitSha(filepath) {
  try {
    return execSync(`git log -1 --format=%H -- "${filepath}"`, {
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    return getCurrentCommitSha();
  }
}

/**
 * Build index from all map files
 */
function buildIndex() {
  const mapsDir = join(rootDir, 'maps');

  if (!existsSync(mapsDir)) {
    console.log('⚠️  maps/ directory not found, creating...');
    try {
      const { mkdirSync } = await import('fs');
      mkdirSync(mapsDir, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create maps/ directory:', error);
      process.exit(1);
    }
  }

  const files = readdirSync(mapsDir).filter(
    (f) => f.startsWith('map_') && f.endsWith('.json')
  );

  console.log(`\n🔨 Building index from ${files.length} map file(s)...\n`);

  const items = [];

  for (const file of files) {
    const filepath = join(mapsDir, file);
    try {
      const mapData = JSON.parse(readFileSync(filepath, 'utf-8'));
      const commitSha = getFileCommitSha(filepath);

      items.push({
        id: mapData.id,
        title: mapData.title,
        tags: mapData.tags || [],
        updatedAt: mapData.updatedAt,
        commitSha: commitSha || getCurrentCommitSha(),
      });

      console.log(`  ✓ ${file} → ${mapData.title}`);
    } catch (error) {
      console.error(`  ✗ ${file}: ${error.message}`);
    }
  }

  // Sort by updatedAt (newest first)
  items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const index = {
    generatedAt: new Date().toISOString(),
    items,
  };

  const indexPath = join(mapsDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');

  console.log(`\n✅ Index built: ${items.length} items → maps/index.json\n`);
}

// Run build
buildIndex();

