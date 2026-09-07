import logger from '#infrastructure/logger.js';
import {
  MODBUS_PORT_DEFAULTS,
  ModbusClient,
  ModbusPortWorker,
  ModbusSimulator,
  buildSimulationRegisters,
  describeConnection,
  getConfigSlaveIds,
  modbusRequestTimings,
  modbusSources,
  normalizeConnection,
  resolvePortSettings,
  runConfiguredDevicePollCycle,
  setModbusLogger,
} from '@sorbent/platform-kit/modbus';
import { MODBUS_POLLING_DEVICES, MODBUS_PORTS } from '#features/monitoring/data/config/polling/index.js';
import { getDeviceConfig } from '#features/monitoring/data/config/devices/index.js';
import { markDeviceError, markDeviceSuccess } from '#features/monitoring/diagnostics/monitoringState.js';

const workers = [];

// обработчик конфига после сохранения документа; его сбой не влияет на опрос
const runAfterPoll = async (config, device, document) => {
  if (typeof config.afterPoll !== 'function') {
    return;
  }

  try {
    await config.afterPoll({ config, deviceId: device.deviceID, document });
  } catch (error) {
    logger.error(`[${device.name}] Ошибка обработчика afterPoll: ${error.message}`);
  }
};

// цель опроса: объектный конфиг устройства
const resolveTarget = (device) => {
  const configuredDevice = getDeviceConfig(device.configId);
  if (!configuredDevice) {
    throw new Error(`Конфиг устройства ${device.configId} не найден`);
  }

  return {
    device,
    slaveIds: getConfigSlaveIds(configuredDevice, device.deviceID),
    read: async (client) => {
      const result = await runConfiguredDevicePollCycle(client, device.deviceID, device.name, configuredDevice);

      if (result.document) {
        await runAfterPoll(configuredDevice, device, result.document);
      }

      return result;
    },
  };
};

const groupDevicesByPort = () => {
  const devicesByPort = new Map();

  for (const device of MODBUS_POLLING_DEVICES) {
    if (device.pollingEnabled === false) {
      logger.info(`[${device.name}] Modbus-опрос отключён в конфигурации`);
      continue;
    }

    const devices = devicesByPort.get(device.port) ?? [];
    devices.push(device);
    devicesByPort.set(device.port, devices);
  }

  return devicesByPort;
};

// порт остаётся в диагностике с причиной: иначе его отсутствие читается как «такого порта нет»
const reportPortStartupError = (modbusPort, portConfig, error) => {
  modbusRequestTimings.configurePort(modbusPort, {
    baudRate: portConfig?.baudRate ?? null,
    transport: portConfig ? resolvePortSettings(portConfig).transport : null,
    endpoint: portConfig ? describeConnection(normalizeConnection(modbusPort, portConfig)) : null,
    requestTimeoutMs: portConfig?.requestTimeoutMs ?? null,
    slowRequestMs: portConfig?.slowRequestMs ?? MODBUS_PORT_DEFAULTS.slowRequestMs,
    startupError: error.message,
  });
};

const startPortWorker = async (Client, modbusPort, devices) => {
  const portConfig = MODBUS_PORTS[modbusPort];

  if (!portConfig) {
    throw new Error(`Не описаны параметры Modbus-порта ${modbusPort}`);
  }

  const settings = resolvePortSettings(portConfig);
  const connection = normalizeConnection(modbusPort, portConfig);

  modbusRequestTimings.configurePort(modbusPort, {
    baudRate: connection.baudRate ?? null,
    transport: settings.transport,
    endpoint: describeConnection(connection),
    requestTimeoutMs: settings.requestTimeoutMs,
    slowRequestMs: settings.slowRequestMs,
    pollIntervalMs: settings.pollIntervalMs,
  });

  modbusSources.configurePort(modbusPort, {
    failureThreshold: settings.sourceFailureThreshold,
    retryMinMs: settings.sourceRetryMinMs,
    retryMaxMs: settings.sourceRetryMaxMs,
  });

  const targets = devices.map((device) => resolveTarget(device));
  const client = new Client({
    port: modbusPort,
    connection,
    timeout: settings.requestTimeoutMs,
    registers: buildSimulationRegisters(
      devices.map((device) => ({ config: getDeviceConfig(device.configId), slaveId: device.deviceID }))
    ),
    interRequestDelayMs: settings.interRequestDelayMs,
    crcRetryCount: settings.crcRetryCount,
    crcRetryDelayMs: settings.crcRetryDelayMs,
    slowRequestMs: settings.slowRequestMs,
    hardTimeoutMs: settings.hardTimeoutMs,
    connectTimeoutMs: settings.connectTimeoutMs,
  });
  const worker = new ModbusPortWorker({
    port: modbusPort,
    client,
    targets,
    markSuccess: markDeviceSuccess,
    markError: markDeviceError,
    pollIntervalMs: settings.pollIntervalMs,
    reconnectMinMs: settings.reconnectMinMs,
    reconnectMaxMs: settings.reconnectMaxMs,
    cycleWatchdogMs: settings.cycleWatchdogMs,
    recordCycle: (cycle) => modbusRequestTimings.recordCycle(modbusPort, cycle),
  });

  workers.push(worker);
  void worker.start().catch((error) => {
    logger.error(`Опрос Modbus-порта ${modbusPort} аварийно остановлен: ${error.message}`);
  });
};

// запускает по одному воркеру на каждый используемый Modbus-порт
export const startModbusPolling = async () => {
  setModbusLogger(logger);

  const isProduction = process.env.NODE_ENV === 'production';
  const Client = isProduction ? ModbusClient : ModbusSimulator;
  logger.info(`Используется ${isProduction ? 'ModbusClient' : 'ModbusSimulator'}`);

  for (const [modbusPort, devices] of groupDevicesByPort()) {
    try {
      await startPortWorker(Client, modbusPort, devices);
    } catch (error) {
      reportPortStartupError(modbusPort, MODBUS_PORTS[modbusPort], error);
      devices.forEach((device) => markDeviceError(device, error));
      logger.error(`Не удалось запустить опрос Modbus-порта ${modbusPort}: ${error.message}`);
    }
  }
};

export const stopModbusPolling = async () => {
  await Promise.allSettled(workers.map((worker) => worker.stop()));
  workers.length = 0;
};
