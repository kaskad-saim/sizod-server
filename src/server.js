import express from 'express';
import { connectToDotEkoDb, connectToDotProDb } from './config/db.js';
import { apiRoutes } from './routes/api.js';
import { readData } from './services/modbusService.js';
import { readDataDotPro } from './services/modbusServiceDotPro.js';

const app = express();
app.use(express.static('public'));

const startServer = async () => {
  const dotEkoCollection = await connectToDotEkoDb();
  // const dotProCollection = await connectToDotProDb();

  // Установка маршрутов для DOT-EKO и DOT-PRO с отдельными маршрутами для API
  app.use('/api', apiRoutes(dotEkoCollection));

  // Запуск сервисов Modbus для DOT-EKO и DOT-PRO
  readData(dotEkoCollection);
  // readDataDotPro(dotProCollection);

  app.listen(3002, () => {
    console.log('Сервер работает на http://localhost:3002');
  });
};

startServer();