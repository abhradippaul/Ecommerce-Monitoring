import type { Request, Response } from 'express';
import { healthService } from '../services/health.service.js';
import logger from '../utils/logger.js';
import { withHttpSpan } from '../utils/traces.js';

export const getHealth = async (req: Request, res: Response) => {
  await withHttpSpan('getHealth', req, res, async span => {
    const traceId = span.spanContext().traceId;
    logger.info('Health check requested', { trace_id: traceId });
    const healthStatus = healthService.getHealthStatus();
    res.status(200).json({
      message: 'Successfully fetched health status',
      data: healthStatus,
    });
  });
};
