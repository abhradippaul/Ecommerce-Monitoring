import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import healthRoutes from './routes/health.routes.js';
import infoRoutes from './routes/info.routes.js';
import authRoutes from './routes/auth.routes.js';
import logger from './logger/index.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { metrics } from '@opentelemetry/api';

const app: Express = express();

const meter = metrics.getMeter('my-app', '1.0.0');

const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total HTTP requests',
});

const latencyHistogram = meter.createHistogram('http_request_duration_ms', {
  description: 'HTTP request latency',
  unit: 'ms',
});

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
  requestCounter.add(1, { method: 'GET', route: '/slow' });
  const duration = parseInt(req.query.duration as string) || 3000;
  logger.info(`Simulating slow request, ${duration}`);
  await new Promise((resolve) => setTimeout(resolve, duration));
  latencyHistogram.record(Date.now() - start, { route: '/slow' });
  res.json({ status: 'slow', duration });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error ${err}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
