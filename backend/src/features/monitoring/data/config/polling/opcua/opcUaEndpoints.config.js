// точки подключения OPC UA: один ПЛК на CODESYS, все его устройства читаются одной сессией
export const OPCUA_ENDPOINTS = {
  'plc-station16': {
    displayName: 'ПЛК210 Станции 16',
    endpointUrl: 'opc.tcp://169.254.0.238:4840',
    pollIntervalMs: 5_000,
  },
};
