import dotenv from 'dotenv';

dotenv.config();

const EXPECTED_ENV = ['SSO_CLIENT_ID', 'SSO_SIGNING_SECRET', 'SSO_INTERNAL_SECRET'];

const validateEnv = () => {
  const missing = EXPECTED_ENV.filter((key) => !process.env[key] || process.env[key].trim() === '');

  if (missing.length > 0) {
    console.warn(`Не заданы переменные окружения: ${missing.join(', ')}`);
  }
};

validateEnv();
