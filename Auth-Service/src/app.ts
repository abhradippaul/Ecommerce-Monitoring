import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import healthRoutes from './routes/health.routes.js';
import infoRoutes from './routes/info.routes.js';
import authRoutes from './routes/auth.routes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { recordRequest, latencyHistogram } from './utils/metrics.js';
import logger from './utils/logger.js';

const app: Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/health', healthRoutes);
app.use('/info', infoRoutes);
app.use('/auth', authRoutes);

/**
 * @openapi
 * /slow:
 *   get:
 *     summary: Simulate a slow request
 *     description: Delays the response by a given duration (in milliseconds) to simulate high latency or slow network conditions.
 *     tags:
 *       - Monitoring
 *     parameters:
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *           default: 3000
 *         description: The duration to delay the response in milliseconds.
 *     responses:
 *       200:
 *         description: Successfully simulated slow request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: slow
 *                 duration:
 *                   type: integer
 *                   example: 3000
 */
app.get('/slow', async (req: Request, res: Response) => {
  const start = Date.now();
  recordRequest('GET', '/slow');
  const duration = parseInt(req.query.duration as string) || 3000;
  await new Promise((resolve) => setTimeout(resolve, duration));
  latencyHistogram.record(Date.now() - start, { route: '/slow' });
  logger.info(`Slow request completed in ${duration}ms`, { route: '/slow', duration });
  return res.json({ status: 'slow', duration });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  recordRequest('ERROR', '/error');
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
