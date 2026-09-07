import { configureSsoWeb } from '@sorbent/platform-kit/sso-web';
import { API_BASE_URL } from '@shared/api/config.ts';

function parseEnvBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  return fallback;
}

function parseOriginsList(raw: string | undefined): string[] {
  if (typeof raw !== 'string') {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Синхронизируйте с MAIN_AUTH_ENABLED на бэкенде. Не задано: dev — выкл, prod — вкл. */
configureSsoWeb({
  apiBaseUrl: API_BASE_URL,
  mainAuthEnabled: () => parseEnvBoolean(import.meta.env.VITE_MAIN_AUTH_ENABLED, import.meta.env.PROD),
  embedAllowedOrigins: parseOriginsList(import.meta.env.VITE_EMBED_ALLOWED_ORIGINS),
  dev: import.meta.env.DEV,
});
