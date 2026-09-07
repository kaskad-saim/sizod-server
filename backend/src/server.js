import '#configs/env.js';
import logger from '#infrastructure/logger.js';
import app from '#app.js';
import { connectDB } from '#models/database.js';
import { SERVER_BASE_URL } from '#constants/baseUrls.js';
import { initializeMonitoringState } from '#features/monitoring/diagnostics/monitoringState.js';
import { startModbusPolling, stopModbusPolling } from '#startup/modbusPolling.js';

const port = process.env.PORT || 3002;
const FORCE_EXIT_MS = 35_000;

void connectDB();
initializeMonitoringState();

void startModbusPolling();

const httpServer = app.listen(port, () => {
  const host = process.env.NODE_ENV === 'production' ? new URL(SERVER_BASE_URL).hostname : 'localhost';
  logger.info(`Сервер запущен на http://${host}:${port}`);
});

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Получен ${signal}. Останавливаем опрос...`);

  const forceExitTimer = setTimeout(() => process.exit(1), FORCE_EXIT_MS);
  forceExitTimer.unref();

  await stopModbusPolling();

  httpServer.close(() => {
    clearTimeout(forceExitTimer);
    process.exit(0);
  });
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
