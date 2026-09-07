import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectConfiguredDeviceData,
  resetConfiguredDeviceRuntimeState,
  transformConfiguredValue,
} from '@sorbent/platform-kit/modbus';
import { setModbusLogger } from '@sorbent/platform-kit/modbus';

setModbusLogger({ info: () => {}, warn: () => {}, error: () => {} });

const createFloatClient = (resolveValue) => {
  const calls = new Map();
  const countCall = (key) => calls.set(key, (calls.get(key) ?? 0) + 1);

  return {
    calls,
    async readHoldingBlock(slaveId, startAddress, registerCount) {
      countCall(`${slaveId}:block:${startAddress}`);
      const words = new Array(registerCount).fill(0);

      for (let offset = 0; offset + 2 <= registerCount; offset += 2) {
        const buffer = Buffer.alloc(4);
        buffer.writeFloatBE(resolveValue(startAddress + offset), 0);
        words[offset] = buffer.readUInt16BE(2);
        words[offset + 1] = buffer.readUInt16BE(0);
      }

      return words;
    },
  };
};

test('типовые множитель, смещение, модуль и округление применяются без функции transform', () => {
  assert.equal(transformConfiguredValue(-10, { absolute: true, scale: 0.25, offset: -12.5, precision: 1 }), -10);
  assert.equal(transformConfiguredValue(10, { scale: 0.16, precision: 1 }), 1.6);
  assert.equal(transformConfiguredValue(-2, { precision: 0 }), -2);
  assert.equal(transformConfiguredValue(-1.5, { precision: 0 }), -2);
  assert.equal(transformConfiguredValue(1, { scale: -0.25, precision: 1 }), -0.3);
  assert.equal(typeof transformConfiguredValue(1, { scale: -0.25, precision: 1 }), 'number');
});

test('составное значение и время описываются без transform', () => {
  assert.deepEqual(
    transformConfiguredValue(10.4, {
      outputs: {
        value: { scale: 10, precision: 0 },
        percent: { precision: 0 },
      },
    }),
    { value: 104, percent: 10 }
  );
  assert.equal(transformConfiguredValue(3661, { displayAs: 'hoursMinutes' }), '01:01');
});

test('числовой регистр со смыслом boolean считает любое ненулевое значение включённым', () => {
  assert.equal(transformConfiguredValue(0, { outputType: 'boolean' }), false);
  assert.equal(transformConfiguredValue(1, { outputType: 'boolean' }), true);
  assert.equal(transformConfiguredValue(2, { outputType: 'boolean' }), true);
  assert.equal(transformConfiguredValue(-1, { outputType: 'boolean' }), true);
  assert.throws(() => transformConfiguredValue(Number.NaN, { outputType: 'boolean' }), /Ожидалось числовое/u);
});

test('перечисление подставляет подпись, а неизвестный код оставляет числом', () => {
  const param = { scale: 0.1, precision: 0, enum: { 0: 'Стоп', 1: 'Работа', 2: 'Авария' } };

  assert.equal(transformConfiguredValue(10, param), 'Работа');
  assert.equal(transformConfiguredValue(0, param), 'Стоп');
  assert.equal(transformConfiguredValue(70, param), 7);
  assert.equal(transformConfiguredValue(1, { enum: { 1: 'Да' }, invert: true }), 'Да', 'invert не трогает строку');
});

test('инверсия переворачивает булев результат любого происхождения', () => {
  assert.equal(transformConfiguredValue(true, { invert: true }), false);
  assert.equal(transformConfiguredValue(false, { invert: true }), true);
  assert.equal(transformConfiguredValue(2, { outputType: 'boolean', invert: true }), false);
  assert.equal(transformConfiguredValue(0, { outputType: 'boolean', invert: true }), true);
  assert.equal(transformConfiguredValue(5, { invert: true }), 5, 'число без булева смысла не меняется');
});

test('фильтр резкого скачка принимает новое значение после трёх подтверждений', async () => {
  resetConfiguredDeviceRuntimeState();
  let temperature = 100;
  const client = createFloatClient(() => temperature);
  const config = {
    id: 'stability-test',
    label: 'Stability test',
    model: class {},
    sections: [
      {
        id: 'temperatures',
        title: 'Температуры',
        params: [
          {
            key: 'В топке',
            address: 0x0000,
            registerType: 'holding',
            dataType: 'float32',
            byteOrder: 'CDAB',
            unit: '°C',
            precision: 0,
            stability: { maxDelta: 150, acceptAfter: 3 },
          },
        ],
      },
    ],
  };

  const initial = await collectConfiguredDeviceData(client, 3, 'Stability test', config);
  assert.equal(initial.temperatures['В топке'], 100);

  temperature = 300;
  const firstJump = await collectConfiguredDeviceData(client, 3, 'Stability test', config);
  const secondJump = await collectConfiguredDeviceData(client, 3, 'Stability test', config);
  const confirmedJump = await collectConfiguredDeviceData(client, 3, 'Stability test', config);

  assert.equal(firstJump.temperatures['В топке'], undefined);
  assert.equal(secondJump.temperatures['В топке'], undefined);
  assert.equal(confirmedJump.temperatures['В топке'], 300);
});
