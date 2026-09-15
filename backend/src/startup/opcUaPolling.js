import logger from '#infrastructure/logger.js';
import {
  OpcUaClient,
  OpcUaEndpointWorker,
  OpcUaSimulator,
  buildOpcUaSimulationVariables,
  resolveEndpointSettings,
  runOpcUaDevicePollCycle,
  setOpcUaLogger,
} from '@sorbent/platform-kit/opcua';
import { OPCUA_ENDPOINTS, OPCUA_POLLING_DEVICES } from '#features/monitoring/data/config/polling/index.js';
import { getDeviceConfig } from '#features/monitoring/data/config/devices/index.js';
import { markDeviceError, markDeviceSuccess } from '#features/monitoring/diagnostics/monitoringState.js';

const workers = [];

// конфиг устройства; без него точка подключения не запускается
const requireDeviceConfig = (device) => {
  const config = getDeviceConfig(device.configId);

  if (!config) {
    throw new Error(`Конфиг устройства ${device.configId} не найден`);
  }

  return config;
};

const groupDevicesByEndpoint = () => {
  const devicesByEndpoint = new Map();

  for (const device of OPCUA_POLLING_DEVICES) {
    if (device.pollingEnabled === false) {
      logger.info(`[${device.name}] OPC UA-опрос отключён в конфигурации`);
      continue;
    }

    const devices = devicesByEndpoint.get(device.endpoint) ?? [];
    devices.push(device);
    devicesByEndpoint.set(device.endpoint, devices);
  }

  return devicesByEndpoint;
};

// в production настоящий ПЛК, иначе симулятор по тем же конфигам
const createClient = (isProduction, endpoint, settings, configs) =>
  isProduction
    ? new OpcUaClient({
        endpoint,
        endpointUrl: settings.endpointUrl,
        deviceName: settings.deviceName,
        requestTimeoutMs: settings.requestTimeoutMs,
        connectTimeoutMs: settings.connectTimeoutMs,
        maxNodesPerRead: settings.maxNodesPerRead,
        applicationName: 'sizod-server',
      })
    : new OpcUaSimulator({ endpoint, variables: buildOpcUaSimulationVariables(configs) });

const startEndpointWorker = (isProduction, endpoint, devices) => {
  const endpointConfig = OPCUA_ENDPOINTS[endpoint];

  if (!endpointConfig) {
    throw new Error(`Не описана точка подключения OPC UA ${endpoint}`);
  }

  const settings = resolveEndpointSettings(endpointConfig);
  const configs = devices.map(requireDeviceConfig);
  const worker = new OpcUaEndpointWorker({
    endpoint,
    client: createClient(isProduction, endpoint, settings, configs),
    targets: devices.map((device, index) => ({
      device,
      read: (client) => runOpcUaDevicePollCycle(client, device.name, configs[index]),
    })),
    markSuccess: markDeviceSuccess,
    markError: markDeviceError,
    pollIntervalMs: settings.pollIntervalMs,
    reconnectMinMs: settings.reconnectMinMs,
    reconnectMaxMs: settings.reconnectMaxMs,
    cycleWatchdogMs: settings.cycleWatchdogMs,
  });

  workers.push(worker);
  void worker.start().catch((error) => {
    logger.error(`Опрос OPC UA ${endpoint} аварийно остановлен: ${error.message}`);
  });
};

// запускает по одному воркеру на каждую точку подключения OPC UA
export const startOpcUaPolling = () => {
  setOpcUaLogger(logger);

  const isProduction = process.env.NODE_ENV === 'production';
  logger.info(`Используется ${isProduction ? 'OpcUaClient' : 'OpcUaSimulator'}`);

  for (const [endpoint, devices] of groupDevicesByEndpoint()) {
    try {
      startEndpointWorker(isProduction, endpoint, devices);
    } catch (error) {
      devices.forEach((device) => markDeviceError(device, error));
      logger.error(`Не удалось запустить опрос OPC UA ${endpoint}: ${error.message}`);
    }
  }
};

export const stopOpcUaPolling = async () => {
  await Promise.allSettled(workers.map((worker) => worker.stop()));
  workers.length = 0;
};
