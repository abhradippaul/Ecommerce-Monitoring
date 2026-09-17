import type { Request, Response } from 'express';
import { infoService } from '../services/info.service.js';
import logger from '../utils/logger.js';
import { withHttpSpan } from '../utils/traces.js';

export const getInfo = async (req: Request, res: Response) => {
  await withHttpSpan('getInfo', req, res, async span => {
    const traceId = span.spanContext().traceId;
    logger.info('Info requested', { trace_id: traceId });
    const info = infoService.getInfo();
    res.status(200).json({
      message: 'Successfully fetched application info',
      data: info,
    });
  });
};
