# Open Mindmap API

Backend API for Open Mindmap - A Node.js server with Hono framework, Redis caching, and GitHub integration.

## 🏗️ Architecture

- **Framework**: Hono (lightweight web framework)
- **Runtime**: Node.js 18+
- **Database**: GitHub Organization repositories (branch-based storage)
- **Storage Structure**: `{org}/{email-id}` repositories with `maps/{mapId}` branches
- **Cache & Sessions**: Redis
- **Authentication**: Google OAuth 2.0
- **GitHub Integration**: Octokit REST API

## 📋 Features

- ✅ Google OAuth 2.0 authentication
- ✅ Organization-based GitHub storage (`{org}/{email-id}`)
- ✅ Branch-based map storage (1 map = 1 branch)
- ✅ Auto repository creation for new users
- ✅ Redis session & cache management
- ✅ JSON Schema validation (AJV)
- ✅ Request ID tracking
- ✅ Error handling middleware
- ✅ CORS configuration
- ✅ Development mode (bypass auth)
- ✅ Health check endpoint

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Redis server
- Google OAuth credentials
- GitHub Organization (e.g., `open-mindmap`)
- GitHub Personal Access Token (with org access)

### Installation

```bash
cd api
npm install
```

### Configuration

Create `.env` file:

```bash
# Server
PORT=8787
NODE_ENV=development

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback
FRONTEND_URL=http://localhost:5173

# GitHub Storage
# Personal Access Token with repo and org permissions
GITHUB_TOKEN=ghp_your_personal_access_token

# Organization name (all user repositories will be under this org)
# Each user will have their own repository: {GITHUB_ORG}/{email-id}
# Example: GITHUB_ORG=open-mindmap, user=john@example.com → open-mindmap/john
GITHUB_ORG=open-mindmap

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Development Mode (optional - bypasses authentication)
DEV_MODE=true
```

**Setup Guides:**
- Google OAuth 설정: [GOOGLE_OAUTH_SETUP.md](../docs/GOOGLE_OAUTH_SETUP.md)
- GitHub Organization 설정: [GITHUB_ORG_ARCHITECTURE.md](../docs/GITHUB_ORG_ARCHITECTURE.md)

### Development

Start Redis:

```bash
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis
```

Start API server:

```bash
npm run dev
```

Server will run on `http://localhost:8787`

### Production Build

```bash
npm run build
node dist/index.js
```

## 📁 Project Structure

```
api/
├── src/
│   ├── index.ts              # Entry point (Node.js server)
│   ├── types.ts              # TypeScript type definitions
│   ├── routes/
│   │   ├── auth.ts           # Google OAuth routes
│   │   ├── maps.ts           # CRUD operations for maps
│   │   ├── search.ts         # Search functionality
│   │   └── webhooks.ts       # GitHub webhook handler
│   ├── github/
│   │   └── client.ts         # GitHub API client (branch-based)
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── error-handler.ts # Global error handler
│   │   └── request-id.ts    # Request ID generator
│   ├── validators/
│   │   └── map.ts            # JSON Schema validator (AJV)
│   ├── lib/
│   │   └── redis.ts          # Redis client wrapper
│   └── utils/
│       └── github.ts         # GitHub username helpers
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔌 API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and uptime.

### Authentication

```
GET  /api/auth/google           # Initiate Google OAuth
GET  /api/auth/google/callback  # OAuth callback
GET  /api/auth/me               # Get current user info
```

### Maps (Branch-based)

```
GET    /api/maps           # List all maps (from branches)
POST   /api/maps           # Create new map (new branch)
GET    /api/maps/:id       # Get map by ID (from branch)
PUT    /api/maps/:id       # Update map (update branch)
DELETE /api/maps/:id       # Delete map (delete branch)
POST   /api/maps/:id/snapshot  # Create snapshot (Git tag)
```

### Search

```
GET /api/search?q=query    # Search maps by title/tags
```

### Webhooks (Optional)

```
POST /api/webhooks/github  # GitHub webhook receiver
```

## 🗂️ Organization-Based Branch Storage

### **Architecture Overview**

```
GitHub Organization: open-mindmap (환경변수 설정)
│
├── Repository: john (john@example.com 사용자)
│   ├── main                     # Documentation
│   ├── maps/map_1234567890     # Mindmap 1
│   │   └── map.json
│   └── maps/map_9876543210     # Mindmap 2
│       └── map.json
│
├── Repository: alice-doe (alice.doe@company.com 사용자)
│   ├── main
│   └── maps/map_5678901234
│       └── map.json
│
└── Repository: bob-smith (bob.smith@gmail.com 사용자)
    ├── main
    └── maps/map_3456789012
        └── map.json
