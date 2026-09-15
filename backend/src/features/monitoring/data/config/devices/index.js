import { STATION16_DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/station16/index.js';

export const DEVICE_CONFIGS = Object.freeze({
  ...STATION16_DEVICE_CONFIGS,
});

export const getDeviceConfig = (deviceId) => DEVICE_CONFIGS[deviceId] ?? null;

export const getParameterConfig = (deviceId, sectionId, paramKey) =>
  getDeviceConfig(deviceId)
    ?.sections.find((section) => section.id === sectionId)
    ?.params.find((param) => param.key === paramKey) ?? null;
