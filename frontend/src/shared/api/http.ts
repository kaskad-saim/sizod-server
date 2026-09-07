import { toApiUrl } from './config.ts';

interface JsonRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

interface ErrorPayload {
  error?: string;
  details?: string;
  message?: string;
}

const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//iu;

const resolveRequestUrl = (pathOrUrl: string) =>
  ABSOLUTE_URL_PATTERN.test(pathOrUrl) ? pathOrUrl : toApiUrl(pathOrUrl);

const buildHeaders = (headersInit: HeadersInit | undefined, defaults: Record<string, string>) => {
  const headers = new Headers(headersInit);

  Object.entries(defaults).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  return headers;
};

const getErrorMessage = (status: number, rawBody: string) => {
  const trimmedBody = rawBody.trim();

  if (trimmedBody.length > 0) {
    try {
      const payload = JSON.parse(trimmedBody) as ErrorPayload;
      const details = [payload.error, payload.message, payload.details].filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );

      if (details.length > 0) {
        return details.join(' ');
      }
    } catch {
      return trimmedBody;
    }
  }

  return `Ошибка запроса (${status})`;
};

export const requestJson = async <T>(pathOrUrl: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(resolveRequestUrl(pathOrUrl), {
    ...init,
    headers: buildHeaders(init?.headers, {
      Accept: 'application/json',
    }),
  });
  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, rawBody));
  }

  if (rawBody.trim().length === 0) {
    return undefined as T;
  }

  return JSON.parse(rawBody) as T;
};

export const requestJsonSafe = async <T>(pathOrUrl: string, init?: RequestInit): Promise<T | null> => {
  try {
    return await requestJson<T>(pathOrUrl, init);
  } catch {
    return null;
  }
};

export const getJson = <T>(pathOrUrl: string, init?: RequestInit) => requestJson<T>(pathOrUrl, init);

export const postJson = <TResponse>(
  pathOrUrl: string,
  body: JsonRequestInit['body'],
  init?: Omit<JsonRequestInit, 'body' | 'method'>
) =>
  requestJson<TResponse>(pathOrUrl, {
    ...init,
    method: 'POST',
    headers: buildHeaders(init?.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });

export const putJson = <TResponse>(
  pathOrUrl: string,
  body: JsonRequestInit['body'],
  init?: Omit<JsonRequestInit, 'body' | 'method'>
) =>
  requestJson<TResponse>(pathOrUrl, {
    ...init,
    method: 'PUT',
    headers: buildHeaders(init?.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  });

export const deleteJson = <TResponse>(pathOrUrl: string, init?: Omit<RequestInit, 'method'>) =>
  requestJson<TResponse>(pathOrUrl, {
    ...init,
    method: 'DELETE',
  });