```

### **Repository Path Generation**

```typescript
// Environment Variable
GITHUB_ORG = "open-mindmap"

// User Email → Repository Name
"john@example.com"        → "john"
"alice.doe@company.com"   → "alice-doe"
"bob_smith@gmail.com"     → "bob_smith"

// Final Path
→ open-mindmap/john
→ open-mindmap/alice-doe
→ open-mindmap/bob_smith
```

**Key Features:**
- **Central Organization**: All user repos under one org
- **Auto Repository Creation**: API creates repo on first map save
- **User Isolation**: Each user has their own repository
- **Branch per Map**: Each map is a separate branch
- **No Manual Index**: Branch list = map list
- **Git Version History**: Full history per map

See [BRANCH_ARCHITECTURE.md](../docs/BRANCH_ARCHITECTURE.md) and [GITHUB_ORG_ARCHITECTURE.md](../docs/GITHUB_ORG_ARCHITECTURE.md) for details.

## 🔐 Authentication Flow

### Google OAuth 2.0

1. User clicks "Sign in with Google"
2. Frontend redirects to `/api/auth/google`
3. Server redirects to Google OAuth consent screen
4. User grants permissions
5. Google redirects to `/api/auth/google/callback`
6. Server exchanges code for access token
7. Server fetches user info from Google
8. Server creates session token and stores in Redis
9. Server redirects to frontend with session token
10. Frontend stores token and uses for API requests

### Session Management

- Sessions stored in Redis with 24-hour expiration
- Key format: `session:{token}`
- Value: JSON-encoded user object

### Development Mode

Set `DEV_MODE=true` to bypass authentication:

```bash
DEV_MODE=true
```

Creates a mock user:
```json
{
  "userId": "dev_user_123",
  "email": "dev-user@example.com",
  "name": "Dev User",
  "picture": "https://example.com/dev-avatar.png"
}
```

## 🔧 Key Components

### GitHub Client (`src/github/client.ts`)

Handles all GitHub operations:

```typescript
class GitHubClient {
  async getIndex(): Promise<Index>
  // Lists all branches starting with "maps/"
  // Fetches map.json from each branch
  
  async getMap(id: string): Promise<Map>
  // Fetches map.json from branch: maps/{id}
  
  async createMap(map: Map): Promise<PRTransaction>
  // Creates new branch: maps/{id}
  // Commits map.json to branch
  
  async updateMap(map: Map): Promise<PRTransaction>
  // Updates map.json in existing branch
  
  async deleteMap(id: string): Promise<PRTransaction>
  // Deletes branch: maps/{id}
  
  async createSnapshot(mapId: string, tagName: string): Promise<{...}>
  // Creates Git tag for snapshot
}
```

### Redis Cache (`src/lib/redis.ts`)

Simple cache wrapper:

```typescript
await cache.put(key, value, { expirationTtl: 60 })
await cache.get(key)
await cache.delete(key)
```

### Repository Path Generation (`src/utils/github.ts`)

Automatically generates repository path from user info and organization:

```typescript
getGitHubOrg()
// Returns: "open-mindmap" (from GITHUB_ORG env)
// Default: "open-mindmap" if not set

