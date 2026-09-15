import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import healthRoutes from './routes/health.routes.js';
import infoRoutes from './routes/info.routes.js';
import orderRoutes from './routes/order.routes.js';
import logger from './logger/index.js';
import { config } from './utils/config.js';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

app.use('/health', healthRoutes);
app.use('/info', infoRoutes);
app.use('/orders', orderRoutes);

app.get('/slow', async (req: Request, res: Response) => {
  const duration = parseInt(req.query.duration as string) || 3000;
  logger.info(`Simulating slow request, ${duration}`);
  await new Promise((resolve) => setTimeout(resolve, duration));
  res.json({ status: 'slow', duration });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error ${err}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
