import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeviceReadPlan,
  collectConfiguredDeviceData,
  validateConfiguredDevice,
} from '@sorbent/platform-kit/modbus';
import { setModbusLogger } from '@sorbent/platform-kit/modbus';

setModbusLogger({ info: () => {}, warn: () => {}, error: () => {} });

const createAutoPlanConfig = (params, readPlan) => ({
  id: `auto-plan-${Math.random()}`,
  label: 'Auto plan test',
  model: class {},
  readPlan,
  sections: [{ id: 'data', title: 'Data', params }],
});

test('блочное чтение выполняется один раз и декодирует int16 и float32', async () => {
  let calls = 0;
  const client = {
    async readHoldingBlock(slaveId, startAddress, registerCount) {
      calls += 1;
      assert.deepEqual([slaveId, startAddress, registerCount], [1, 0, 3]);
      return [0xffff, 0x0000, 0x4148];
    },
  };
  class Model {}
  const config = {
    id: 'block-test',
    label: 'Block test',
    model: Model,
    readPlan: { blocks: [{ id: 'main', registerType: 'holding', startAddress: 0, registerCount: 3 }] },
    sections: [
      {
        id: 'data',
        title: 'Данные',
        params: [
          { key: 'signed', address: 0, registerType: 'holding', dataType: 'int16', unit: '' },
          { key: 'float', address: 1, registerType: 'holding', dataType: 'float32', byteOrder: 'CDAB', unit: '' },
        ],
      },
    ],
  };

  const data = await collectConfiguredDeviceData(client, 1, 'Block test', config);
  assert.deepEqual(data.data, { signed: -1, float: 12.5 });
  assert.equal(calls, 1);
});

test('гибридный план читает объявленные блоки, а остальные регистры поодиночке', async () => {
  class Model {}
  const params = [
    { key: 'first', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
    { key: 'second', address: 1, registerType: 'holding', dataType: 'uint16', unit: '' },
    { key: 'far', address: 100, registerType: 'holding', dataType: 'uint16', unit: '' },
    { key: 'input', address: 0, registerType: 'input', dataType: 'uint16', unit: '' },
    { key: 'otherSlave', address: 2, slaveId: 7, registerType: 'holding', dataType: 'uint16', unit: '' },
    { key: 'coil', address: 5, registerType: 'coil', dataType: 'boolean', unit: '' },
  ];
  const config = {
    id: 'hybrid-read-test',
    label: 'Hybrid read test',
    model: Model,
    readPlan: {
      blocks: [{ id: 'main', slaveId: 'default', registerType: 'holding', startAddress: 0, registerCount: 2 }],
    },
    sections: [{ id: 'data', title: 'Data', params }],
  };

  const plan = buildDeviceReadPlan(config);

  assert.deepEqual(plan.blocks, [
    { id: 'main', slaveKey: 'default', registerType: 'holding', startAddress: 0, registerCount: 2 },
  ]);
  assert.deepEqual(
    plan.individualParameters.map((param) => param.key),
    ['far', 'input', 'otherSlave', 'coil']
  );

  const calls = [];
  const client = {
    async readHoldingBlock(slaveId, startAddress, registerCount) {
      calls.push(['holding', slaveId, startAddress, registerCount]);
      return Array.from({ length: registerCount }, (_, index) => slaveId * 1000 + startAddress + index);
    },
    async readInputBlock(slaveId, startAddress, registerCount) {
      calls.push(['input', slaveId, startAddress, registerCount]);
      return Array.from({ length: registerCount }, (_, index) => 2000 + startAddress + index);
    },
    async readCoil(slaveId, address) {
      calls.push(['coil', slaveId, address]);
      return true;
    },
  };

  const data = await collectConfiguredDeviceData(client, 1, 'Hybrid read test', config);

  assert.deepEqual(calls, [
    ['holding', 1, 0, 2],
    ['holding', 1, 100, 1],
    ['input', 1, 0, 1],
    ['holding', 7, 2, 1],
    ['coil', 1, 5],
  ]);
  assert.deepEqual(data.data, {
    first: 1000,
    second: 1001,
    far: 1100,
    input: 2000,
    otherSlave: 7002,
    coil: true,
  });
});

test('проверка плана чтения отклоняет некорректные блоки и устаревшие настройки', () => {
  class Model {}
  const base = {
    id: 'read-plan-validation-test',
    label: 'Read plan validation test',
    model: Model,
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: [
          { key: 'value', address: 0, registerType: 'holding', dataType: 'float32', byteOrder: 'CDAB', unit: '' },
        ],
      },
    ],
  };

  assert.throws(
    () =>
      validateConfiguredDevice({
        ...base,
        readPlan: { blocks: [{ id: 'main', registerType: 'holding', startAddress: 0, registerCount: 126 }] },
      }),
    /от 1 до 125/u
  );
  assert.throws(
    () =>
      validateConfiguredDevice({
        ...base,
        readPlan: { blocks: [{ id: 'main', registerType: 'coil', startAddress: 0, registerCount: 2 }] },
      }),
    /holding и input/u
  );
  assert.throws(
    () =>
      validateConfiguredDevice({
        ...base,
        readPlan: { blocks: [{ id: 'main', registerType: 'holding', startAddress: 100, registerCount: 2 }] },
      }),
    /не используется ни одним параметром/u
  );
  assert.throws(
    () =>
      validateConfiguredDevice({
        ...base,
        readPlan: {
          blocks: [
            { id: 'main', registerType: 'holding', startAddress: 0, registerCount: 2 },
            { id: 'duplicate', registerType: 'holding', startAddress: 1, registerCount: 2 },
          ],
        },
      }),
    /перекрывают/u
  );
  assert.throws(() => validateConfiguredDevice({ ...base, readStrategy: 'auto' }), /readStrategy устарел/u);
  assert.throws(
    () =>
      validateConfiguredDevice({ ...base, readBlock: { registerType: 'holding', startAddress: 0, registerCount: 1 } }),
    /readBlock/u
  );
});

