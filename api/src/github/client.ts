/**
 * GitHub API client
 * Handles all GitHub operations using Octokit
 * 
 * Architecture:
 * - Each mindmap is stored in a separate branch
 * - Branch naming: maps/{mapId}
 * - main branch contains only documentation
 * - List of maps = List of branches (filtered by prefix)
 */

import { Octokit } from '@octokit/rest';
import { nanoid } from 'nanoid';
import type { User, Map, Index, PRTransaction, IndexItem } from '../types.js';
import { getGitHubRepoPath } from '../utils/github.js';

const BRANCH_PREFIX = 'maps/';
const MAP_FILE_PATH = 'map.json';

export class GitHubClient {
  private octokit: Octokit;
  private user: User;
  private owner: string;
  private repo: string;
  private ownerResolved: boolean = false;

  constructor(user: User) {
    // Get user-specific repository path
    const repoPath = getGitHubRepoPath(user);
    this.owner = repoPath.owner;
    this.repo = repoPath.repo;

    // In production, use installation token from GitHub App
    // For now, use environment token
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN || 'placeholder-token',
    });
    this.user = user;

    console.log(`📁 GitHubClient initialized for ${this.owner}/${this.repo}`);
  }

  /**
   * Resolve owner if not set in environment variables
   * Use authenticated user from GITHUB_TOKEN
   */
  private async resolveOwner(): Promise<void> {
    if (this.ownerResolved) return;
    
    if (!this.owner || this.owner === '') {
      try {
        const { data: authenticatedUser } = await this.octokit.users.getAuthenticated();
        this.owner = authenticatedUser.login;
        console.log(`🔍 Owner resolved to authenticated user: ${this.owner}`);
      } catch (error: any) {
        console.error('Failed to resolve owner from authenticated user:', error.message);
        throw new Error('GITHUB_OWNER or GITHUB_ORG environment variable must be set, or GITHUB_TOKEN must be valid');
      }
    }
    
    this.ownerResolved = true;
  }

  /**
   * Check if repository exists and is initialized
   */
  async checkRepository(): Promise<{ exists: boolean; initialized: boolean }> {
    await this.resolveOwner();
    
    try {
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      // Check if main branch exists and has index.json
      try {
        await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'maps/index.json',
          ref: 'main',
        });
        return { exists: true, initialized: true };
      } catch (error: any) {
        if (error.status === 404) {
          return { exists: true, initialized: false };
        }
        throw error;
      }
    } catch (error: any) {
      if (error.status === 404) {
        return { exists: false, initialized: false };
      }
      throw error;
    }
  }

  /**
   * Check if owner is an organization or user account
   */
  private async isOrganization(): Promise<boolean> {
    try {
      await this.octokit.orgs.get({ org: this.owner });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false; // Not an organization, likely a user account
      }
      throw error;
    }
  }

  /**
   * Setup repository: create if needed and initialize with README and index.json
   */
  async setupRepository(): Promise<void> {
    await this.resolveOwner();
    
    console.log(`📦 Setting up repository ${this.owner}/${this.repo}...`);

    // Step 1: Create repository if it doesn't exist
    let repoCreated = false;
    try {
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      console.log(`✅ Repository ${this.owner}/${this.repo} already exists`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`📦 Creating repository ${this.owner}/${this.repo}...`);
        
        // Check if owner is an organization or user
        const isOrg = await this.isOrganization();
        
        if (isOrg) {
          console.log(`📂 ${this.owner} is an Organization`);
          await this.octokit.repos.createInOrg({
            org: this.owner,
            name: this.repo,
            description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
            private: true,
            auto_init: true, // GitHub will automatically create README.md and main branch
          });
        } else {
          console.log(`👤 ${this.owner} is a User account`);
          await this.octokit.repos.createForAuthenticatedUser({
            name: this.repo,
            description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
            private: true,
            auto_init: true, // GitHub will automatically create README.md and main branch
          });
        }
        
        repoCreated = true;
        console.log(`✅ Repository created with auto_init=true`);
        
        // Wait briefly for GitHub to start initialization
        console.log(`⏳ Waiting for GitHub to start initialization...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }

    // Step 2: Verify main branch exists (should exist with auto_init=true)
    // Retry up to 5 times with 2 second intervals (GitHub may need time to initialize)
    let mainBranchExists = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!mainBranchExists && attempts < maxAttempts) {
      attempts++;
      try {
        const { data: ref } = await this.octokit.git.getRef({
          owner: this.owner,
          repo: this.repo,
          ref: 'heads/main',
        });
        console.log(`✅ Main branch exists (SHA: ${ref.object.sha.substring(0, 7)})`);
        mainBranchExists = true;
      } catch (error: any) {
        if (error.status === 404 && attempts < maxAttempts) {
          console.log(`⏳ Main branch not ready yet, waiting... (attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (error.status === 404) {
          console.error(`❌ Main branch not found after ${maxAttempts} attempts`);
          console.log(`⚠️ Repository was created but not fully initialized. This is OK - will initialize on first use.`);
          // Don't throw error - repository exists, we can initialize it later
          break;
        } else {
          throw error;
        }
      }
    }

    // Step 3: Create or verify index.json exists
    if (mainBranchExists) {
      try {
        const { data: existingFile } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'maps/index.json',
          ref: 'main',
        });
        console.log(`✅ maps/index.json already exists`);
      } catch (error: any) {
        if (error.status === 404) {
          // Create index.json
          console.log(`📝 Creating maps/index.json...`);
          
          const initialIndex = {
            generatedAt: new Date().toISOString(),
            items: [],
          };

          try {
            await this.octokit.repos.createOrUpdateFileContents({
              owner: this.owner,
              repo: this.repo,
              path: 'maps/index.json',
              message: 'Initialize maps/index.json',
              content: Buffer.from(JSON.stringify(initialIndex, null, 2)).toString('base64'),
              branch: 'main',
            });

            console.log(`✅ maps/index.json created`);
          } catch (createError: any) {
            console.warn(`⚠️ Failed to create index.json: ${createError.message}`);
            console.log(`⚠️ Will create on first map creation`);
            // Don't throw - can create index.json later
          }
        } else {
          console.warn(`⚠️ Unexpected error checking index.json: ${error.message}`);
          // Don't throw - can handle this later
        }
      }
    } else {
      console.log(`⚠️ Skipping index.json creation - main branch not ready yet`);
      console.log(`📝 index.json will be created automatically on first map creation`);
    }

    console.log(`🎉 Repository ${this.owner}/${this.repo} setup complete!`);
  }

  /**
   * Get all maps from index.json in main branch
   */
  async getIndex(): Promise<Index> {
    await this.resolveOwner();
    
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: 'maps/index.json',
        ref: 'main',
      });

      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const index = JSON.parse(content);
        console.log(`📋 Index loaded with ${index.items.length} maps`);
        return index;
      }

      throw new Error('Invalid index file');
    } catch (error: any) {
      if (error.status === 404) {
        console.log('📋 Index file not found, returning empty index');
        // Return empty index if file doesn't exist
        return {
          generatedAt: new Date().toISOString(),
          items: [],
        };
      }
      throw error;
    }
  }

  /**
   * Get a single map from its branch
   */
  async getMap(id: string): Promise<Map> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${id}`;
    
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: MAP_FILE_PATH,
        ref: branchName,
      });

      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      throw new Error('Map not found');
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Map ${id} not found in branch ${branchName}`);
      }
      throw error;
    }
  }

  /**
   * Create a new map in a new branch
   */
  async createMap(map: Map): Promise<PRTransaction> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${map.id}`;

    try {
      // Check if repository exists, create if not
      try {
        await this.octokit.repos.get({
          owner: this.owner,
          repo: this.repo,
        });
      } catch (error: any) {
        if (error.status === 404) {
          console.log(`📦 Repository ${this.owner}/${this.repo} not found. Creating...`);
          
          // Check if owner is an organization or user
          const isOrg = await this.isOrganization();
          
          if (isOrg) {
            console.log(`📂 ${this.owner} is an Organization`);
            await this.octokit.repos.createInOrg({
              org: this.owner,
              name: this.repo,
              description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
              private: true,
              auto_init: true, // GitHub will automatically create README.md and main branch
            });
          } else {
            console.log(`👤 ${this.owner} is a User account`);
            await this.octokit.repos.createForAuthenticatedUser({
              name: this.repo,
              description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
              private: true,
              auto_init: true, // GitHub will automatically create README.md and main branch
            });
          }
          
          console.log(`✅ Repository ${this.owner}/${this.repo} created with auto_init=true`);
          
          // Wait briefly for repository initialization
          console.log(`⏳ Waiting for GitHub to start initialization...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }

      // Get main branch HEAD with retry logic
      let mainSha: string | null = null;
      let branchAttempts = 0;
      const maxBranchAttempts = 5;
      
      while (!mainSha && branchAttempts < maxBranchAttempts) {
        branchAttempts++;
        try {
          const { data: ref } = await this.octokit.git.getRef({
            owner: this.owner,
            repo: this.repo,
            ref: 'heads/main',
          });
          mainSha = ref.object.sha;
          console.log(`✅ Main branch found (SHA: ${mainSha.substring(0, 7)})`);
        } catch (error: any) {
          if (error.status === 404 && branchAttempts < maxBranchAttempts) {
            console.log(`⏳ Main branch not ready yet, waiting... (attempt ${branchAttempts}/${maxBranchAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (error.status === 404) {
            console.log(`⚠️ Main branch not found after ${maxBranchAttempts} attempts, creating manually...`);
            // Create main branch with initial commit
            const { data: blob } = await this.octokit.git.createBlob({
              owner: this.owner,
              repo: this.repo,
              content: '# Mindmap Data Repository\n\nThis repository stores mindmap data for Open Mindmap.\nEach branch represents a separate mindmap.',
              encoding: 'utf-8',
            });

            const { data: tree } = await this.octokit.git.createTree({
              owner: this.owner,
              repo: this.repo,
              tree: [
                {
                  path: 'README.md',
                  mode: '100644',
                  type: 'blob',
                  sha: blob.sha,
                },
              ],
            });

            const { data: commit } = await this.octokit.git.createCommit({
              owner: this.owner,
              repo: this.repo,
              message: 'Initial commit',
              tree: tree.sha,
            });

            await this.octokit.git.createRef({
              owner: this.owner,
              repo: this.repo,
              ref: 'refs/heads/main',
              sha: commit.sha,
            });

            mainSha = commit.sha;
            console.log(`✅ Main branch created manually`);
            break;
          } else {
            throw error;
          }
        }
      }
      
      if (!mainSha) {
        throw new Error('Failed to get or create main branch');
      }

      // ==========================================
      // STEP 1: Update index.json in main branch
      // ==========================================
      console.log(`📋 Updating index.json in main branch`);
      
      let indexSha: string | undefined;
      let currentIndex: Index;
      
      try {
        // Get current index.json
        const { data: indexFile } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'maps/index.json',
          ref: 'main',
        });
        
        if ('content' in indexFile) {
          indexSha = indexFile.sha;
          const content = Buffer.from(indexFile.content, 'base64').toString('utf-8');
          currentIndex = JSON.parse(content);
          console.log(`✅ Current index has ${currentIndex.items.length} items`);
        } else {
          throw new Error('Invalid index file');
        }
      } catch (error: any) {
        if (error.status === 404) {
          // Create initial index
          console.log(`📋 Creating initial index.json`);
          currentIndex = {
            generatedAt: new Date().toISOString(),
            items: [],
          };
        } else {
          throw error;
        }
      }
      
      // Add new map to index
      const newIndexItem: IndexItem = {
        id: map.id,
        title: map.title,
        tags: map.tags || [],
        nodeCount: map.nodes.length,
        edgeCount: map.edges.length,
        updatedAt: map.updatedAt,
        version: map.version,
      };
      
      currentIndex.items.push(newIndexItem);
      currentIndex.generatedAt = new Date().toISOString();
      
      // Update index.json in main branch
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: 'maps/index.json',
        message: `Add map to index: ${map.title}`,
        content: Buffer.from(JSON.stringify(currentIndex, null, 2)).toString('base64'),
        branch: 'main',
        sha: indexSha,
      });
      
      console.log(`✅ Index updated with new map: ${map.id}`);
      
      // ==========================================
      // STEP 2: Create new branch for the map
      // ==========================================
      console.log(`🌿 Creating new branch: ${branchName} from main (${mainSha})`);
      
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainSha,
      });

      console.log(`✅ Branch ${branchName} created successfully`);

      // ==========================================
      // STEP 3: Create map.json in the new branch
      // ==========================================
      console.log(`📝 Creating map.json in branch ${branchName}`);
      
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: MAP_FILE_PATH,
        message: `Create map: ${map.title}`,
        content: Buffer.from(JSON.stringify(map, null, 2)).toString('base64'),
        branch: branchName,
      });

      console.log(`✅ Map ${map.id} created successfully`);
      console.log(`🔗 View at: https://github.com/${this.owner}/${this.repo}/tree/${branchName}`);

      return {
        branch: branchName,
        mapId: map.id,
      };
    } catch (error: any) {
      console.error(`❌ Error creating map ${map.id}:`, error.message);
      if (error.status === 422) {
        throw new Error(`Branch ${branchName} already exists`);
      }
      throw error;
    }
  }

  /**
   * Update an existing map in its branch and index
   */
  async updateMap(map: Map): Promise<PRTransaction> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${map.id}`;

    try {
      // ==========================================
      // STEP 0: Ensure repository and main branch exist
      // ==========================================
      try {
        await this.octokit.repos.get({
          owner: this.owner,
          repo: this.repo,
        });
      } catch (error: any) {
        if (error.status === 404) {
          console.log(`📦 Repository ${this.owner}/${this.repo} not found. Creating...`);
          
          // Check if owner is an organization or user
          const isOrg = await this.isOrganization();
          
          if (isOrg) {
            await this.octokit.repos.createInOrg({
              org: this.owner,
              name: this.repo,
              description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
              private: true,
              auto_init: true,
            });
          } else {
            await this.octokit.repos.createForAuthenticatedUser({
              name: this.repo,
              description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
              private: true,
              auto_init: true,
            });
          }
          
          console.log(`✅ Repository ${this.owner}/${this.repo} created`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }

      // Get main branch SHA with retry logic (same as createMap)
      let mainSha: string | null = null;
      let branchAttempts = 0;
      const maxBranchAttempts = 5;
      
      while (!mainSha && branchAttempts < maxBranchAttempts) {
        branchAttempts++;
        try {
          const { data: ref } = await this.octokit.git.getRef({
            owner: this.owner,
            repo: this.repo,
            ref: 'heads/main',
          });
          mainSha = ref.object.sha;
          console.log(`✅ Main branch found (SHA: ${mainSha.substring(0, 7)})`);
        } catch (error: any) {
          if (error.status === 404 && branchAttempts < maxBranchAttempts) {
            console.log(`⏳ Main branch not ready yet, waiting... (attempt ${branchAttempts}/${maxBranchAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else if (error.status === 404) {
            console.log(`⚠️ Main branch not found, creating manually...`);
            // Create main branch with initial commit
            const { data: blob } = await this.octokit.git.createBlob({
              owner: this.owner,
              repo: this.repo,
              content: '# Mindmap Data Repository\n\nThis repository stores mindmap data for Open Mindmap.\nEach branch represents a separate mindmap.',
              encoding: 'utf-8',
            });

            const { data: tree } = await this.octokit.git.createTree({
              owner: this.owner,
              repo: this.repo,
              tree: [
                {
                  path: 'README.md',
                  mode: '100644',
                  type: 'blob',
                  sha: blob.sha,
                },
              ],
            });

            const { data: commit } = await this.octokit.git.createCommit({
              owner: this.owner,
              repo: this.repo,
              message: 'Initial commit',
              tree: tree.sha,
            });

            await this.octokit.git.createRef({
              owner: this.owner,
              repo: this.repo,
              ref: 'refs/heads/main',
              sha: commit.sha,
            });

            mainSha = commit.sha;
            console.log(`✅ Main branch created manually`);
            break;
          } else {
            throw error;
          }
        }
      }
      
      if (!mainSha) {
        throw new Error('Failed to get or create main branch');
      }

      // ==========================================
      // STEP 1: Check if branch exists, create if not
      // ==========================================
      let branchExists = false;
      try {
        await this.octokit.repos.getBranch({
          owner: this.owner,
          repo: this.repo,
          branch: branchName,
        });
        branchExists = true;
        console.log(`✅ Branch ${branchName} exists`);
      } catch (branchError: any) {
        if (branchError.status === 404) {
          console.log(`📝 Branch ${branchName} not found, creating new branch for map ${map.id}`);
          branchExists = false;
          
          // Create new branch from main
          await this.octokit.git.createRef({
            owner: this.owner,
            repo: this.repo,
            ref: `refs/heads/${branchName}`,
            sha: mainSha,
          });
          
          console.log(`✅ Branch ${branchName} created from main`);
        } else {
          throw branchError;
        }
      }

      // ==========================================
      // STEP 2: Update or create map.json in branch
      // ==========================================
      let fileSha: string | undefined;
      
      if (branchExists) {
        try {
          const { data: currentFile } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: MAP_FILE_PATH,
            ref: branchName,
          });

          if ('sha' in currentFile) {
            fileSha = currentFile.sha;
          }
        } catch (fileError: any) {
          if (fileError.status !== 404) {
            throw fileError;
          }
          // File doesn't exist, will create new one
          console.log(`📝 map.json not found in branch, will create new file`);
        }
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: MAP_FILE_PATH,
        message: branchExists 
          ? `Update map: ${map.title} (v${map.version})`
          : `Create map: ${map.title}`,
        content: Buffer.from(JSON.stringify(map, null, 2)).toString('base64'),
        branch: branchName,
        sha: fileSha, // undefined for new files
      });

      console.log(`✅ ${branchExists ? 'Updated' : 'Created'} map ${map.id} in branch ${branchName}`);

      // ==========================================
      // STEP 3: Update index.json in main branch
      // ==========================================
      console.log(`📋 Updating index metadata in main branch`);
      
      try {
        let indexSha: string | undefined;
        let currentIndex: Index;
        
        try {
          const { data: indexFile } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: 'maps/index.json',
            ref: 'main',
          });
          
          if ('content' in indexFile) {
            indexSha = indexFile.sha;
            const content = Buffer.from(indexFile.content, 'base64').toString('utf-8');
            currentIndex = JSON.parse(content);
          } else {
            throw new Error('Invalid index file');
          }
        } catch (error: any) {
          if (error.status === 404) {
            // Create initial index if it doesn't exist
            console.log(`📋 Creating initial index.json`);
            currentIndex = {
              generatedAt: new Date().toISOString(),
              items: [],
            };
          } else {
            throw error;
          }
        }
        
        // Find and update or add the map metadata in index
        const itemIndex = currentIndex.items.findIndex(item => item.id === map.id);
        
        if (itemIndex >= 0) {
          // Update existing map metadata (keep original title)
          currentIndex.items[itemIndex] = {
            ...currentIndex.items[itemIndex],  // Keep existing data (including original title)
            nodeCount: map.nodes.length,       // Update metadata only
            edgeCount: map.edges.length,
            updatedAt: map.updatedAt,
            version: map.version,
          };
          console.log(`✅ Updating existing map in index: ${map.id}`);
        } else {
          // Add new map to index (branch was just created)
          const newIndexItem: IndexItem = {
            id: map.id,
            title: map.title,
            tags: map.tags || [],
            nodeCount: map.nodes.length,
            edgeCount: map.edges.length,
            updatedAt: map.updatedAt,
            version: map.version,
          };
          currentIndex.items.push(newIndexItem);
          console.log(`✅ Adding new map to index: ${map.id}`);
        }
        
        currentIndex.generatedAt = new Date().toISOString();
        
        // Update index.json
        await this.octokit.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: 'maps/index.json',
          message: branchExists
            ? `Update map metadata: ${map.title} (v${map.version})`
            : `Add map to index: ${map.title}`,
          content: Buffer.from(JSON.stringify(currentIndex, null, 2)).toString('base64'),
          branch: 'main',
          sha: indexSha,
        });
        
        console.log(`✅ Index ${branchExists ? 'updated' : 'created'} for map: ${map.id}`);
      } catch (error: any) {
        console.warn(`⚠️ Failed to update index: ${error.message}`);
        // Continue even if index update fails
      }

      return {
        branch: branchName,
        mapId: map.id,
      };
    } catch (error: any) {
      console.error(`❌ Error updating/creating map ${map.id}:`, error);
      // Re-throw with more context if needed
      if (error.status === 422) {
        throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a map by deleting its branch and removing from index
   */
  async deleteMap(id: string): Promise<PRTransaction> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${id}`;

    try {
      // ==========================================
      // STEP 1: Delete the branch
      // ==========================================
      await this.octokit.git.deleteRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`,
      });

      console.log(`✅ Deleted branch ${branchName}`);

      // ==========================================
      // STEP 2: Remove from index.json in main branch
      // ==========================================
      console.log(`📋 Removing map from index.json`);
      
      try {
        const { data: indexFile } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: 'maps/index.json',
          ref: 'main',
        });
        
        if ('content' in indexFile) {
          const content = Buffer.from(indexFile.content, 'base64').toString('utf-8');
          const currentIndex: Index = JSON.parse(content);
          
          // Remove the map from index
          currentIndex.items = currentIndex.items.filter(item => item.id !== id);
          currentIndex.generatedAt = new Date().toISOString();
          
          // Update index.json
          await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path: 'maps/index.json',
            message: `Remove map from index: ${id}`,
            content: Buffer.from(JSON.stringify(currentIndex, null, 2)).toString('base64'),
            branch: 'main',
            sha: indexFile.sha,
          });
          
          console.log(`✅ Map removed from index: ${id}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Failed to update index: ${error.message}`);
        // Continue even if index update fails
      }

      return {
        branch: branchName,
        mapId: id,
      };
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error(`Cannot delete branch ${branchName}: it may be the default branch`);
      }
      if (error.status === 404) {
        throw new Error(`Map ${id} not found in branch ${branchName}`);
      }
      throw error;
    }
  }

  /**
   * Create a snapshot (Git tag) for a specific map branch
   */
  async createSnapshot(
    mapId: string,
    tagName: string,
    message?: string
  ): Promise<{ name: string; sha: string }> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${mapId}`;

    try {
      // Get current branch HEAD
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${branchName}`,
      });

      // Create tag
      const fullTagName = `${mapId}-${tagName}`;
      const { data: tag } = await this.octokit.git.createTag({
        owner: this.owner,
        repo: this.repo,
        tag: fullTagName,
        message: message || `Snapshot: ${tagName}`,
        object: ref.object.sha,
        type: 'commit',
      });

      // Create ref for tag
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/tags/${fullTagName}`,
        sha: tag.sha,
      });

      console.log(`✅ Created snapshot ${fullTagName} for map ${mapId}`);

      return {
        name: fullTagName,
        sha: tag.sha,
      };
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Update map metadata (title, tags) in index.json only
   */
  async updateMapMetadata(
    id: string, 
    metadata: { title: string; tags: string[] }
  ): Promise<void> {
    await this.resolveOwner();
    
    console.log(`📝 Updating map metadata in index.json: ${id}`, metadata);

    try {
      const { data: indexFile } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: 'maps/index.json',
        ref: 'main',
      });
      
      if ('content' in indexFile) {
        const content = Buffer.from(indexFile.content, 'base64').toString('utf-8');
        const currentIndex: Index = JSON.parse(content);
        
        // Find and update the map metadata
        const itemIndex = currentIndex.items.findIndex(item => item.id === id);
        if (itemIndex >= 0) {
          currentIndex.items[itemIndex] = {
            ...currentIndex.items[itemIndex],
            title: metadata.title,
            tags: metadata.tags,
          };
          currentIndex.generatedAt = new Date().toISOString();
          
          // Update index.json
          await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path: 'maps/index.json',
            message: `Update map info: ${metadata.title}`,
            content: Buffer.from(JSON.stringify(currentIndex, null, 2)).toString('base64'),
            branch: 'main',
            sha: indexFile.sha,
          });
          
          console.log(`✅ Map metadata updated in index: ${id}`);
        } else {
          throw new Error(`Map ${id} not found in index`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Failed to update map metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search maps by title or tags
   */
  async searchMaps(query: string): Promise<Index> {
    await this.resolveOwner();
    
    const index = await this.getIndex();
    
    const lowerQuery = query.toLowerCase();
    const filtered = index.items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );

    return {
      generatedAt: index.generatedAt,
      items: filtered,
    };
  }

  /**
   * Get version history of a map from git commits
   */
  async getMapHistory(mapId: string): Promise<Array<{
    version: number;
    commitSha: string;
    message: string;
    author: string;
    date: string;
    nodeCount: number;
    edgeCount: number;
  }>> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${mapId}`;
    
    try {
      // Get commits from the map branch
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha: branchName,
        per_page: 100, // Get last 100 commits
      });

      const history = [];
      
      for (const commit of commits) {
        try {
          // Get the map.json file content for this commit
          const { data: fileData } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: MAP_FILE_PATH,
            ref: commit.sha,
          });

          if ('content' in fileData) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            const mapData = JSON.parse(content);
            
            history.push({
              version: mapData.version,
              commitSha: commit.sha,
              message: commit.commit.message.split('\n')[0], // First line of commit message
              author: commit.commit.author?.name || 'Unknown',
              date: commit.commit.author?.date || commit.commit.committer?.date || new Date().toISOString(),
              nodeCount: mapData.nodes?.length || 0,
              edgeCount: mapData.edges?.length || 0,
            });
          }
        } catch (error) {
          // Skip commits that don't have map.json
          console.log(`Skipping commit ${commit.sha}: no map.json found`);
        }
      }

      // Sort by version number (descending)
      history.sort((a, b) => b.version - a.version);
      
      console.log(`📚 Found ${history.length} versions for map ${mapId}`);
      return history;
      
    } catch (error: any) {
      console.error(`❌ Failed to get map history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get specific version of a map
   */
  async getMapVersion(mapId: string, version: number): Promise<Map> {
    await this.resolveOwner();
    
    const branchName = `${BRANCH_PREFIX}${mapId}`;
    
    try {
      // Get commits to find the one with the specific version
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        sha: branchName,
        per_page: 100,
      });

      for (const commit of commits) {
        try {
          const { data: fileData } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path: MAP_FILE_PATH,
            ref: commit.sha,
          });

          if ('content' in fileData) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            const mapData = JSON.parse(content);
            
            if (mapData.version === version) {
              console.log(`✅ Found map version ${version} for ${mapId}`);
              return mapData;
            }
          }
        } catch (error) {
          // Skip commits that don't have map.json
          continue;
        }
      }

      throw new Error(`Version ${version} not found for map ${mapId}`);
      
    } catch (error: any) {
      console.error(`❌ Failed to get map version: ${error.message}`);
      throw error;
    }
  }
}
