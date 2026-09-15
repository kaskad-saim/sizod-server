import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/index.js';
import { OPCUA_ENDPOINTS, OPCUA_POLLING_DEVICES } from '#features/monitoring/data/config/polling/index.js';
import { resolveEndpointSettings, validateOpcUaDevice } from '@sorbent/platform-kit/opcua';

test('все объектные конфиги проходят проверку OPC UA, ключ каталога совпадает с id', () => {
  assert.deepEqual(Object.keys(DEVICE_CONFIGS), ['station16']);

  for (const [deviceId, config] of Object.entries(DEVICE_CONFIGS)) {
    assert.equal(validateOpcUaDevice(config), config);
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

test('каждое опрашиваемое устройство ссылается на существующий конфиг и описанную точку подключения', () => {
  assert.equal(OPCUA_POLLING_DEVICES.length, 1);

  for (const device of OPCUA_POLLING_DEVICES) {
    assert.ok(DEVICE_CONFIGS[device.configId], `${device.name}: нет конфига ${device.configId}`);
    assert.ok(OPCUA_ENDPOINTS[device.endpoint], `${device.name}: не описана точка ${device.endpoint}`);
    assert.doesNotThrow(() => resolveEndpointSettings(OPCUA_ENDPOINTS[device.endpoint]));
  }

  const configIds = OPCUA_POLLING_DEVICES.map((device) => device.configId);
  assert.equal(new Set(configIds).size, configIds.length, 'конфиг опрашивается одной точкой');
});