test('параметр обязан помещаться целиком в объявленный блок', () => {
  class Model {}

  assert.throws(
    () =>
      validateConfiguredDevice({
        id: 'partial-block-test',
        label: 'Partial block test',
        model: Model,
        readPlan: { blocks: [{ id: 'main', registerType: 'holding', startAddress: 0, registerCount: 3 }] },
        sections: [
          {
            id: 'data',
            title: 'Data',
            params: [
              { key: 'fits', address: 0, registerType: 'holding', dataType: 'float32', byteOrder: 'CDAB', unit: '' },
              {
                key: 'overflows',
                address: 2,
                registerType: 'holding',
                dataType: 'float32',
                byteOrder: 'CDAB',
                unit: '',
              },
            ],
          },
        ],
      }),
    /не помещается целиком в блок main/u
  );
});

test('individual использует чтение input-регистров для input-параметров', async () => {
  class Model {}
  const calls = [];
  const config = {
    id: 'individual-input-test',
    label: 'Individual input test',
    model: Model,
    readPlan: { auto: false },
    sections: [
      {
        id: 'data',
        title: 'Data',
        params: [
          { key: 'word', address: 1, registerType: 'input', dataType: 'uint16', unit: '' },
          { key: 'integer', address: 2, registerType: 'input', dataType: 'int32', byteOrder: 'ABCD', unit: '' },
          {
            key: 'float',
            address: 4,
            registerType: 'input',
            dataType: 'float32',
            byteOrder: 'ABCD',
            unit: '',
          },
        ],
      },
    ],
  };
  const wordsByAddress = { 1: [12], 2: [0x0000, 0x0022], 4: [0x4262, 0x0000] };
  const client = {
    async readInputBlock(slaveId, address, registerCount) {
      calls.push([slaveId, address, registerCount]);
      return wordsByAddress[address];
    },
  };

  const data = await collectConfiguredDeviceData(client, 9, 'Individual input test', config);

  assert.deepEqual(calls, [
    [9, 1, 1],
    [9, 2, 2],
    [9, 4, 2],
  ]);
  assert.deepEqual(data.data, { word: 12, integer: 34, float: 56.5 });
});

test('порядок слов одиночного параметра совпадает с блочным чтением', async () => {
  class Model {}
  const words = [0x4262, 0x0000];
  const param = {
    key: 'value',
    address: 0,
    registerType: 'holding',
    dataType: 'float32',
    byteOrder: 'ABCD',
    unit: '',
  };
  const buildConfig = (readPlan) => ({
    id: readPlan ? 'word-order-block-test' : 'word-order-individual-test',
    label: 'Word order test',
    model: Model,
    readPlan,
    sections: [{ id: 'data', title: 'Data', params: [param] }],
  });
  const client = { readHoldingBlock: async () => words };

  const individual = await collectConfiguredDeviceData(client, 1, 'Word order test', buildConfig(undefined));
  const block = await collectConfiguredDeviceData(
    client,
    1,
    'Word order test',
    buildConfig({ blocks: [{ id: 'main', registerType: 'holding', startAddress: 0, registerCount: 2 }] })
  );

  assert.equal(individual.data.value, block.data.value);
});

