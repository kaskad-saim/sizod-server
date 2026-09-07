import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestDocument } from '#features/monitoring/data/utils/dataHelpers.js';
import {
  deviceStateStore,
  persistConfiguredModbusDevice,
  pollConfiguredModbusDevice,
  runConfiguredDevicePollCycle,
  resetConfiguredDeviceRuntimeState,
  validateConfiguredDevice,
} from '@sorbent/platform-kit/modbus';
import { ModbusRequestError } from '@sorbent/platform-kit/modbus';
import { setModbusLogger } from '@sorbent/platform-kit/modbus';

setModbusLogger({ info: () => {}, warn: () => {}, error: () => {} });

test('устройство работает на своём хранилище, без Mongoose-модели', async () => {
  const saved = [];
  let latest = { readings: { data: { value: 1 } }, lastUpdated: new Date(0) };
  const config = {
    id: 'storage-test',
    label: 'Storage test',
    stateKey: 'storage-test',
    storage: {
      loadLatest: async () => latest,
      save: async (document) => {
        saved.push(document);
        latest = document;

        return document;
      },
    },
    persistence: { root: 'readings' },
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: [{ key: 'value', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' }],
      },
    ],
  };

  resetConfiguredDeviceRuntimeState();
  assert.equal(validateConfiguredDevice(config), config);

  const { document } = await runConfiguredDevicePollCycle(
    { port: 'COM97', readHoldingBlock: async () => [42] },
    1,
    'Storage test',
    config
  );

  assert.equal(document.readings.data.value, 42);
  assert.equal(saved.length, 1);
  assert.equal(saved[0], document);
});

test('конфиг без хранилища и без модели не проходит проверку', () => {
  assert.throws(
    () =>
      validateConfiguredDevice({
        id: 'no-storage-test',
        sections: [
          {
            id: 'data',
            title: 'Data',
            params: [{ key: 'value', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' }],
          },
        ],
      }),
    /Не указано хранилище устройства/
  );
});

test('частичный снимок сохраняет старое значение до stale-порога, а затем заменяет его на null', async () => {
  let savedDocument;
  let latestDocument = { data: { offline: 17, online: 40 }, lastUpdated: new Date(0) };
  class Model {
    constructor(document) {
      Object.assign(this, document);
    }

    async save() {
      savedDocument = this;
      latestDocument = this;
    }

    static findOne() {
      return { sort: async () => latestDocument };
    }
  }
  const config = {
    id: 'partial-save-test',
    label: 'Partial save test',
    model: Model,
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: [
          { key: 'offline', slaveId: 1, address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
          { key: 'online', slaveId: 2, address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
        ],
      },
    ],
  };
  const client = {
    port: 'COM98',
    async readHoldingBlock(slaveId, address) {
      if (slaveId === 1) {
        throw new ModbusRequestError('Timed out', { slaveId, address });
      }
      return [42];
    },
  };

  resetConfiguredDeviceRuntimeState();
  let currentTime = 0;
  const result = await runConfiguredDevicePollCycle(client, 1, 'Partial save test', config, {
    now: () => currentTime,
  });

  assert.deepEqual(savedDocument.data, { offline: 17, online: 42 });
  assert.deepEqual(result.modbusHealth.unavailableSlaveIds, [1]);

  currentTime = 60_001;
  await runConfiguredDevicePollCycle(client, 1, 'Partial save test', config, {
    now: () => currentTime,
  });

  assert.deepEqual(savedDocument.data, { offline: null, online: 42 });
});

test('подставленное значение сохраняет прежнюю метку свежести, а прошлый документ читается один раз', async () => {
  let savedDocument;
  let findOneCalls = 0;
  let latestDocument = {
    data: { frequency: { offline: 17, online: 40 } },
    sourceUpdatedAt: { frequency: { offline: new Date(0), online: new Date(0) } },
    lastUpdated: new Date(0),
  };
  class Model {
    constructor(document) {
      Object.assign(this, document);
    }

    async save() {
      savedDocument = this;
      latestDocument = this;
    }

    static findOne() {
      findOneCalls += 1;
      return { sort: async () => latestDocument };
    }
  }
  const config = {
    id: 'freshness-save-test',
    label: 'Freshness save test',
    model: Model,
    persistence: { root: 'data', mergeLatest: true, freshnessRoot: 'sourceUpdatedAt' },
    sections: [
      {
        id: 'frequency',
        title: 'Frequency',
        params: [
          { key: 'offline', slaveId: 1, address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
          { key: 'online', slaveId: 2, address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
        ],
      },
    ],
  };
  const client = {
    port: 'COM97',
    async readHoldingBlock(slaveId, address) {
      if (slaveId === 1) {
        throw new ModbusRequestError('Timed out', { slaveId, address });
      }
      return [42];
    },
  };

  resetConfiguredDeviceRuntimeState();
  await runConfiguredDevicePollCycle(client, 1, 'Freshness save test', config, { now: () => 0 });

  assert.equal(findOneCalls, 1);
  assert.deepEqual(savedDocument.data.frequency, { offline: 17, online: 42 });
  assert.equal(savedDocument.sourceUpdatedAt.frequency.offline.getTime(), 0);
  assert.equal(savedDocument.sourceUpdatedAt.frequency.online.getTime() > 0, true);
});

test('опрос обновляет кэш состояния без записи в БД, сохранение выполняется отдельным шагом', async () => {
  let saveCalls = 0;
  let findOneCalls = 0;
  let failSave = false;
  class Model {
    static modelName = 'SplitLayersTestModel';

    constructor(document) {
      Object.assign(this, document);
    }

    async save() {
      saveCalls += 1;
      if (failSave) {
        throw new Error('БД недоступна');
      }
    }

    static findOne() {
      findOneCalls += 1;
      return { sort: async () => null };
    }
  }
  const config = {
    id: 'split-layers-test',
    label: 'Split layers test',
    model: Model,
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: [{ key: 'value', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' }],
      },
    ],
  };
  const client = { port: 'COM96', readHoldingBlock: async () => [42] };

  resetConfiguredDeviceRuntimeState();
  const { document } = await pollConfiguredModbusDevice(client, 1, 'Split layers test', config, { now: () => 0 });

  assert.equal(saveCalls, 0);
  assert.deepEqual(document.data, { value: 42 });
  assert.equal(deviceStateStore.getByModel(Model), document);
  assert.equal(await getLatestDocument(Model, { lean: true }), document);
  assert.equal(findOneCalls, 0);

  await persistConfiguredModbusDevice(config, 'Split layers test', document);
  assert.equal(saveCalls, 1);

  failSave = true;
  await assert.doesNotReject(() =>
    runConfiguredDevicePollCycle(client, 1, 'Split layers test', config, { now: () => 0 })
  );
  assert.equal(saveCalls, 2);
  assert.equal(deviceStateStore.getByModel(Model).data.value, 42);
});
