/**
 * File Upload Routes
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { requestId } from '../middleware/request-id.js';
import { uploadFileToGitHub, getGitHubRepoPath } from '../utils/github.js';
import { Octokit } from '@octokit/rest';
import type { User } from '../types.js';

const upload = new Hono<{ Variables: { user: User } }>();

// Apply middleware
upload.use('*', requestId());

// File upload endpoint
upload.post('/', requireAuth(), async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const mapId = formData.get('mapId') as string;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!mapId) {
      return c.json({ error: 'Map ID is required' }, 400);
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: 'Invalid file type. Only images and PDF files are allowed.' 
      }, 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, 400);
    }

    // Get user info from auth middleware
    const user = c.get('user') as User;
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || '';
    const filename = `upload_${timestamp}_${randomId}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get request URL for dynamic protocol detection (HTTPS in production)
    // Construct full URL from headers to support reverse proxy scenarios
    let requestUrl: string | undefined;
    try {
      const host = c.req.header('Host') || c.req.header('X-Forwarded-Host');
      const protocol = c.req.header('X-Forwarded-Proto') || 
                      (c.req.url && new URL(c.req.url).protocol) || 
                      'https';
      
      if (host) {
        requestUrl = `${protocol}://${host}`;
      } else if (c.req.url) {
        // Fallback: try to parse from full URL
        const url = new URL(c.req.url);
        requestUrl = url.origin;
      }
    } catch (e) {
      console.warn('⚠️ Could not construct request URL from headers:', e);
    }
    
    // Upload to GitHub (to the specific map's branch)
    const fileUrl = await uploadFileToGitHub(
      user,
      mapId,
      filename,
      buffer,
      file.type,
      requestUrl
    );

    console.log(`✅ File uploaded: ${filename} to map ${mapId} by user ${user.userId}`);

    return c.json({
      success: true,
      url: fileUrl,
      filename: filename,
      size: file.size,
      type: file.type,
      mapId: mapId
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return c.json({ 
      error: 'Upload failed. Please try again.' 
    }, 500);
  }
});

// Get upload info (optional - for debugging)
upload.get('/info', requireAuth(), async (c) => {
  const user = c.get('user') as User;
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    maxFileSize: '10MB',
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'application/pdf'
    ],
    userId: user.userId
  });
});

// Download file endpoint
// Note: This endpoint is public because images need to be accessible via <img> tags
// Files are identified by mapId and random filename, providing basic security through obscurity
upload.get('/download/:mapId/:filename', async (c) => {
  const mapId = c.req.param('mapId');
  const filename = c.req.param('filename');

  if (!mapId || !filename) {
    return c.json({ error: 'Map ID and filename are required' }, 400);
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Try to get repository info from authenticated user if available
    let owner: string | undefined;
    let repo: string | undefined;
    
    // Check if user is authenticated (optional auth for download)
    try {
      const authHeader = c.req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        // Try to get user from session cache
        const { cache } = await import('../lib/redis.js');
        const cacheKey = `session:${token}`;
        const userJson = await cache.get(cacheKey);
        
        if (userJson) {
          try {
            const user = JSON.parse(userJson);
            const { getGitHubRepoPath } = await import('../utils/github.js');
            const repoPath = getGitHubRepoPath(user);
            owner = repoPath.owner;
            repo = repoPath.repo;
            console.log(`🔍 Using authenticated user's repository: ${owner}/${repo}`);
          } catch (e) {
            console.warn('⚠️ Failed to parse user from session, using default');
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Auth check failed, using default repository');
    }

    // Fallback to default repository from environment variables
    if (!owner || !repo) {
      owner = process.env.GITHUB_OWNER || 'choonho';
      repo = process.env.GITHUB_REPO || 'guest';
      console.log(`📥 Using default repository: ${owner}/${repo}`);
    }

    const branchName = `maps/${mapId}`;
    const path = `files/${filename}`;

    console.log(`📥 Download request: ${owner}/${repo}/${branchName}/${path}`);

    // Get file content from GitHub
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branchName,
    });

    if (!data || Array.isArray(data) || !('content' in data)) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Decode base64 content
    const fileBuffer = Buffer.from(data.content, 'base64');
    
    // Determine content type from filename
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
      case 'bmp':
        contentType = 'image/bmp';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
    }

    // Set headers for file download
    c.header('Content-Type', contentType);
    c.header('Content-Length', fileBuffer.length.toString());
    c.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    c.header('Content-Disposition', `inline; filename="${filename}"`);

    console.log(`✅ File downloaded: ${filename} (${fileBuffer.length} bytes, ${contentType})`);

    return c.body(fileBuffer);

  } catch (error: any) {
    console.error('❌ Download error:', {
      status: error.status,
      message: error.message,
      mapId,
      filename
    });

    if (error.status === 404) {
      return c.json({ error: 'File not found' }, 404);
    }

    return c.json({ error: 'Failed to download file' }, 500);
  }
});

export default upload;
