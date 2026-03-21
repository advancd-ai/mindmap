# Open Mindmap

A visual thinking tool for organizing ideas with an intuitive mindmap interface. Features multiple node shapes, flexible connections, content embedding, and Google authentication. Map data is stored as Git: either via the **GitHub API** (per-user repos) or **on-disk Git** on your server (`GIT_PROVIDER=local` — default in `api/.env.example` and Docker/Kubernetes examples).

## 🌟 Features

- **Visual Mindmap Editor**: Create and edit mindmaps with an intuitive SVG-based interface
- **Multiple Node Shapes**: Rectangle, Circle, Diamond, Hexagon, Cloud, Capsule, File, Card - each with semantic meaning
- **Flexible Connections**: Straight, Curved, and Bezier edge types with customizable labels
- **Rich Content**: Embed YouTube videos and web pages directly in nodes
- **Text Alignment**: Full horizontal (left/center/right) and vertical (top/middle/bottom) alignment control
- **Node Interactions**: Drag & drop, resize with 8-direction handles, collapse/expand, and connect
- **Google Authentication**: Secure login with Google OAuth 2.0
- **Guest Mode**: Try the app without signing in (shared repository)
- **Git-backed storage**: Branch-based maps (`maps/{mapId}`) — **GitHub** (Octokit) or **local Git** on disk, configurable with `GIT_PROVIDER`
- **Multi-language Support**: English and Korean with i18next
- **JSON Preview**: Debug and verify changes before saving
- **Zoom & Pan**: Navigate large mindmaps with mouse wheel zoom and canvas panning
- **Context Menus**: Right-click menus for quick actions on nodes, edges, and canvas
- **Real-time Stats**: Node/edge count and version tracking in footer

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────────────┐         ┌─────────────────────────┐
│   Frontend   │ HTTPS   │   API (Node.js)      │   Git   │  GitHub API  OR  local │
│   (React)    │────────▶│   + Hono + Redis     │────────▶│  filesystem repos       │
│   + Zustand  │         │   + Google OAuth     │         │  (GIT_PROVIDER)         │
└──────────────┘         └──────────────────────┘         └─────────────────────────┘
      │                           │
      │                           ├── Redis (sessions, cache)
      │                           ├── Octokit (only if GIT_PROVIDER=github)
      │                           └── Google OAuth 2.0
                          │
                          └── One branch per map: maps/map_1234567890 …
```

### Branch-Based Storage

Each mindmap is stored in its own Git branch:
- Branch naming: `maps/{mapId}`
- File structure: `map.json` at branch root
- No manual index management - branch list = map list
- Full Git history per map
- See [docs/BRANCH_ARCHITECTURE.md](./docs/BRANCH_ARCHITECTURE.md) for details

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **Redis** server (for sessions and caching)
- **Google** account (for OAuth authentication)
- **Google Cloud** Project with OAuth 2.0 credentials configured
- **Git storage** (pick one):
  - **`GIT_PROVIDER=local`** (default in examples): writable directory for repos — no GitHub token required for map storage.
  - **`GIT_PROVIDER=github`**: **GitHub** account and Personal Access Token (`repo`) — see [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md).
- **Linux server** (for production deployment, optional)

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/mindmap.git
cd mindmap
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install and start Redis

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

### 4. Setup Google OAuth

Follow the detailed guide: [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md)

Quick steps:
1. Create a project in Google Cloud Console
2. Enable OAuth 2.0
3. Create credentials (Client ID & Secret)
4. Add authorized redirect URIs

### 5. GitHub token (only if `GIT_PROVIDER=github`)

If you use **GitHub** for map storage, follow [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md):

1. Generate a Personal Access Token with `repo` scope  
2. Set `GITHUB_TOKEN` (and `GITHUB_OWNER` / `GITHUB_ORG` as needed) in `api/.env`

If you use **`GIT_PROVIDER=local`** (default in `api/.env.example`), you can skip this step for storage; GitHub token is still optional for other features.

### 6. Configure environment variables

**Reference:** [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) (full list of variables used in code).

1. **API** — copy `api/.env.example` to `api/.env`. The example uses **`GIT_PROVIDER=local`** and `LOCAL_GIT_ROOT`. Set Google OAuth and Redis; add `GITHUB_*` only if you switch to GitHub storage. Use `DEV_MODE=true` only for local testing without OAuth.

2. **Frontend** — create `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:8787
# Optional: bypass Google login in the UI (matches API DEV_MODE)
VITE_DEV_MODE=true
# Optional: AdSense
# VITE_ADSENSE_ENABLED=false
```

### 7. Run development servers

```bash
# Terminal 1: API
cd api
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000` and the API at `http://localhost:8787`.

