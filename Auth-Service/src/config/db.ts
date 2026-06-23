import mongoose from 'mongoose';
import { config } from '../utils/config.js';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('Connected to MongoDB');
    }
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error}`);
    process.exit(1);
  }
};
