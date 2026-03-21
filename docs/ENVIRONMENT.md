# Environment variables

This document matches **current usage in the codebase** (`api/`, `frontend/`). Defaults shown are applied when the variable is unset (see each file for exact logic).

## API (`api/` — `process.env`)

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `PORT` | No | `8787` |
| `NODE_ENV` | No | Affects standard Node behavior; API also uses `DEV_MODE` for auth bypass. |
| `CORS_ORIGIN` | No | Comma-separated origins for CORS. Fallback: `http://localhost:3000`. |
| `DEV_MODE` | No | `true` → mock user, skips real OAuth/session checks. **Do not use in production.** |
| `ENVIRONMENT` | No | If set to `development`, error handler may include stack traces (`middleware/error-handler.ts`). |

### Google OAuth

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `GOOGLE_CLIENT_ID` | Yes (unless `DEV_MODE=true`) | — |
| `GOOGLE_CLIENT_SECRET` | Yes (unless `DEV_MODE=true`) | — |
| `GOOGLE_REDIRECT_URI` | No | `http://localhost:8787/auth/google/callback` (routes are mounted at `/auth`, not `/api/auth`). |
| `FRONTEND_URL` | No | `http://localhost:3000` — used for redirects and links (auth, share, PDF allowlist). |

### GitHub

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `GITHUB_TOKEN` | Yes (unless `DEV_MODE=true`) | PAT with repo access; placeholder used in code if missing (not for production). |
| `GITHUB_OWNER` | No | User/org for repos; used with `GITHUB_ORG` in `utils/github.ts`. |
| `GITHUB_ORG` | No | Preferred org name when resolving owner (`utils/github.ts`). |
| `GITHUB_REPO` | No | Guest/upload flows only — default `guest` (`routes/upload.ts`). |
| `GIT_PROVIDER` | No | `github` (default) or `local` for on-disk Git (`git/index.ts`, `routes/upload.ts`). Example `.env` files use **`local`** — see `api/.env.example` and `deployment/docker/.env.example`. |

### GitHub webhooks

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `GITHUB_WEBHOOK_SECRET` | Yes for `/webhooks/github` | Must match GitHub webhook secret (`routes/webhooks.ts`). |

### Redis

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `REDIS_URL` | No | `redis://localhost:6379` |
| `REDIS_PASSWORD` | No | Optional password (`lib/redis.ts`). |

### URLs & public base

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `API_URL` | No | Public base URL of this API (image URLs, PDF allowlist). Fallback: `http://localhost:8787` or derived from request / `FRONTEND_URL` / `PUBLIC_URL`. |
| `PUBLIC_URL` | No | Secondary fallback when inferring public URL (`utils/github.ts`, `git/local.ts`). |
| `DISCORD_WEBHOOK_URL` | No | Optional Discord notifications (`routes/auth.ts`). |

### Local Git (`GIT_PROVIDER=local`)

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `LOCAL_GIT_ROOT` | No | Root directory for repos; default under `cwd`/`data/repos` (`git/local.ts`). |
| `LOCAL_GIT_OWNER` | No | `local` |
| `LOCAL_GIT_REPO` | No | Repo name resolution (`git/local.ts`). |
| `LOCAL_GIT_AUTHOR_NAME` | No | Git commit author name |
| `LOCAL_GIT_AUTHOR_EMAIL` | No | Git commit author email |

### PDF / Playwright

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `PDF_CACHE_TTL` | No | Seconds; default `3600` (`services/pdf/cache.ts`). |
| `PLAYWRIGHT_MAX_BROWSERS` | No | Default `3` |
| `PLAYWRIGHT_MAX_CONTEXTS` | No | Default `5` |
| `PLAYWRIGHT_BROWSERS_PATH` | No | Optional path to browser binary (`services/pdf/playwright.ts`). |

---

## Frontend (`frontend/` — Vite)

Variables must be prefixed with `VITE_` to be exposed to the client.

| Variable | Required | Default / notes |
|----------|------------|-----------------|
| `VITE_API_URL` | No | API base URL. In dev, many call sites fall back to `http://localhost:8787`; `api/client.ts` defaults to `/api` (use dev proxy or set explicitly). |
| `VITE_DEV_MODE` | No | `true` → bypass Google login in UI (`App.tsx`, `store/auth.ts`, `LoginPage.tsx`). |
| `VITE_ADSENSE_ENABLED` | No | Controls AdSense loading (`utils/adsense.ts`, `Dockerfile` build args). |

See also `frontend/src/vite-env.d.ts`.

---

## Docker Compose (`docker-compose.yml`)

The root `docker-compose.yml` passes through the API variables listed there (including `GIT_PROVIDER`, local Git, Playwright, `PDF_CACHE_TTL`, etc.). Copy `deployment/docker/.env.example` to `deployment/docker/.env` and adjust.

**Default in `.env.example`:** `GIT_PROVIDER=local` with `LOCAL_GIT_ROOT` / `LOCAL_GIT_ROOT_HOST` so map data lives on disk under the mounted volume. Switch to `GIT_PROVIDER=github` and set `GITHUB_TOKEN` / `GITHUB_OWNER` (or `GITHUB_ORG`) to use GitHub instead.

Frontend build args:

- `VITE_API_URL`
- `VITE_ADSENSE_ENABLED`

---

## Kubernetes

- **ConfigMap** `mindmap-config`: includes **`GIT_PROVIDER=local`** and `LOCAL_*` keys by default (`deployment/kubernetes/configmap.yaml`).
- **Secret** `mindmap-secrets`: OAuth and optional GitHub token (`deployment/kubernetes/secrets.yaml.example`). `GITHUB_TOKEN` may be empty when using local storage.
- **API Deployment** mounts `emptyDir` at `/data/repos` for local Git data; replace with a **PersistentVolumeClaim** for production durability.

To use **GitHub** instead, set `GIT_PROVIDER=github` in the ConfigMap, provide `GITHUB_TOKEN` in Secrets, and remove or adjust the local Git volume if unused.

---

## Related docs

- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
- [GITHUB_SETUP.md](./GITHUB_SETUP.md)
- [deployment/README.md](../deployment/README.md)
