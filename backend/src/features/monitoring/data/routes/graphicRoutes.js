import express from 'express';
import logger from '#infrastructure/logger.js';
import { getGraphicDeviceModel } from '#features/monitoring/data/config/graphicDevices.config.js';

const router = express.Router();

router.get('/:deviceId/data', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { start, end } = req.query;

    const deviceModel = getGraphicDeviceModel(deviceId.toLowerCase());

    if (!deviceModel) {
      return res.status(404).json({ error: 'Устройство не найдено' });
    }

    const query = start && end ? { lastUpdated: { $gte: new Date(start), $lte: new Date(end) } } : {};
    const data = await deviceModel.find(query).sort({ lastUpdated: 1 });

    res.json(data);
  } catch (error) {
    logger.error(`Ошибка при получении данных для устройства ${req.params.deviceId}: ${error.message}`);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
