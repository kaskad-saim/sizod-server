const DEFAULT_DEV_API_URL = 'http://localhost:3002';
const DEFAULT_PROD_API_URL = 'http://169.254.0.0:3002';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL =
  configuredApiUrl && configuredApiUrl.length > 0
    ? configuredApiUrl
    : import.meta.env.DEV
      ? DEFAULT_DEV_API_URL
      : DEFAULT_PROD_API_URL;

export const toApiUrl = (path: string): string => {
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};
