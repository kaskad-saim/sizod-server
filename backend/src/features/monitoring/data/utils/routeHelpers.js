import logger from '#infrastructure/logger.js';
import {
  DATA_STALE_MS,
  formatLastUpdated,
  getLatestDocument,
  isDataStale,
  mapValuesToDash,
  toPlainDocument,
} from '#features/monitoring/data/utils/dataHelpers.js';

export const NOT_FOUND_MESSAGE = 'Данные не найдены';
export const SERVER_ERROR_MESSAGE = 'Ошибка сервера';

export const handleDeviceGet = async (
  res,
  { fetch, buildResponse, logMessage, notFoundMessage = NOT_FOUND_MESSAGE }
) => {
  try {
    const data = await fetch();

    if (!data) {
      return res.status(404).json({ message: notFoundMessage });
    }

    res.json(await buildResponse(data));
  } catch (err) {
    logger.error(`${logMessage} ${err.message}`);
    res.status(500).json({ message: SERVER_ERROR_MESSAGE });
  }
};

// секции документа как есть, при устаревании вместо значений прочерки
export const buildFieldsStaleResponse = (doc, fields, { staleMs = DATA_STALE_MS, omitFields = [] } = {}) => {
  const stale = isDataStale(doc.lastUpdated, staleMs);
  const lastUpdated = formatLastUpdated(doc.lastUpdated);
  const plainDoc = toPlainDocument(doc);
  const responseFields = Object.fromEntries(
    fields.map((field) => [field, stale ? mapValuesToDash(plainDoc[field]) : plainDoc[field]])
  );

  if (stale) {
    return { ...responseFields, lastUpdated };
  }

  const publicDoc = Object.fromEntries(Object.entries(plainDoc).filter(([key]) => !omitFields.includes(key)));

  return { ...publicDoc, ...responseFields, lastUpdated };
};

export const createLatestDataHandler = (Model, buildResponse, logMessage, options = {}) => {
  return async (req, res) => {
    await handleDeviceGet(res, {
      fetch: () => getLatestDocument(Model, { lean: options.lean }),
      buildResponse,
      logMessage,
      notFoundMessage: options.notFoundMessage,
    });
  };
};

export const createFieldsDataHandler = (Model, fields, logMessage, options = {}) =>
  createLatestDataHandler(Model, (doc) => buildFieldsStaleResponse(doc, fields, options), logMessage, options);
