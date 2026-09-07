// один элемент на COM-порт: IP контроллера, номер физического порта RS-485, тип контроллера и что к линии подключено
export const convertersConfig = [];

export const getConverterMetaByPort = (port) => {
  if (!port) return null;
  return convertersConfig.find((item) => item.comPort === port) || null;
};
