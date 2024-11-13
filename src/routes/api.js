import { Router } from 'express';
import { dotEkoReportHour, dotEkoReportMonth } from '../services/reportDotEkoServices.js';

const router = Router();

export const apiRoutes = (dotEkoCollection, dotProCollection) => {
  // Маршрут для получения данных DOT-EKO
  router.get('/dot-eko', async (req, res) => {
    try {
      const data = await dotEkoCollection.find().sort({ timestamp: -1 }).limit(1).toArray();
      if (data.length > 0) {
        res.json({
          rightSki: data[0].rightSki,
          leftSki: data[0].leftSki,
          defect: data[0].defect,
          rightSkiReport: data[0].rightSkiReport,
          leftSkiReport: data[0].leftSkiReport,
          defectReport: data[0].defectReport,
          shiftTime: data[0].shiftTime,
          workTime: data[0].workTime,
          totalSki: data[0].totalSki,
          totalSkiReport: data[0].totalSkiReport,
          lineStatusValue: data[0].lineStatusValue,
          lastUpdated: new Date(data[0].lastUpdated).toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      } else {
        res.json({ message: 'Нет данных для DOT-EKO' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка получения данных DOT-EKO');
    }
  });

  // Маршрут для получения данных DOT-PRO
  router.get('/dot-pro', async (req, res) => {
    try {
      const data = await dotProCollection.find().sort({ timestamp: -1 }).limit(1).toArray();
      if (data.length > 0) {
        res.json({
          endValue: data[0].endValue,
          reportValue: data[0].reportValue,
          daylyTime: data[0].daylyTime,
          monthlyTime: data[0].monthlyTime,
          lastUpdated: new Date(data[0].lastUpdated).toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      } else {
        res.json({ message: 'Нет данных для DOT-PRO' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка получения данных DOT-PRO');
    }
  });

  // Новый маршрут для получения часового отчета
  router.get('/hourly-report', async (req, res) => {
    try {
      const report = await dotEkoReportHour(dotEkoCollection);
      res.json(report);
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка получения часового отчета');
    }
  });

  // Новый маршрут для получения месячного отчета
  router.get('/monthly-report', async (req, res) => {
    try {
      const report = await dotEkoReportMonth(dotEkoCollection);
      res.json(report);
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка получения месячного отчета');
    }
  });

  return router;
};