import express from 'express';
import { getMonitoringTree } from '#features/monitoring/diagnostics/monitoringState.js';
import { modbusRequestTimings } from '@sorbent/platform-kit/modbus';
import logger from '#infrastructure/logger.js';

const router = express.Router();

router.get('/monitoring/status', (req, res) => {
  try {
    res.json(getMonitoringTree());
  } catch (error) {
    logger.error(`Ошибка при получении мониторинга устройств: ${error.message}`);
    res.status(500).json({ message: 'Ошибка сервера мониторинга' });
  }
});

router.get('/monitoring/modbus-timings', (req, res) => {
  try {
    res.json(modbusRequestTimings.getReport());
  } catch (error) {
    logger.error(`Ошибка при получении времени ответа Modbus: ${error.message}`);
    res.status(500).json({ message: 'Ошибка сервера мониторинга' });
  }
});

export default router;
