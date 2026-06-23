import type { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response) => {
  return res.status(200).json({
    message: 'Successfully fetched health status',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
};
