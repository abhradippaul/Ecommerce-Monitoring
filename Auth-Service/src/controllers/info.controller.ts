import type { Request, Response } from 'express';
import logger from '../utils/logger.js';
import { config } from '../utils/config.js';

export const getInfo = (req: Request, res: Response) => {
  logger.info('Info requested');
  res.status(200).json({
    message: 'Successfully fetched application info',
    data: {
      name: config.appName,
      version: '1.0.0',
      description: 'REST API for monitoring NodeJS application',
      environment: process.env.NODE_ENV || 'development',
    },
  });
};