### 8. Quick Start with Guest Mode (No Setup Required)

Want to try immediately without setup?

1. Start only the frontend (no backend needed initially):
```bash
cd frontend
npm install
npm run dev
```

2. Visit `http://localhost:3000`
3. Click **"Continue as Guest"**
4. Start creating mindmaps!

**Note**: Guest mode requires backend to be running for full functionality. All guests share one repository.

## 📁 Project Structure

```
mindmap/
├── api/                    # Backend API (Node.js + Hono)
│   ├── src/
│   │   ├── index.ts       # Main entry point
│   │   ├── routes/        # API routes (auth, maps, search)
│   │   │   ├── auth.ts    # Google OAuth
│   │   │   ├── maps.ts    # CRUD operations
│   │   │   └── search.ts  # Search functionality
│   │   ├── github/        # GitHub client
│   │   │   └── client.ts  # Branch-based operations
│   │   ├── middleware/    # Auth, error handling
│   │   ├── validators/    # JSON Schema validation
│   │   ├── lib/           # Redis client
│   │   └── utils/         # GitHub username helpers
│   ├── package.json
│   ├── .env.example       # API env template (GIT_PROVIDER=local)
│   └── tsconfig.json
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── MindMapCanvas.tsx
│   │   │   ├── Node.tsx, Edge.tsx
│   │   │   ├── NodeShape.tsx
│   │   │   ├── ShapeSelector.tsx
│   │   │   ├── ContextMenu.tsx
│   │   │   ├── JsonPreviewDialog.tsx
│   │   │   └── LanguageSelector.tsx
│   │   ├── pages/         # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── EditorPage.tsx
│   │   ├── store/         # Zustand stores
│   │   │   ├── auth.ts
│   │   │   └── mindmap.ts
│   │   ├── i18n/          # Internationalization
│   │   │   └── locales/   # en.json, ko.json
│   │   ├── api/           # API client
│   │   └── utils/         # Helper functions
│   ├── package.json
│   └── vite.config.ts
│
├── schemas/               # JSON schemas
│   ├── map.schema.json
│   └── index.schema.json
│
├── scripts/               # Utility scripts
│   ├── validate.mjs       # Schema validation
│   └── build-index.mjs    # (Deprecated with branch architecture)
│
├── .github/
│   └── workflows/         # CI/CD (schema validation, GHCR images, CodeQL, etc.)
│       ├── publish-ghcr.yml
│       ├── validate-schema.yml
│       ├── codeql-analysis.yml
│       └── …
│
├── docs/                  # Documentation
│   ├── ENVIRONMENT.md     # Environment variables reference
│   ├── BRANCH_ARCHITECTURE.md
│   ├── GITHUB_SETUP.md
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── DEPLOY.md
│   └── GUEST_MODE.md
├── deployment/           # Deployment configurations
│   ├── docker/          # Docker Compose
│   │   └── docker-compose.yml
│   ├── kubernetes/      # Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml.example
│   │   ├── redis-deployment.yaml
│   │   ├── api-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── gateway-api.yaml
│   │   └── hpa.yaml
│   ├── nginx.conf       # Nginx configuration
│   └── README.md        # Deployment guide
├── openapi.yaml         # API specification
└── package.json         # Root package (workspace)
```

