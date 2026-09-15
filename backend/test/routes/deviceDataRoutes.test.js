import test from 'node:test';
import assert from 'node:assert/strict';
import deviceDataRoutes, {
  DEVICE_DATA_ENDPOINTS,
  getDeviceDataEndpointConfig,
} from '#features/monitoring/data/routes/deviceDataRoutes.js';
import { buildFieldsStaleResponse } from '#features/monitoring/data/utils/routeHelpers.js';

const EXPECTED_PATHS = ['/station16-data'];

test('единый роутер регистрирует URL данных устройств', () => {
  assert.deepEqual(
    DEVICE_DATA_ENDPOINTS.map(({ path }) => path),
    EXPECTED_PATHS
  );

  const registeredPaths = deviceDataRoutes.stack.map((layer) => layer.route?.path).filter(Boolean);
  assert.deepEqual(registeredPaths, EXPECTED_PATHS);
});

test('каждый маршрут получает модель и секции из объектного конфига', () => {
  for (const endpoint of DEVICE_DATA_ENDPOINTS) {
    const config = getDeviceDataEndpointConfig(endpoint);

    assert.equal(config.id, endpoint.deviceId);
    assert.equal(typeof config.model, 'function');
    assert.ok(config.sections.every((section) => typeof section.id === 'string' && section.id.length > 0));
  }

  assert.throws(() => getDeviceDataEndpointConfig({ deviceId: 'unknown' }), /не найден конфиг/u);
});

test('ответ отдаёт секции без единиц измерения, а устаревшие значения заменяет прочерками', () => {
  const now = Date.now();
  const doc = {
    parameters: { Температура: 25.3 },
    info: { Работа: true },
    lastUpdated: new Date(now),
  };

  const fresh = buildFieldsStaleResponse(doc, ['parameters', 'info']);
  assert.deepEqual(fresh.parameters, { Температура: 25.3 });
  assert.deepEqual(fresh.info, { Работа: true });
  assert.equal(typeof fresh.lastUpdated, 'string');

  const stale = buildFieldsStaleResponse({ ...doc, lastUpdated: new Date(now - 61_000) }, ['parameters', 'info']);
  assert.deepEqual(stale.parameters, { Температура: '-' });
  assert.deepEqual(stale.info, { Работа: '-' });
});
