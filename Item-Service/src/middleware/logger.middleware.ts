import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl}`;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    };

    if (res.statusCode >= 500) {
      logger.error(message, meta);
    } else if (res.statusCode >= 400) {
      logger.warn(message, meta);
    } else {
      logger.info(message, meta);
    }
  });
  next();
};