## 🔧 Development

### Development Mode

Set `DEV_MODE=true` in `api/.env` to bypass authentication:

```bash
DEV_MODE=true
```

This creates a mock user for local testing without Google OAuth setup.

### Schema Validation

Validate map schema:

```bash
cd scripts
node validate.mjs ../schemas/map.schema.json
```

### Type Checking

```bash
# API
cd api
npm run type-check

# Frontend
cd frontend
npm run type-check
```

### Linting

```bash
npm run lint
```

## 🚢 Deployment

Multiple deployment options available:

### 🐳 Docker Compose (Recommended for Quick Start)

```bash
# Using Makefile
make up

# Or manually
cd deployment/docker
cp .env.example .env
# Edit .env (defaults use GIT_PROVIDER=local — see docs/ENVIRONMENT.md)
docker-compose up -d
```

See [deployment/README.md](./deployment/README.md) for details.

### ☸️ Kubernetes (Production)

Container images are published to **GitHub Container Registry** (`ghcr.io/<owner>/mindmap-api`, `mindmap-frontend`) by [`.github/workflows/publish-ghcr.yml`](./.github/workflows/publish-ghcr.yml) (Linux **arm64**). Traffic uses **Gateway API** (`gateway-api.yaml`), not Ingress.

```bash
# Using deployment script
cd deployment
./deploy-k8s.sh

# Or using Makefile
make deploy-k8s

# Or manually
cd deployment/kubernetes
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f gateway-api.yaml
kubectl apply -f hpa.yaml
```

See [deployment/README.md](./deployment/README.md) for prerequisites (Gateway controller, arm64 nodes, etc.).

### 🖥️ Traditional Server Deployment

See [docs/DEPLOY.md](./docs/DEPLOY.md) for PM2-based deployment guide.

### Quick Deployment (Linux Server)

**1. Build the API:**

```bash
cd api
npm install
npm run build
```

**2. Run with PM2:**

```bash
npm install -g pm2
pm2 start dist/index.js --name open-mindmap-api
pm2 save
pm2 startup
```

**3. Deploy Frontend:**

```bash
cd frontend
npm run build
# Deploy dist/ folder to nginx/apache/vercel/netlify
```

## 📝 Data Structure

### Branch-Based Architecture

Each mindmap is stored in its own Git branch. With **GitHub**, repos are typically `{user}/mindmap-data`; with **local Git**, paths follow your `LOCAL_GIT_ROOT` layout.

```
Example (GitHub): {username}/mindmap-data

Branches:
├── main                     # Documentation (README.md)
├── maps/map_1234567890     # Mindmap 1
│   └── map.json
├── maps/map_9876543210     # Mindmap 2
│   └── map.json
└── maps/map_5678901234     # Mindmap 3
    └── map.json
```

### Map File Structure

Each `map.json` contains:

```json
{
  "id": "map_abc123",
  "title": "Product Roadmap",
  "tags": ["product", "planning"],
  "nodes": [
    {
      "id": "n_xyz",
      "label": "Feature A",
      "x": 100,
      "y": 200,
      "w": 150,
      "h": 80,
      "nodeType": "rect",
      "textAlign": "center",
      "textVerticalAlign": "middle",
      "collapsed": false,
      "embedUrl": "https://www.youtube.com/watch?v=...",
      "embedType": "youtube"
    }
  ],
  "edges": [
    {
      "id": "e_abc",
      "source": "n_xyz",
      "target": "n_def",
      "label": "depends on",
      "edgeType": "curved"
    }
  ],
  "updatedAt": "2025-10-12T10:00:00Z",
  "version": 1
}
```

### Map List (Auto-generated)

Map list is generated from Git branches (GitHub API or local Git, depending on `GIT_PROVIDER`):

