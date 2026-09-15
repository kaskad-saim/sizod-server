import test from 'node:test';
import assert from 'node:assert/strict';
import { Station16Model, TELEMETRY_MODELS } from '#features/monitoring/data/models/telemetryModels.js';

// имя модели -> MongoDB-коллекция; список фиксирует, что рефакторинг не меняет хранилище
const EXPECTED_COLLECTIONS = {
  station16Model: 'station16models',
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
  const doc = new Station16Model({
    process: { Давление: 12.5 },
    inputs: { 'Аварийный стоп': false },
    lastUpdated: new Date(),
  });

  assert.equal(doc.validateSync(), undefined);

  const plain = doc.toObject();
  assert.deepEqual(plain.process, { Давление: 12.5 });
  assert.deepEqual(plain.inputs, { 'Аварийный стоп': false });
});
