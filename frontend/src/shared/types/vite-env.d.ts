/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MAIN_AUTH_ENABLED?: string;
  readonly VITE_EMBED_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