```typescript
// GET /api/maps
{
  "ok": true,
  "data": {
    "generatedAt": "2025-10-12T10:00:00Z",
    "items": [
      {
        "id": "map_abc123",
        "title": "Product Roadmap",
        "tags": ["product"],
        "nodeCount": 15,
        "edgeCount": 12,
        "updatedAt": "2025-10-12T10:00:00Z",
        "version": 1
      }
    ]
  }
}
```

## 🔄 Workflow

### Creating a Map

1. User clicks "+ Create New Map" in dashboard
2. Frontend creates new map with generated ID
3. User edits the map in visual editor
4. User clicks "💾 Save (Preview)"
5. JSON Preview Dialog shows map data
6. User clicks "Confirm & Save"
7. API creates new branch `maps/{mapId}`
8. API commits `map.json` to the branch
9. Map appears in user's map list

### Updating a Map

1. User opens existing map
2. User makes changes (add nodes, connect edges, etc.)
3. User clicks "💾 Save (Preview)"
4. JSON Preview Dialog shows changes
5. User clicks "Confirm & Save"
6. API updates `map.json` in existing branch
7. Version number increments
8. Changes are saved with Git commit

### Deleting a Map

1. User selects map in dashboard
2. User clicks "Delete" in context menu
3. API deletes the branch `maps/{mapId}`
4. Map is removed from user's list

## 🔐 Security

- **Google OAuth 2.0**: Secure authentication with Google accounts
- **Session Management**: Redis-based session storage with expiration
- **CORS Protection**: Configurable origin whitelist
- **Git credentials**: GitHub PAT or local disk paths — never commit secrets; use env files and cluster Secrets
- **Private data**: With GitHub backend, user data lives in private repos; with local backend, protect filesystem permissions and backups
- **Schema Validation**: Automatic validation with AJV
- **Rate Limiting**: GitHub API rate limits respected when using `GIT_PROVIDER=github`
- **HTTPS Only**: Production requires HTTPS

## 📊 API Endpoints

See [openapi.yaml](./openapi.yaml) for complete API documentation.

### Authentication

- `POST /auth/guest` - Guest login (no OAuth required)
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user info
- `POST /auth/setup-repo` - Setup user's GitHub repository
- `POST /auth/logout` - Logout and clear session

### Maps

- `GET /maps` - List all maps (from branches)
- `POST /maps` - Create new map (new branch)
- `GET /maps/:id` - Get map by ID (from branch)
- `PUT /maps/:id` - Update map (update branch)
- `DELETE /maps/:id` - Delete map (delete branch)
- `POST /maps/:id/snapshot` - Create snapshot (Git tag)

### Search

- `GET /search?q=...` - Search maps by title/tags

### Health

- `GET /health` - Health check endpoint

## 🌍 Internationalization

Supported languages:
- **English** (en)
- **한국어** (ko)

Add new languages:
1. Create `frontend/src/i18n/locales/{lang}.json`
2. Add to `frontend/src/i18n/index.ts`
3. Add to `LanguageSelector.tsx`

See [frontend/src/components/README_I18N.md](./frontend/src/components/README_I18N.md) for details.

## 🧪 Testing

### Manual Testing

1. Start Redis, API, and Frontend
2. Navigate to `http://localhost:3000`
3. Login with Google (or use DEV_MODE)
4. Create a new map
5. Add nodes, connect edges
6. Try different node shapes and edge types
7. Embed a YouTube video
8. Save and verify in Git (GitHub or local remote)

### API Testing

```bash
# Health check
curl http://localhost:8787/health

# List maps (requires auth token)
curl -H "Authorization: Bearer {token}" \
  http://localhost:8787/maps
```

## 📖 Documentation

