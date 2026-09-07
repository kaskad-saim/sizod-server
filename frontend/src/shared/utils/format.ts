export type ParamsRecord = Record<string, unknown>;
export type UnitsMap = Record<string, string>;

// булевы значения в «Да/Нет», пустые в прочерк, остальное в строку
const formatValue = (value: unknown): string => {
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }

  if (value === null || value === undefined) {
    return '-';
  }

  return String(value);
};

// добавляет единицы измерения к названиям параметров и готовит значения для таблицы
export const formatSensorData = (parameters: ParamsRecord, unitsMap: UnitsMap = {}): Record<string, string> =>
  Object.fromEntries(
    Object.entries(parameters).map(([name, value]) => {
      const unit = unitsMap[name] ? `, ${unitsMap[name]}` : '';
      return [`${name}${unit}`, formatValue(value)];
    })
  );
