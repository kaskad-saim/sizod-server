import mongoose from 'mongoose';

export const TELEMETRY_MODELS = [];

// схема телеметрии: секции устройства сохраняются как есть (список секций задаёт конфиг),
export const createTelemetrySchema = (fields = {}) => {
  const schema = new mongoose.Schema(
    {
      lastUpdated: { type: Date, default: Date.now },
      ...fields,
    },
    { strict: false }
  );

  schema.index({ lastUpdated: 1 });

  return schema;
};

// компилирует модель по готовой схеме и добавляет её в реестр
export const registerTelemetryModel = (name, collection, schema) => {
  const model = mongoose.model(name, schema, collection);
  TELEMETRY_MODELS.push(model);
  return model;
};

// телеметрическая модель с типовой схемой
export const createTelemetryModel = (name, collection, fields = {}) =>
  registerTelemetryModel(name, collection, createTelemetrySchema(fields));
