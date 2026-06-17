import type { Request, Response } from 'express';
import { recordRequest } from '../utils/metrics.js';

export const getHealth = (_req: Request, res: Response) => {
  recordRequest('GET', '/health');
  return res.status(200).json({
    message: "Successfully fetched health status",
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
};
