import type { Request, Response } from 'express';
import { infoService } from '../services/info.service.js';
import logger from '../logger/index.js';

export const getInfo = (req: Request, res: Response) => {
  logger.info('Info requested');
  const info = infoService.getInfo();
  res.status(200).json({
    message: 'Successfully fetched application info',
    data: info,
  });
};
