import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/index.js';
import {
  ModbusSimulator,
  buildSimulationRegisters,
  collectConfiguredDeviceData,
  decodeRegisters as decodeWords,
  setModbusLogger,
} from '@sorbent/platform-kit/modbus';

const BOOLEAN_VALUES = new Set([false, true]);

const createSimulator = (devices = []) =>
  new ModbusSimulator({ port: 'SIM', registers: buildSimulationRegisters(devices) });

test('симулятор сообщает о подключении только при смене состояния', async () => {
  const messages = [];
  setModbusLogger({ info: (message) => messages.push(message), warn: () => {}, error: () => {} });

  try {
    const simulator = createSimulator();
    assert.equal(simulator.isConnected, false);

    await simulator.connect();
    await simulator.connect();

    assert.equal(simulator.isConnected, true);
    assert.deepEqual(messages, ['Симулятор Modbus подключен к порту SIM']);

    await simulator.disconnect();
    assert.equal(simulator.isConnected, false);

    await simulator.connect();
    assert.equal(messages.length, 2);
  } finally {
    setModbusLogger({ info: () => {}, warn: () => {}, error: () => {} });
  }
});

test('симулятор берёт дискретный смысл параметров из конфигов устройств', async () => {
  for (const [index, config] of Object.values(DEVICE_CONFIGS).entries()) {
    const slaveId = index + 1;
    const simulator = createSimulator([{ config, slaveId }]);
    const data = await collectConfiguredDeviceData(simulator, slaveId, config.label, config);
    const booleanParams = config.sections.flatMap((section) =>
      section.params
        .filter((param) => param.outputType === 'boolean' || param.bit !== undefined)
        .map((param) => ({ sectionId: section.id, key: param.key }))
    );

    for (const { sectionId, key } of booleanParams) {
      assert.ok(BOOLEAN_VALUES.has(data[sectionId][key]), `${config.label}: ${sectionId}/${key} не boolean`);
    }
  }
});

test('значение остаётся в разумных пределах и меняется плавно', async () => {
  const simulator = createSimulator([{ config: DEVICE_CONFIGS.example, slaveId: 1 }]);
  const read = async () => {
    const words = await simulator.readHoldingBlock(1, 0x0000, 2);
    return decodeWords(words, 0, { dataType: 'float32', byteOrder: 'CDAB' });
  };

  let previous = await read();

  for (let step = 0; step < 50; step += 1) {
    const value = await read();

    assert.ok(value >= -200 && value <= 1200, `значение вне диапазона: ${value}`);
    assert.ok(Math.abs(value - previous) <= 20, `значение скакнуло: ${previous} -> ${value}`);
    previous = value;
  }
});

test('знаковый регистр доходит до отрицательных значений, беззнаковый остаётся положительным', async () => {
  const simulator = createSimulator();
  const collect = (dataType) =>
    Array.from({ length: 400 }, (_, index) => simulator.nextValue(`${dataType}:${index}`, { dataType, scale: 1 }));

  assert.ok(
    collect('int16').some((value) => value < 0),
    'знаковый регистр ни разу не ушёл в минус'
  );
  assert.ok(
    collect('uint16').every((value) => value >= 0),
    'беззнаковый регистр ушёл в минус'
  );
});

test('отрицательное значение знакового регистра переживает кодирование в слово', async () => {
  const config = {
    id: 'signed-simulation-test',
    label: 'Signed test',
    model: class {},
    readPlan: { auto: false },
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: Array.from({ length: 40 }, (_, address) => ({
          key: `value${address}`,
          address,
          registerType: 'holding',
          dataType: 'int16',
          unit: '',
        })),
      },
    ],
  };
  const simulator = createSimulator([{ config, slaveId: 1 }]);
  const register = { dataType: 'int16', scale: 1 };
  const address = Array.from({ length: 40 }, (_, index) => index).find(
    (candidate) => simulator.getRange(register, `1:holding:${candidate}`).min < 0
  );

  assert.ok(address !== undefined, 'ни у одного знакового регистра не оказалось отрицательного размаха');

  const range = simulator.getRange(register, `1:holding:${address}`);
  simulator.values.set(`1:holding:${address}`, range.min);

  const words = await simulator.readHoldingBlock(1, address, 1);
  const value = decodeWords(words, 0, { dataType: 'int16' });

  assert.ok(value < 0, `ожидалось отрицательное значение, получено ${value}`);
  assert.ok(value >= -200, `значение вышло за размах: ${value}`);
});

