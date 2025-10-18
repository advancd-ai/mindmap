# Open Mindmap Documentation

This directory contains all development and deployment documentation for Open Mindmap.

## 📚 Documentation Index

### Architecture & Design

- **[BRANCH_ARCHITECTURE.md](./BRANCH_ARCHITECTURE.md)** - Branch-based storage architecture
  - How each mindmap is stored in its own Git branch
  - Branch naming conventions and structure
  - Index.json management

- **[GITHUB_ORG_ARCHITECTURE.md](./GITHUB_ORG_ARCHITECTURE.md)** - GitHub organization architecture
  - Multi-user repository organization
  - User isolation and data management
  - Repository naming and structure

- **[INDEX_DB_ARCHITECTURE.md](./INDEX_DB_ARCHITECTURE.md)** - Index database architecture
  - Map metadata management
  - Search and filtering implementation

### Setup Guides

- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub Personal Access Token setup
  - Step-by-step token generation
  - Required permissions
  - Security best practices

- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** - Google OAuth 2.0 configuration
  - Google Cloud Console setup
  - OAuth credentials creation
  - Redirect URI configuration

- **[DEV_MODE_GUIDE.md](./DEV_MODE_GUIDE.md)** - Development mode guide
  - Local development without OAuth
  - Mock authentication setup
  - Testing strategies

- **[GUEST_MODE.md](./GUEST_MODE.md)** - Guest mode guide
  - Try the app without signing in
  - Local-only data storage
  - Limitations and use cases

### Deployment

- **[DEPLOY.md](./DEPLOY.md)** - Traditional server deployment (PM2)
  - Server requirements
  - Environment configuration
  - PM2 process management
  - Nginx/Apache setup

- **[../deployment/README.md](../deployment/README.md)** - Container deployment
  - Docker Compose setup
  - Kubernetes manifests
  - Scaling and monitoring
  - Production best practices

### Debugging & Testing

- **[QUICK_DEBUG.md](./QUICK_DEBUG.md)** - Quick debugging guide
  - Common issues and solutions
  - Debug logging tips
  - Performance troubleshooting

- **[DASHBOARD_REFRESH_DEBUG.md](./DASHBOARD_REFRESH_DEBUG.md)** - Dashboard refresh debugging
  - State management issues
  - Real-time update problems
  - Cache invalidation

- **[DEBUG_FETCH_MAP.md](./DEBUG_FETCH_MAP.md)** - Map fetching debug guide
  - API request debugging
  - GitHub API issues
  - Network troubleshooting

- **[DEBUG_MAP_LOADING.md](./DEBUG_MAP_LOADING.md)** - Map loading debug guide
  - Loading performance issues
  - Data parsing problems
  - Render optimization

- **[TEST_CREATE_MAP.md](./TEST_CREATE_MAP.md)** - Map creation testing
  - End-to-end testing workflow
  - Branch creation verification
  - Index update validation

### Code & Implementation

- **[REPO_LOOKUP_CODE.md](./REPO_LOOKUP_CODE.md)** - Repository lookup code
  - User-to-repository mapping
  - Path resolution logic
  - Organization handling

- **[TITLE_MANAGEMENT.md](./TITLE_MANAGEMENT.md)** - Title management guide
  - Map title updates
  - Metadata synchronization
  - Index consistency

### Contributing

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contributing guidelines
  - Code style and conventions
  - Pull request process
  - Development workflow

## 🔗 External Resources

- **[API Specification](../openapi.yaml)** - Complete OpenAPI/Swagger documentation
- **[JSON Schemas](../schemas/)** - Data validation schemas
- **[Frontend Components README](../frontend/src/components/README.md)** - Component documentation
- **[i18n Guide](../frontend/src/components/README_I18N.md)** - Internationalization guide

## 📖 Reading Order for New Contributors

1. Start with [README.md](../README.md) for project overview
2. Read [BRANCH_ARCHITECTURE.md](./BRANCH_ARCHITECTURE.md) to understand data storage
3. Follow [DEV_MODE_GUIDE.md](./DEV_MODE_GUIDE.md) for local development
4. Review [CONTRIBUTING.md](./CONTRIBUTING.md) before making changes

## 🆘 Need Help?

- Check [QUICK_DEBUG.md](./QUICK_DEBUG.md) for common issues
- Review specific debug guides for your problem area
- Open an issue on GitHub with detailed logs

