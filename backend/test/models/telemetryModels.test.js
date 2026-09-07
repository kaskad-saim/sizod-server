import test from 'node:test';
import assert from 'node:assert/strict';
import { ExampleModel, TELEMETRY_MODELS } from '#features/monitoring/data/models/telemetryModels.js';

// имя модели -> MongoDB-коллекция; список фиксирует, что рефакторинг не меняет хранилище
const EXPECTED_COLLECTIONS = {
  exampleModel: 'examplemodels',
};

test('реестр телеметрии содержит все модели с ожидаемыми MongoDB-коллекциями', () => {
  const actual = Object.fromEntries(
    TELEMETRY_MODELS.map((model) => [model.modelName, model.collection.collectionName])
  );

  assert.deepEqual(actual, EXPECTED_COLLECTIONS);
  assert.equal(TELEMETRY_MODELS.length, Object.keys(EXPECTED_COLLECTIONS).length);
});

test('история не удаляется автоматически: индекс lastUpdated без TTL', () => {
  for (const model of TELEMETRY_MODELS) {
    const indexes = model.schema.indexes().filter(([fields]) => fields.lastUpdated === 1);

    assert.equal(indexes.length, 1, model.modelName);
    assert.equal(indexes[0][1].expireAfterSeconds, undefined, model.modelName);
  }
});

test('типовая телеметрическая модель сохраняет любые секции из конфига без описания в схеме', () => {
  const doc = new ExampleModel({
    parameters: { Температура: 25.3 },
    info: { Работа: true },
    lastUpdated: new Date(),
  });

  assert.equal(doc.validateSync(), undefined);

  const plain = doc.toObject();
  assert.deepEqual(plain.parameters, { Температура: 25.3 });
  assert.deepEqual(plain.info, { Работа: true });
});