test('размах не выходит за ёмкость регистра, поэтому слово не заворачивается', async () => {
  const config = {
    id: 'scaled-simulation-test',
    label: 'Scaled test',
    model: class {},
    readPlan: { auto: false },
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: [
          { key: 'signed', address: 0, registerType: 'holding', dataType: 'int16', unit: '', scale: 0.1 },
          { key: 'unsigned', address: 1, registerType: 'holding', dataType: 'uint16', unit: '', scale: 0.1 },
          {
            key: 'composite',
            address: 2,
            registerType: 'holding',
            dataType: 'uint16',
            unit: '',
            outputs: { value: { scale: 60 }, percent: {} },
          },
        ],
      },
    ],
  };
  const simulator = createSimulator([{ config, slaveId: 1 }]);

  for (let step = 0; step < 200; step += 1) {
    const words = await simulator.readHoldingBlock(1, 0, 3);
    const signed = decodeWords(words, 0, { dataType: 'int16' }) * 0.1;
    const unsigned = decodeWords(words, 1, { dataType: 'uint16' }) * 0.1;
    const composite = decodeWords(words, 2, { dataType: 'uint16' }) * 60;

    assert.ok(signed >= -200 && signed <= 1200, `знаковое значение вне размаха: ${signed}`);
    assert.ok(unsigned >= 0 && unsigned <= 1200, `беззнаковое значение вне размаха: ${unsigned}`);
    assert.ok(composite >= 0 && composite <= 1200, `составное значение вне размаха: ${composite}`);
  }
});

test('симулятор отдаёт осмысленные значения для всех типов данных, битовых полей и строк', async () => {
  const dataTypes = ['int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64', 'float32', 'float64'];
  const config = {
    id: 'all-types-simulation-test',
    label: 'All types test',
    model: class {},
    readPlan: { auto: false },
    sections: [
      {
        id: 'numbers',
        title: 'Numbers',
        params: dataTypes.flatMap((dataType, typeIndex) =>
          ['ABCD', 'CDAB', 'BADC', 'DCBA'].map((byteOrder, orderIndex) => ({
            key: `${dataType}-${byteOrder}`,
            address: typeIndex * 20 + orderIndex * 4,
            registerType: 'holding',
            dataType,
            byteOrder,
            unit: '',
          }))
        ),
      },
      {
        id: 'flags',
        title: 'Flags',
        params: [
          ...Array.from({ length: 16 }, (_, bit) => ({
            key: `bit${bit}`,
            address: 200,
            registerType: 'holding',
            dataType: 'uint16',
            bit,
            unit: '',
          })),
          { key: 'raw', address: 200, registerType: 'holding', dataType: 'uint16', unit: '' },
          {
            key: 'mode',
            address: 201,
            registerType: 'input',
            dataType: 'int32',
            byteOrder: 'ABCD',
            bitField: { start: 4, length: 3 },
            unit: '',
          },
          {
            key: 'name',
            address: 210,
            registerType: 'holding',
            dataType: 'string',
            registerCount: 4,
            byteOrder: 'ABCD',
            unit: '',
          },
          { key: 'ok', address: 220, registerType: 'holding', dataType: 'boolean', unit: '' },
        ],
      },
    ],
  };
  const simulator = createSimulator([{ config, slaveId: 2 }]);
  const seenBitValues = new Map();

  for (let step = 0; step < 30; step += 1) {
    const data = await collectConfiguredDeviceData(simulator, 2, config.label, config);

    for (const [key, value] of Object.entries(data.numbers)) {
      assert.ok(Number.isFinite(value), `${key}: не число (${value})`);
      assert.ok(Math.abs(value) <= 1200, `${key}: вне размаха (${value})`);
    }

    for (let bit = 0; bit < 16; bit += 1) {
      const value = data.flags[`bit${bit}`];
      assert.ok(BOOLEAN_VALUES.has(value), `bit${bit}: не boolean`);
      assert.equal(value, ((data.flags.raw >> bit) & 1) === 1, `bit${bit} расходится со словом состояния`);
      seenBitValues.set(bit, (seenBitValues.get(bit) ?? new Set()).add(value));
    }

    assert.ok(Number.isInteger(data.flags.mode) && data.flags.mode >= 0 && data.flags.mode <= 7);
    assert.equal(data.flags.name, 'SIM-210');
    assert.ok(BOOLEAN_VALUES.has(data.flags.ok));
  }

  assert.ok(
    [...seenBitValues.values()].some((values) => values.size === 2),
    'ни один бит ни разу не переключился'
  );
});

test('неизвестный регистр отдаёт число в тех же пределах, а не мусор', async () => {
  const simulator = createSimulator();
  const words = await simulator.readHoldingBlock(9, 0x0100, 4);

  assert.equal(words.length, 4);
  assert.ok(
    words.every((word) => Number.isInteger(word) && word >= 0 && word <= 1200),
    `неожиданные слова: ${words.join(', ')}`
  );
});
