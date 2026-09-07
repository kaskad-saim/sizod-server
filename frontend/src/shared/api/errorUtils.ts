const NETWORK_ERROR_PATTERNS = [
  /failed to fetch/i,
  /fetch failed/i,
  /networkerror/i,
  /load failed/i,
  /network request failed/i,
  /err_connection_refused/i,
];

export const SERVER_UNAVAILABLE_MESSAGE = 'Сервер не доступен.';

export const isServerUnavailableError = (error: unknown) => {
  if (error instanceof Error) {
    return NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
  }

  return false;
};

export const resolveLoadErrorText = (error: unknown, fallbackText: string) =>
  isServerUnavailableError(error)
    ? SERVER_UNAVAILABLE_MESSAGE
    : error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallbackText;
