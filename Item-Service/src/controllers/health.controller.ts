import type { Request, Response } from 'express';
import { healthService } from '../services/health.service.js';
import logger from '../utils/logger.js';

export const getHealth = (req: Request, res: Response) => {
  logger.info('Health check requested');
  const healthStatus = healthService.getHealthStatus();
  res.status(200).json({
    message: "Successfully fetched health status",
    data: healthStatus
  });
};
