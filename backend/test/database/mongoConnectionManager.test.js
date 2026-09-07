import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { createMongoConnectionManager } from '#infrastructure/mongoConnectionManager.js';

function createConnection() {
  const connection = new EventEmitter();
  connection.readyState = 0;
  return connection;
}

function createLog() {
  return {
    error() {},
    info() {},
    warn() {},
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, timeoutMs = 200) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('Превышено время ожидания');
    }
    await delay(2);
  }
}

test('повторяет первоначальное подключение с backoff', async () => {
  const connection = createConnection();
  let attempts = 0;
  const manager = createMongoConnectionManager({
    connection,
    label: 'тестовой базе данных',
    initialDelayMs: 5,
    maxDelayMs: 20,
    log: createLog(),
    open: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('Database unavailable');
      }
      connection.readyState = 1;
      connection.emit('connected');
    },
  });

  assert.equal(await manager.connect('mongodb://localhost/test'), false);
  await waitFor(() => attempts === 2);

  assert.equal(connection.readyState, 1);
});

test('после успешного подключения оставляет восстановление Mongoose', async () => {
  const connection = createConnection();
  const warnings = [];
  let attempts = 0;
  const manager = createMongoConnectionManager({
    connection,
    label: 'тестовой базе данных',
    initialDelayMs: 5,
    maxDelayMs: 20,
    log: {
      ...createLog(),
      warn: (message) => warnings.push(message),
    },
    open: async () => {
      attempts += 1;
      connection.readyState = 1;
      connection.emit('connected');
    },
  });

  assert.equal(await manager.connect('mongodb://localhost/test'), true);
  connection.readyState = 0;
  connection.emit('disconnected');
  await delay(20);

  assert.equal(attempts, 1);
  assert.equal(warnings.length, 1);
});

test('успешное подключение Mongoose отменяет initial retry', async () => {
  const connection = createConnection();
  let attempts = 0;
  const manager = createMongoConnectionManager({
    connection,
    label: 'тестовой базе данных',
    initialDelayMs: 5,
    maxDelayMs: 20,
    log: createLog(),
    open: async () => {
      attempts += 1;
      throw new Error('Database unavailable');
    },
  });

  assert.equal(await manager.connect('mongodb://localhost/test'), false);
  connection.readyState = 1;
  connection.emit('connected');
  await delay(20);

  assert.equal(attempts, 1);
});
