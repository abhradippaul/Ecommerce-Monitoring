import winston from 'winston';
import { config } from './config.js';

const logger: winston.Logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  // transports: [new winston.transports.Console()],
});

export default logger;

