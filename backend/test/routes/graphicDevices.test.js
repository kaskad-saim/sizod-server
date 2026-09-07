import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_CONFIGS } from '#features/monitoring/data/config/devices/index.js';
import {
  GRAPHIC_DEVICE_MODELS,
  getGraphicDeviceModel,
} from '#features/monitoring/data/config/graphicDevices.config.js';

// id из URL графиков фронтенда: /api/<id>/data
const FRONTEND_GRAPHIC_IDS = ['example'];

test('график строится по любому описанному устройству', () => {
  for (const config of Object.values(DEVICE_CONFIGS)) {
    assert.equal(getGraphicDeviceModel(config.id), config.model, config.id);
  }
});

test('источники истории фронтенда доступны по своим id', () => {
  for (const deviceId of FRONTEND_GRAPHIC_IDS) {
    assert.ok(GRAPHIC_DEVICE_MODELS[deviceId], `нет модели для графика ${deviceId}`);
  }

  assert.equal(getGraphicDeviceModel('unknown-device'), null);
});
