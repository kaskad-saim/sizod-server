import { DEFAULT_STALE_AFTER_MS, deviceStateStore } from '@sorbent/platform-kit/device';

export const DATA_STALE_MS = DEFAULT_STALE_AFTER_MS;

const LAST_UPDATED_LOCALE_OPTIONS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

export const formatLastUpdated = (date) => new Date(date).toLocaleString('ru-RU', LAST_UPDATED_LOCALE_OPTIONS);

export const isDataStale = (lastUpdated, maxAgeMs = DATA_STALE_MS) => {
  const updatedAtMs = new Date(lastUpdated).getTime();
  return !Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > maxAgeMs;
};

export const mapValuesToDash = (data) => {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const keys = data instanceof Map ? Array.from(data.keys()) : Object.keys(data);
    return Object.fromEntries(keys.map((key) => [key, '-']));
  }

  return '-';
};

export const toPlainMapValue = (value) => {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  return value;
};

export const toPlainDocument = (doc) => {
  if (typeof doc.toObject === 'function') {
    return doc.toObject({ flattenMaps: true });
  }

  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  return Object.fromEntries(Object.entries(doc).map(([key, value]) => [key, toPlainMapValue(value)]));
};

// текущее состояние устройства: кэш последнего опроса, при его отсутствии - последний документ БД
export const getLatestDocument = async (Model, { lean = false } = {}) => {
  const cached = deviceStateStore.getByModel(Model);
  if (cached) {
    return cached;
  }

  const query = Model.findOne().sort({ lastUpdated: -1 });
  return lean ? query.lean() : query;
};
