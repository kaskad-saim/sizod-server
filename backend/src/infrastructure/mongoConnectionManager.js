function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function createMongoConnectionManager({
  connection,
  open,
  label,
  initialDelayMs = 1000,
  maxDelayMs = 30000,
  log = console,
}) {
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let isConnecting = false;
  let hasConnected = connection.readyState === 1;
  let connectionUri = null;

  function resetInitialReconnect() {
    reconnectAttempt = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleInitialReconnect(error) {
    if (hasConnected || reconnectTimer || connection.readyState === 1) {
      return;
    }

    const delay = Math.min(initialDelayMs * 2 ** reconnectAttempt, maxDelayMs);
    reconnectAttempt += 1;
    log.error(`Ошибка подключения (${label}). Следующая попытка через ${delay}мс: ${getErrorMessage(error)}`);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delay);
  }

  async function connect(uri) {
    if (uri) {
      connectionUri = uri;
    }
    if (isConnecting || connection.readyState === 1) {
      return connection.readyState === 1;
    }

    isConnecting = true;
    try {
      if (!connectionUri) {
        throw new Error('Не указана строка подключения');
      }
      await open(connectionUri);
      hasConnected = true;
      resetInitialReconnect();
      return true;
    } catch (error) {
      scheduleInitialReconnect(error);
      return false;
    } finally {
      isConnecting = false;
    }
  }

  connection.on('connected', () => {
    hasConnected = true;
    resetInitialReconnect();
    log.info(`${label}: подключена`);
  });

  connection.on('disconnected', () => {
    if (hasConnected) {
      log.warn(`${label}: отключена. Ожидается автоматическое переподключение...`);
    }
  });

  connection.on('error', (error) => {
    log.error(`${label}: ${getErrorMessage(error)}`);
  });

  return { connect };
}
