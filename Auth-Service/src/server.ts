import app from './app.js';
import logger from './utils/logger.js';
import { config } from './utils/config.js';
import { connectDB } from './config/db.js';
import { getSecretValue } from './utils/aws-secret.js';
import valkey from './utils/valkey.js';
const startServer = async () => {
  try {
    // 1. Initialize Vault first
    await getSecretValue(config.awsSecretArn);

    // 2. Then connect to DB (which may need Vault secrets)
    await connectDB();
    logger.info('Auth Service is initializing...');

    valkey.on('error', (err) => {
      logger.error('Valkey connection error:', err);
    });

    valkey.on('ready', () => {
      console.log("hello")
      logger.info('Valkey connected');
    });

    // 3. Finally start the server
    app.listen(config.port, () => {
      logger.info(
        `Auth Service is running in ${config.nodeEnv} environment on http://localhost:${config.port}`
      );
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit if Vault or DB fails
  }
};

startServer();
