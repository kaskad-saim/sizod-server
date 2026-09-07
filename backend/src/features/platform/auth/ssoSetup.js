import '#configs/env.js';
import { configureSso } from '@sorbent/platform-kit/sso';
import { MAIN_API_BASE_URL, SERVER_BASE_URL } from '#constants/baseUrls.js';

const parseEnvBoolean = (raw, fallback) => {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  return fallback;
};

// главная авторизация включена в проде, если явно не отключена переменной окружения
const isMainAuthEnabled = () => parseEnvBoolean(process.env.MAIN_AUTH_ENABLED, process.env.NODE_ENV === 'production');

if (!process.env.SSO_INTERNAL_SECRET) {
  console.warn('SSO_INTERNAL_SECRET не задан — /sso/refresh будет всегда отказывать (introspect недоступен).');
}

configureSso({
  serverBaseUrl: SERVER_BASE_URL,
  mainApiBaseUrl: MAIN_API_BASE_URL,
  clientId: process.env.SSO_CLIENT_ID || 'sizod',
  signingSecret: process.env.SSO_SIGNING_SECRET || 'dev-sso-secret',
  internalSecret: process.env.SSO_INTERNAL_SECRET,
  accessTokenTtl: process.env.SSO_ACCESS_TOKEN_TTL,
  refreshTokenTtl: process.env.SSO_REFRESH_TOKEN_TTL,
  trustedBypassIps: process.env.TRUSTED_BYPASS_IPS,
  mainAuthEnabled: isMainAuthEnabled,
});
