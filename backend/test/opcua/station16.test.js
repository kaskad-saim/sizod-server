import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/index.js';
import {
  OpcUaSimulator,
  buildOpcUaSimulationVariables,
  pollOpcUaDevice,
  resetOpcUaDeviceRuntimeState,
  setOpcUaLogger,
} from '@sorbent/platform-kit/opcua';

setOpcUaLogger({ info: () => {}, warn: () => {}, error: () => {} });

const config = DEVICE_CONFIGS.station16;
const params = config.sections.flatMap((section) => section.params);

test('переменные станции берутся из GVL, каждая читается один раз', () => {
  assert.ok(params.every((param) => param.symbol.startsWith('Application.GVL.')));
  assert.equal(new Set(params.map((param) => param.symbol)).size, params.length);
});

test('опрос через симулятор даёт документ со всеми секциями и параметрами', async () => {
  const client = new OpcUaSimulator({ endpoint: 'test', variables: buildOpcUaSimulationVariables([config]) });

  resetOpcUaDeviceRuntimeState();
  await client.connect();

  const { document, health } = await pollOpcUaDevice(client, 'Станция 16 тест', config);

  assert.deepEqual(health, { successfulReads: params.length, failedReads: 0, error: undefined });

  for (const section of config.sections) {
    assert.deepEqual(
      Object.keys(document[section.id]),
      section.params.map((param) => param.key),
      section.id
    );
  }

  assert.ok(Object.values(config.sections[0].params[0].enum).includes(document.process['Шаг проверки']));
  assert.equal(typeof document.inputs['Аварийный стоп'], 'boolean');
  resetOpcUaDeviceRuntimeState();
});
