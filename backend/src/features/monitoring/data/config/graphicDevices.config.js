import { DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/index.js';

export const GRAPHIC_DEVICE_MODELS = Object.freeze(
  Object.fromEntries(Object.values(DEVICE_CONFIGS).map((config) => [config.id, config.model]))
);

export const getGraphicDeviceModel = (deviceId) => GRAPHIC_DEVICE_MODELS[deviceId] ?? null;
