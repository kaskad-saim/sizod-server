import express from 'express';
import { getDeviceConfig } from '#features/monitoring/data/config/devices/index.js';
import { createFieldsDataHandler } from '#features/monitoring/data/utils/routeHelpers.js';

const router = express.Router();

export const DEVICE_DATA_ENDPOINTS = Object.freeze([{ path: '/example-data', deviceId: 'example' }]);

export const getDeviceDataEndpointConfig = ({ deviceId }) => {
  const config = getDeviceConfig(deviceId);

  if (!config) {
    throw new Error(`Для маршрута данных не найден конфиг устройства ${deviceId}`);
  }

  return config;
};

for (const endpoint of DEVICE_DATA_ENDPOINTS) {
  const config = getDeviceDataEndpointConfig(endpoint);
  const fields = config.sections.filter((section) => !section.internal).map((section) => section.id);
  const omitFields = config.sections.filter((section) => section.internal).map((section) => section.id);

  router.get(
    endpoint.path,
    createFieldsDataHandler(config.model, fields, `Ошибка при получении данных ${config.label}:`, { omitFields })
  );
}

export default router;
