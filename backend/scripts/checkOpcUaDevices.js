import { format } from 'node:util';
import { LogLevel, setErrorLogger, setLogLevel } from 'node-opcua';
import {
  OpcUaClient,
  checkDeviceConfigAgainstSymbols,
  formatSymbolCheckReport,
  resolveEndpointSettings,
  setOpcUaLogger,
} from '@sorbent/platform-kit/opcua';
import { getDeviceConfig } from '#features/monitoring/data/config/devices/index.js';
import { OPCUA_ENDPOINTS, OPCUA_POLLING_DEVICES } from '#features/monitoring/data/config/polling/index.js';

const writeLine = (message) => process.stderr.write(`${message}\n`);

// сверка конфигов устройств одной точки подключения с переменными ПЛК; true, если расхождений нет
const checkEndpoint = async (endpoint, devices) => {
  const settings = resolveEndpointSettings(OPCUA_ENDPOINTS[endpoint]);
  const sourceName = `ПЛК ${new URL(settings.endpointUrl).host}`;
  const client = new OpcUaClient({
    endpoint,
    endpointUrl: settings.endpointUrl,
    deviceName: settings.deviceName,
    requestTimeoutMs: settings.requestTimeoutMs,
    connectTimeoutMs: settings.connectTimeoutMs,
    maxNodesPerRead: settings.maxNodesPerRead,
    applicationName: 'sizod-server-check',
  });

  try {
    await client.connect();

    const { symbols } = await client.browseSymbols();
    let ok = true;

    if (symbols.length === 0) {
      writeLine(`${sourceName} не отдаёт переменных: в него не загружен проект с конфигурацией символов`);
    }

    for (const device of devices) {
      const config = getDeviceConfig(device.configId);

      if (!config) {
        writeLine(`[${device.name}] нет конфига ${device.configId}`);
        ok = false;
        continue;
      }

      const result = checkDeviceConfigAgainstSymbols(config, symbols);
      process.stdout.write(formatSymbolCheckReport(result, { label: device.name, sourceName }));
      ok = ok && result.ok;
    }

    return ok;
  } catch (error) {
    writeLine(error.message);
    return false;
  } finally {
    await client.disconnect();
  }
};

setOpcUaLogger({ info: writeLine, warn: writeLine, error: writeLine });
setLogLevel(LogLevel.Error);
setErrorLogger((...args) => writeLine(format(...args)));

let allOk = true;

for (const [endpoint, devices] of Map.groupBy(OPCUA_POLLING_DEVICES, (device) => device.endpoint)) {
  allOk = (await checkEndpoint(endpoint, devices)) && allOk;
}

process.exitCode = allOk ? 0 : 1;
