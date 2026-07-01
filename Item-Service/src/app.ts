import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import healthRoutes from './routes/health.routes.js';
import infoRoutes from './routes/info.routes.js';
import itemRoutes from './routes/item.routes.js';
import categoryRoutes from './routes/category.routes.js';
import logger from './logger/index.js';
import { config } from './utils/config.js';

const app: Express = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);

app.use('/api/v1/items/health', healthRoutes);
app.use('/api/v1/items/info', infoRoutes);
app.use('/api/v1/items/categories', categoryRoutes);
app.use('/api/v1/items', itemRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error ${err}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
