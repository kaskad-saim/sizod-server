import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/index.js';
import { MODBUS_POLLING_DEVICES, MODBUS_PORTS } from '#features/monitoring/data/config/polling/index.js';
import {
  buildDeviceReadPlan,
  collectConfiguredDeviceData,
  getConfigSlaveIds,
  resetConfiguredDeviceRuntimeState,
  setModbusLogger,
  validateConfiguredDevice,
} from '@sorbent/platform-kit/modbus';

setModbusLogger({ info: () => {}, warn: () => {}, error: () => {} });

// клиент отдаёт float32 CDAB по адресу и целые слова по отдельным адресам
const createClient = ({ floats = () => 10, words = {} } = {}) => {
  const calls = [];

  return {
    calls,
    async readHoldingBlock(slaveId, startAddress, registerCount) {
      calls.push([slaveId, startAddress, registerCount]);
      const result = new Array(registerCount).fill(0);

      for (let offset = 0; offset < registerCount; offset += 1) {
        const address = startAddress + offset;

        if (Object.hasOwn(words, address)) {
          result[offset] = words[address] & 0xffff;
          continue;
        }

        if (offset + 2 <= registerCount && (address - startAddress) % 2 === 0) {
          const buffer = Buffer.alloc(4);
          buffer.writeFloatBE(floats(address), 0);
          result[offset] = buffer.readUInt16BE(2);
          result[offset + 1] = buffer.readUInt16BE(0);
          offset += 1;
        }
      }

      return result;
    },
  };
};

test('все объектные конфиги проходят строгую проверку, ключ каталога совпадает с id', () => {
  assert.deepEqual(Object.keys(DEVICE_CONFIGS), ['example']);

  for (const [deviceId, config] of Object.entries(DEVICE_CONFIGS)) {
    assert.equal(validateConfiguredDevice(config), config);
    assert.equal(deviceId, config.id);
    assert.equal(typeof config.model, 'function');
  }
});

test('конфиги устройств не содержат произвольных transform-функций', () => {
  const params = Object.values(DEVICE_CONFIGS).flatMap((config) =>
    config.sections.flatMap((section) => section.params)
  );

  assert.ok(params.every((param) => param.transform === undefined));
  assert.ok(params.every((param) => typeof param.unit === 'string'));
});

test('каждое опрашиваемое устройство ссылается на существующий конфиг и описанный порт', () => {
  assert.equal(MODBUS_POLLING_DEVICES.length, 1);

  for (const device of MODBUS_POLLING_DEVICES) {
    assert.ok(DEVICE_CONFIGS[device.configId], `${device.name}: нет конфига ${device.configId}`);
    assert.ok(MODBUS_PORTS[device.port], `${device.name}: не описан порт ${device.port}`);
    assert.ok(!('serviceModule' in device) && !('readDataFunction' in device));
    assert.ok(!('timeout' in device) && !('baudRate' in device) && !('maxRetries' in device));
  }

  const keys = MODBUS_POLLING_DEVICES.map((device) => `${device.port}:${device.deviceID}`);
  assert.equal(new Set(keys).size, keys.length, 'slaveId не повторяется в пределах порта');
});

test('пример устройства читается одним сплошным блоком без лишних адресов', () => {
  const plan = buildDeviceReadPlan(DEVICE_CONFIGS.example);

  assert.deepEqual(
    plan.blocks.map((block) => [block.startAddress, block.registerCount]),
    [[0x0000, 7]]
  );
  assert.deepEqual(plan.individualParameters, []);
  assert.deepEqual(getConfigSlaveIds(DEVICE_CONFIGS.example, 1), [1]);
});

test('значения и флаги примера декодируются из одного блока', async () => {
  resetConfiguredDeviceRuntimeState();
  const client = createClient({
    floats: (address) => (address === 0x0004 ? 12.34 : 25.25),
    words: { 0x0006: 0b01 },
  });

  const data = await collectConfiguredDeviceData(client, 1, 'Пример тест', DEVICE_CONFIGS.example);

  assert.equal(data.parameters['Температура'], 25.3);
  assert.equal(data.parameters['Давление'], 25.3);
  assert.equal(data.parameters['Расход'], 12.34);
  assert.equal(data.info['Работа'], true);
  assert.equal(data.info['Авария'], false);
  assert.equal(client.calls.length, 1);
});