getGitHubRepoName(user)
// Email → Repository name
// Priority:
// 1. user.email prefix (john@example.com → "john")
// 2. user.name (sanitized)
// 3. user.userId (fallback)
// 
// Sanitization:
// - Lowercase
// - Allow: alphanumeric, hyphens, underscores
// - Replace special chars with hyphens
// - Remove leading/trailing hyphens or underscores

getGitHubRepoPath(user)
// Returns: { owner: "open-mindmap", repo: "john" }
// Full path: open-mindmap/john
```

**Examples:**
```typescript
"john@example.com"        → { owner: "open-mindmap", repo: "john" }
"alice.doe@company.com"   → { owner: "open-mindmap", repo: "alice-doe" }
"bob_smith@gmail.com"     → { owner: "open-mindmap", repo: "bob_smith" }
"user+tag@domain.com"     → { owner: "open-mindmap", repo: "user-tag" }
```

### Schema Validation (`src/validators/map.ts`)

AJV-based JSON Schema validation:

```typescript
const validation = validateMap(mapData)
if (!validation.valid) {
  // Handle validation errors
  console.log(validation.errors)
}
```

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:8787/api/health

# List maps (requires auth)
curl -H "Authorization: Bearer {token}" \
  http://localhost:8787/api/maps

# Get specific map
curl -H "Authorization: Bearer {token}" \
  http://localhost:8787/api/maps/map_123
```

### Development Mode Testing

With `DEV_MODE=true`, no authentication required:

```bash
curl http://localhost:8787/api/maps
```

## 🚢 Deployment

See [DEPLOY.md](../docs/DEPLOY.md) for complete deployment guide.

### Quick Deploy (PM2)

```bash
# Build
npm run build

# Install PM2
npm install -g pm2

# Start
pm2 start dist/index.js --name open-mindmap-api

# Save configuration
pm2 save
pm2 startup
```

### Environment Variables (Production)

```bash
NODE_ENV=production
PORT=8787
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
GITHUB_TOKEN=...
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=https://yourdomain.com
```

## 🐛 Troubleshooting

### "Cannot connect to Redis"

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux
```

### "GitHub API rate limit exceeded"

- Check your GitHub token permissions
- Personal Access Token allows 5,000 requests/hour
- Monitor usage in response headers: `X-RateLimit-*`

### "Repository not found"

- Each user needs their own repository: `{username}/mindmap-data`
- User should create the repository manually
- See [GITHUB_SETUP.md](../docs/GITHUB_SETUP.md)

### "Invalid or expired session token"

- Sessions expire after 24 hours
- User needs to re-authenticate
- Check Redis connection

## 📚 Related Documentation

- **[../docs/GITHUB_ORG_ARCHITECTURE.md](../docs/GITHUB_ORG_ARCHITECTURE.md)** - Organization-based storage architecture
- **[../docs/BRANCH_ARCHITECTURE.md](../docs/BRANCH_ARCHITECTURE.md)** - Branch-based storage details
- **[../docs/GITHUB_SETUP.md](../docs/GITHUB_SETUP.md)** - GitHub token setup guide
- **[../docs/GOOGLE_OAUTH_SETUP.md](../docs/GOOGLE_OAUTH_SETUP.md)** - Google OAuth configuration
- **[../docs/DEPLOY.md](../docs/DEPLOY.md)** - Production deployment guide
- **[../openapi.yaml](../openapi.yaml)** - Complete API specification

## 🔒 Security Notes

- Store secrets in environment variables, never in code
- Use HTTPS in production
- Enable Redis password authentication in production
- Rotate GitHub tokens periodically
- Set appropriate CORS origins
- Use private GitHub repositories for user data
- Validate all input with JSON Schema

## 🎯 Performance Tips

- Redis caching reduces GitHub API calls
- Branch-based storage scales infinitely
- Pagination for large branch lists (100 per request)
- Lazy loading of map data (only when requested)
- Cache invalidation on updates

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details
