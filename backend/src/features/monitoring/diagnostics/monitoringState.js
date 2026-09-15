import path from 'path';
import { fileURLToPath } from 'url';
import { OPCUA_ENDPOINTS, OPCUA_POLLING_DEVICES } from '#features/monitoring/data/config/polling/index.js';
import { createMonitoringState } from '@sorbent/platform-kit/monitoring';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const monitoring = createMonitoringState({
  source: 'sizod',
  cacheFilePath: path.join(__dirname, 'monitoringStateCache.json'),
});

// устройство в дереве мониторинга: ПЛК на месте преобразователя, OPC UA на месте порта
function withMonitoringMeta(device) {
  const endpoint = OPCUA_ENDPOINTS[device.endpoint];
  const host = endpoint ? new URL(endpoint.endpointUrl).hostname : device.endpoint;
  return {
    ...device,
    monitoringId: device.monitoringId ?? device.configId,
    monitoringDisplayName: device.monitoringDisplayName ?? device.name,
    converterId: device.endpoint,
    converterIp: host,
    converterDisplayName: endpoint?.displayName ?? host,
    portId: 'opcua',
    portDisplayName: 'OPC UA',
  };
}

export function initializeMonitoringState() {
  monitoring.initialize(OPCUA_POLLING_DEVICES.map(withMonitoringMeta));
}

export function markDeviceSuccess(device) {
  monitoring.markSuccess(withMonitoringMeta(device));
}

export function markDeviceError(device, error) {
  monitoring.markError(withMonitoringMeta(device), error);
}

export function getMonitoringTree() {
  return monitoring.getTree();
}
