import express from 'express';
import { getMonitoringTree } from '#features/monitoring/diagnostics/monitoringState.js';
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

export default router;