- **[docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)** - Environment variables (API, frontend, Docker/K8s)
- **[docs/BRANCH_ARCHITECTURE.md](./docs/BRANCH_ARCHITECTURE.md)** - Branch-based storage architecture
- **[docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md)** - GitHub Personal Access Token setup
- **[docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md)** - Google OAuth configuration
- **[docs/DEPLOY.md](./docs/DEPLOY.md)** - Production deployment guide (PM2)
- **[deployment/README.md](./deployment/README.md)** - Docker & Kubernetes deployment
- **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - Contributing guidelines
- **[docs/DEV_MODE_GUIDE.md](./docs/DEV_MODE_GUIDE.md)** - Development mode guide
- **[docs/GUEST_MODE.md](./docs/GUEST_MODE.md)** - Guest mode guide (try without sign in)
- **[openapi.yaml](./openapi.yaml)** - Complete API specification
- **[schemas/](./schemas/)** - JSON Schema definitions
- **[frontend/src/components/README_I18N.md](./frontend/src/components/README_I18N.md)** - i18n guide

### Debug & Architecture Docs

- **[docs/GITHUB_ORG_ARCHITECTURE.md](./docs/GITHUB_ORG_ARCHITECTURE.md)** - GitHub organization architecture
- **[docs/INDEX_DB_ARCHITECTURE.md](./docs/INDEX_DB_ARCHITECTURE.md)** - Index database architecture
- **[docs/DASHBOARD_REFRESH_DEBUG.md](./docs/DASHBOARD_REFRESH_DEBUG.md)** - Dashboard refresh debugging
- **[docs/DEBUG_FETCH_MAP.md](./docs/DEBUG_FETCH_MAP.md)** - Map fetching debug guide
- **[docs/DEBUG_MAP_LOADING.md](./docs/DEBUG_MAP_LOADING.md)** - Map loading debug guide
- **[docs/QUICK_DEBUG.md](./docs/QUICK_DEBUG.md)** - Quick debugging guide
- **[docs/REPO_LOOKUP_CODE.md](./docs/REPO_LOOKUP_CODE.md)** - Repository lookup code
- **[docs/TEST_CREATE_MAP.md](./docs/TEST_CREATE_MAP.md)** - Map creation testing
- **[docs/TITLE_MANAGEMENT.md](./docs/TITLE_MANAGEMENT.md)** - Title management guide

## 🎨 Design System

Open Mindmap uses an Apple-like design system:

- **Colors**: Base, Accent (Blue), Semantic (Success/Warning/Error/Info), Visualization (Node types)
- **Typography**: -apple-system, SF Pro Text
- **Spacing**: 4px base unit system
- **Shadows**: Subtle elevation with blur and saturation
- **Animations**: Smooth transitions with cubic-bezier easing
- **Frosted Glass**: Backdrop blur effects for modals and overlays

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and validation
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- Built with [Hono](https://hono.dev/) (lightweight web framework)
- Frontend powered by [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- State management with [Zustand](https://github.com/pmndrs/zustand)
- GitHub API integration via [Octokit](https://github.com/octokit/octokit.js)
- Schema validation with [AJV](https://ajv.js.org/)
- Internationalization with [i18next](https://www.i18next.com/)
- OAuth 2.0 authentication with Google

## 📞 Support

For issues, questions, and feature requests:
- [Open an issue](../../issues) on GitHub
- Check existing documentation in the `/docs` folder
- Review [openapi.yaml](./openapi.yaml) for API details

## 🗺️ Roadmap

- [ ] Real-time collaboration (WebSockets)
- [ ] Export to PNG/SVG/PDF
- [ ] Templates library
- [ ] Mobile app (React Native)
- [ ] More node shapes and styles
- [ ] Advanced search and filtering
- [ ] Map sharing and permissions
- [ ] GitHub App integration (instead of PAT)
- [ ] More languages (Japanese, Chinese, Spanish)
- [ ] Dark mode

---

**Open Mindmap** - Status: Beta (v0.2.0) - Under active development

Built with ❤️ for visual thinkers everywhere
