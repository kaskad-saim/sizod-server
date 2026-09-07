import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const loggerFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// под тест-раннером Node логгер молчит: его вывод ломает протокол раннера и засоряет logs/
const logger = winston.createLogger({
  level: LOG_LEVEL,
  silent: Boolean(process.env.NODE_TEST_CONTEXT),
  format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), loggerFormat),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: false,
      maxSize: '20m',
      maxFiles: '7d',
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      zippedArchive: false,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp }) => {
          if (level === 'error') {
            return `[${timestamp}] Ошибка записана в лог.`;
          }
          return message;
        })
      ),
    }),
  ],
});

const errorCache = {};
const ERROR_CACHE_DURATION = 15000;

const originalLoggerError = logger.error.bind(logger);

// подавляет повторы одинаковых ошибок в пределах ERROR_CACHE_DURATION
logger.error = (message) => {
  const now = Date.now();
  const cacheKey = message;

  if (!errorCache[cacheKey] || now - errorCache[cacheKey] > ERROR_CACHE_DURATION) {
    errorCache[cacheKey] = now;
    originalLoggerError(message);
  }
};

export default logger;
