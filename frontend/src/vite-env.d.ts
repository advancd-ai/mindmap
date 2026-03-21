/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_MODE?: string;
  readonly VITE_ADSENSE_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}



