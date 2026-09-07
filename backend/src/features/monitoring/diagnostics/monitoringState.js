import path from 'path';
import { fileURLToPath } from 'url';
import { MODBUS_POLLING_DEVICES } from '#features/monitoring/data/config/polling/index.js';
import { getConverterMetaByPort } from '#features/monitoring/diagnostics/convertersConfig.js';
import { createMonitoringState } from '@sorbent/platform-kit/modbus';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const monitoring = createMonitoringState({
  source: 'sizod',
  cacheFilePath: path.join(__dirname, 'monitoringStateCache.json'),
});

function withMonitoringMeta(device) {
  const converter = getConverterMetaByPort(device?.port);
  return {
    ...device,
    monitoringId: device?.monitoringId ?? device?.deviceID ?? device?.address,
    monitoringDisplayName: device?.monitoringDisplayName ?? device?.name,
    converterId: device?.converterId ?? device?.converterIp ?? converter?.ipAddress,
    converterIp: device?.converterIp ?? converter?.ipAddress,
    converterDisplayName:
      device?.converterDisplayName ?? device?.converterName ?? converter?.controllerName ?? converter?.name,
    converterPort: device?.converterPort ?? converter?.rs485Port,
  };
}

export function initializeMonitoringState() {
  monitoring.initialize(MODBUS_POLLING_DEVICES.map(withMonitoringMeta));
}

export function markDeviceSuccess(device) {
  monitoring.markSuccess(withMonitoringMeta(device));
}

export function markDeviceError(device, error) {
  void error;
  monitoring.markError(withMonitoringMeta(device));
}

export function getMonitoringTree() {
  return monitoring.getTree();
}
