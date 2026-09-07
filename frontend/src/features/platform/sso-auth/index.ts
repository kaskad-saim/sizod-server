import './ssoSetup';

export {
  bootstrapEmbedSession,
  buildSsoAuthHeaders,
  checkIpBypass,
  clearSsoAccessToken,
  clearSsoParamsFromUrl,
  ensureSsoAuth,
  exchangeSsoCode,
  fetchSsoMe,
  getEmbedAllowedOrigins,
  getSsoAccessToken,
  getSsoAccessTokenExpiresAt,
  getSsoCodeFromUrl,
  getSsoErrorFromUrl,
  getSsoRefreshDelayMs,
  getSsoStartUrl,
  getStoredSsoUser,
  hasSsoSession,
  isMainAuthEnabled,
  isSsoAccessTokenFresh,
  normalizeSsoUser,
  refreshSsoSession,
  resetSsoAttempts,
  setSsoAccessToken,
  setSsoSession,
  shouldBypassSsoInEmbed,
  SSO_BYPASS_USER,
  SsoUserProvider,
  subscribeSsoAuthSync,
  useIsAdmin,
  useSsoAuth,
  useSsoUser,
} from '@sorbent/platform-kit/sso-web';

export type {
  SsoAuthState,
  SsoAuthStatus,
  SsoEnsureResult,
  SsoRefreshResult,
  SsoUser,
  SsoUserRole,
} from '@sorbent/platform-kit/sso-web';

export { default as RequireSsoAuth } from './ui/RequireSsoAuth/RequireSsoAuth';
