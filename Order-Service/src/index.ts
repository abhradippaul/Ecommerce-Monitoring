import app from './app.js';
import logger from './logger/index.js';
import { config } from './utils/config.js';
import { connectDB } from './config/db.js';

const PORT = config.port;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(
      `Order Service is running in ${config.nodeEnv} environment on http://localhost:${PORT}`
    );
  });
};

startServer();
