import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import healthRoutes from './routes/health.routes.js';
import infoRoutes from './routes/info.routes.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { requestCounter } from './utils/metrics.js';

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
app.use('/api/v1/auth/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/auth/health', healthRoutes);
app.use('/api/v1/auth/info', infoRoutes);
app.use('/api/v1/auth/profile', profileRoutes);
app.use('/api/v1/auth', authRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  requestCounter.add(1, { route: '/error' });
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
