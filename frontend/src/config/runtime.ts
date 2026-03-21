/**
 * Runtime config (Docker/K8s) vs build-time Vite env (local dev).
 * In production images, /runtime-config.js is generated at container start from env vars.
 *
 * Backend routes are mounted at the origin (e.g. /maps, /auth). In dev, Vite proxies `/api/*` → backend.
 * Default `"/api"` matches `api/client.ts` and works for OAuth, uploads, and axios when unset.
 */

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      VITE_API_URL?: string;
      VITE_ADSENSE_ENABLED?: string;
    };
  }
}

/** Same semantics as `import.meta.env.VITE_API_URL || '/api'` — runtime env wins when set in Docker/K8s. */
export function getBackendBaseUrl(): string {
  const r = window.__RUNTIME_CONFIG__?.VITE_API_URL;
  if (r !== undefined && r !== '') {
    return r;
  }
  const v = import.meta.env.VITE_API_URL;
  if (v !== undefined && v !== '') {
    return v;
  }
  return '/api';
}

/** AdSense toggle — matches previous adsense.ts behavior with import.meta fallback. */
export function getRuntimeAdsenseEnabled(): boolean {
  const r = window.__RUNTIME_CONFIG__?.VITE_ADSENSE_ENABLED;
  const raw =
    r !== undefined && r !== '' ? r : import.meta.env.VITE_ADSENSE_ENABLED;
  if (raw === undefined || raw === '') {
    return true;
  }
  return ['true', '1', 'yes', 'on'].includes(String(raw).toLowerCase());
}