test('соседние адреса собираются в один блок автоматически', async () => {
  const calls = [];
  const config = createAutoPlanConfig([
    { key: 'word', address: 1, registerType: 'input', dataType: 'uint16', unit: '' },
    { key: 'integer', address: 2, registerType: 'input', dataType: 'int32', byteOrder: 'ABCD', unit: '' },
    { key: 'float', address: 4, registerType: 'input', dataType: 'float32', byteOrder: 'ABCD', unit: '' },
  ]);
  const plan = buildDeviceReadPlan(config);

  assert.deepEqual(plan.blocks, [
    { id: 'auto:default:input:1', slaveKey: 'default', registerType: 'input', startAddress: 1, registerCount: 5 },
  ]);
  assert.deepEqual(plan.individualParameters, []);

  const client = {
    async readInputBlock(slaveId, address, registerCount) {
      calls.push([slaveId, address, registerCount]);
      return [12, 0x0000, 0x0022, 0x4262, 0x0000];
    },
  };
  const data = await collectConfiguredDeviceData(client, 9, 'Auto plan test', config);

  assert.deepEqual(calls, [[9, 1, 5]], 'три параметра читаются одним запросом');
  assert.deepEqual(data.data, { word: 12, integer: 34, float: 56.5 });
});

test('по умолчанию блок не перепрыгивает через непрочитанный регистр', () => {
  const params = [
    { key: 'first', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
    { key: 'third', address: 3, registerType: 'holding', dataType: 'uint16', unit: '' },
  ];

  assert.deepEqual(buildDeviceReadPlan(createAutoPlanConfig(params)).blocks, []);
  assert.deepEqual(
    buildDeviceReadPlan(createAutoPlanConfig(params, { auto: { maxGapRegisters: 2 } })).blocks,
    [{ id: 'auto:default:holding:0', slaveKey: 'default', registerType: 'holding', startAddress: 0, registerCount: 4 }],
    'разрешённая дырка склеивает адреса в один запрос'
  );
});

test('автоблок не превышает ограничение по числу регистров', () => {
  const params = Array.from({ length: 6 }, (_, index) => ({
    key: `value${index}`,
    address: index,
    registerType: 'holding',
    dataType: 'uint16',
    unit: '',
  }));
  const plan = buildDeviceReadPlan(createAutoPlanConfig(params, { auto: { maxBlockRegisters: 4 } }));

  assert.deepEqual(
    plan.blocks.map((block) => [block.startAddress, block.registerCount]),
    [
      [0, 4],
      [4, 2],
    ]
  );
});

test('автоблоки строятся отдельно по каждому slave и типу регистров, coil читается поштучно', () => {
  const plan = buildDeviceReadPlan(
    createAutoPlanConfig([
      { key: 'holdingFirst', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
      { key: 'holdingSecond', address: 1, registerType: 'holding', dataType: 'uint16', unit: '' },
      { key: 'inputFirst', address: 0, registerType: 'input', dataType: 'uint16', unit: '' },
      { key: 'inputSecond', address: 1, registerType: 'input', dataType: 'uint16', unit: '' },
      { key: 'otherSlave', slaveId: 7, address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
      { key: 'coilFirst', address: 0, registerType: 'coil', dataType: 'boolean', unit: '' },
      { key: 'coilSecond', address: 1, registerType: 'coil', dataType: 'boolean', unit: '' },
    ])
  );

  assert.deepEqual(
    plan.blocks.map((block) => block.id),
    ['auto:default:holding:0', 'auto:default:input:0']
  );
  assert.deepEqual(
    plan.individualParameters.map((param) => param.key),
    ['otherSlave', 'coilFirst', 'coilSecond']
  );
});

test('явные блоки остаются главными, автоматика добирает только остаток', () => {
  const plan = buildDeviceReadPlan(
    createAutoPlanConfig(
      [
        { key: 'inBlock', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
        { key: 'restFirst', address: 10, registerType: 'holding', dataType: 'uint16', unit: '' },
        { key: 'restSecond', address: 11, registerType: 'holding', dataType: 'uint16', unit: '' },
      ],
      { blocks: [{ id: 'main', registerType: 'holding', startAddress: 0, registerCount: 1 }] }
    )
  );

  assert.deepEqual(
    plan.blocks.map((block) => block.id),
    ['main', 'auto:default:holding:10']
  );
});

test('автоматическую сборку блоков можно отключить целиком', () => {
  const plan = buildDeviceReadPlan(
    createAutoPlanConfig(
      [
        { key: 'first', address: 0, registerType: 'holding', dataType: 'uint16', unit: '' },
        { key: 'second', address: 1, registerType: 'holding', dataType: 'uint16', unit: '' },
      ],
      { auto: false }
    )
  );

  assert.deepEqual(plan.blocks, []);
  assert.deepEqual(
    plan.individualParameters.map((param) => param.key),
    ['first', 'second']
  );
});
