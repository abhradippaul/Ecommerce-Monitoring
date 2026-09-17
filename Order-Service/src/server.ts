import app from './app.js';
import logger from './utils/logger.js';
import { config } from './utils/config.js';
import { connectDB } from './config/db.js';

const PORT = config.port;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(
        `Order Service is running in ${config.nodeEnv} environment on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
