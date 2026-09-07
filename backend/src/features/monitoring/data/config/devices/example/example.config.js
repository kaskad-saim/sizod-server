import { ExampleModel } from '#features/monitoring/data/models/telemetryModels.js';

const config = {
  id: 'example',
  label: 'Пример устройства',
  group: 'СИЗОД',
  model: ExampleModel,
  sections: [
    {
      id: 'parameters',
      title: 'Параметры',
      params: [
        {
          key: 'Температура',
          address: 0x0000,
          registerType: 'holding',
          dataType: 'float32',
          byteOrder: 'CDAB',
          unit: '°C',
          precision: 1,
        },
        {
          key: 'Давление',
          address: 0x0002,
          registerType: 'holding',
          dataType: 'float32',
          byteOrder: 'CDAB',
          unit: 'кПа',
          precision: 1,
        },
        {
          key: 'Расход',
          address: 0x0004,
          registerType: 'holding',
          dataType: 'float32',
          byteOrder: 'CDAB',
          unit: 'м³/ч',
          precision: 2,
        },
      ],
    },
    {
      id: 'info',
      title: 'Состояние',
      params: [
        { key: 'Работа', address: 0x0006, registerType: 'holding', dataType: 'uint16', bit: 0, unit: '' },
        { key: 'Авария', address: 0x0006, registerType: 'holding', dataType: 'uint16', bit: 1, unit: '' },
      ],
    },
  ],
};

export default config;
