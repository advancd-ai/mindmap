/**
 * GitHub utility functions
 * Helper functions for GitHub repository path generation
 */

import { Octokit } from '@octokit/rest';
import type { User } from '../types.js';

export async function uploadFileToGitHub(
  user: User,
  mapId: string,
  filename: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  // Use the same repository path logic as mindmaps
  const repoPath = getGitHubRepoPath(user);
  const owner = repoPath.owner;
  const repo = repoPath.repo;
  const branchName = `maps/${mapId}`;
  const path = `files/${filename}`;

  console.log(`🔍 Upload debug info:`, {
    owner,
    repo,
    branchName,
    path,
    userId: user.userId,
    userEmail: user.email,
    userName: user.name,
    mapId,
    filename,
    repoPath
  });

  try {
    // Check if repository exists first
    try {
      await octokit.repos.get({ owner, repo });
      console.log(`✅ Repository ${owner}/${repo} exists`);
    } catch (repoError: any) {
      if (repoError.status === 404) {
        throw new Error(`Repository ${owner}/${repo} does not exist. Please create a map first.`);
      }
      throw repoError;
    }

    // List branches to see what's available
    try {
      const { data: branches } = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });
      
      const branchNames = branches.map(b => b.name);
      console.log(`📋 Available branches:`, branchNames);
      
      if (!branchNames.includes(branchName)) {
        console.log(`❌ Branch ${branchName} not found in available branches`);
        throw new Error(`Map branch ${branchName} does not exist. Available branches: ${branchNames.slice(0, 5).join(', ')}${branchNames.length > 5 ? '...' : ''}`);
      }
      
      console.log(`✅ Branch ${branchName} exists`);
    } catch (branchError: any) {
      console.error('❌ Branch check error:', branchError);
      throw new Error(`Failed to verify map branch: ${branchError.message}`);
    }

    // Upload file to the map's branch
    console.log(`📤 Uploading file to ${owner}/${repo}/${branchName}/${path}`);
    
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Upload file: ${filename}`,
      content: fileBuffer.toString('base64'),
      branch: branchName,
      committer: {
        name: 'Open Mindmap',
        email: 'noreply@openmindmap.com',
      },
    });

    // Return download API URL instead of direct GitHub URL
    const apiUrl = process.env.API_URL || 'http://localhost:8787';
    const fileUrl = `${apiUrl}/upload/download/${mapId}/${filename}`;
    console.log(`✅ File uploaded to map branch: ${fileUrl}`);
    
    return fileUrl;

  } catch (error: any) {
    console.error('❌ GitHub upload error:', {
      status: error.status,
      message: error.message,
      response: error.response?.data
    });
    
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Extract repository name from user information
 * This will be used as the repository name under the organization
 * 
 * Priority:
 * 1. Email prefix (before @)
 * 2. Sanitized name
 * 3. Fallback to userId
 */
export function getGitHubRepoName(user: User): string {
  // Extract from email (most common case)
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    // Sanitize: GitHub repository names can contain alphanumeric characters, hyphens, underscores, and periods
    // Cannot start with a period
    const sanitized = emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9-_.]/g, '-')  // Allow period (.)
      .replace(/^[-.]+|[-_]+$/g, '');  // Remove leading periods/hyphens and trailing hyphens/underscores
    
    if (sanitized) {
      return sanitized;
    }
  }

  // Try name
  if (user.name) {
    const sanitized = user.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_.]/g, '')  // Allow period (.)
      .replace(/^[-.]+|[-_]+$/g, '');
    
    if (sanitized) {
      return sanitized;
    }
  }

  // Fallback to userId
  return user.userId.toLowerCase().replace(/[^a-z0-9-_.]/g, '-');
}

/**
 * Get GitHub owner (organization or user) from environment
 * If GITHUB_ORG is set, use it (for organization setup)
 * Otherwise, use GITHUB_OWNER (can be a user or org)
 * Defaults to the authenticated user from GITHUB_TOKEN if not set
 */
export function getGitHubOrg(): string {
  // Priority: GITHUB_ORG > GITHUB_OWNER > no default (will use authenticated user)
  return process.env.GITHUB_ORG || process.env.GITHUB_OWNER || '';
}

/**
 * Get full GitHub repository path (owner/repo)
 * Owner = Organization from environment (GITHUB_ORG)
 * Repo = User's email prefix
 */
export function getGitHubRepoPath(user: User): { owner: string; repo: string } {
  const owner = getGitHubOrg();
  const repo = getGitHubRepoName(user);
  
  return { owner, repo };
}
