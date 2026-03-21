# Open Mindmap Frontend

React-based frontend for Open Mindmap.

## Development

### Setup

```bash
npm install
```

### Run locally

```bash
npm run dev
```

App will be available at `http://localhost:3000`

### Build for production

```bash
npm run build
```

Output will be in `dist/` directory.

## Configuration

Create `.env.local`. All `VITE_*` variables are listed in **[docs/ENVIRONMENT.md](../docs/ENVIRONMENT.md)**.

```bash
VITE_API_URL=http://localhost:8787
# Optional: skip Google login in UI (local dev)
# VITE_DEV_MODE=true
# Optional: AdSense
# VITE_ADSENSE_ENABLED=false
```

Production example:

```bash
VITE_API_URL=https://api.example.com
```

### Docker / nginx image

`VITE_*` is **not** baked into the JS bundle. The container entrypoint writes `/runtime-config.js` from environment variables so one image can serve every environment. See **[docs/ENVIRONMENT.md](../docs/ENVIRONMENT.md)**.

## Project Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Root component
├── pages/
│   ├── LoginPage.tsx    # Login page
│   ├── AuthCallback.tsx # OAuth callback
│   ├── DashboardPage.tsx # Map list
│   └── EditorPage.tsx   # Map editor
├── components/
│   └── MindMapCanvas.tsx # Mindmap canvas
├── store/
│   ├── auth.ts          # Auth state (Zustand)
│   └── mindmap.ts       # Mindmap state (Zustand)
└── api/
    ├── client.ts        # API client
    └── maps.ts          # Map API functions
```

## Features

- **OAuth Authentication**: GitHub OAuth login
- **Map Management**: Create, edit, delete mindmaps
- **Visual Editor**: SVG-based mindmap canvas
- **Search**: Search maps by title/tags
- **PR Integration**: Save creates GitHub Pull Requests

