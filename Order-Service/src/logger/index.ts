import { Logger } from 'winston';
import devLogger from './devLogger.js';
import uatLogger from './uatLogger.js';
import productionLogger from './productionLogger.js';
import { config } from '../utils/config.js';

let logger: Logger;

if (config.nodeEnv === 'production') {
  logger = productionLogger();
} else if (config.nodeEnv === 'uat') {
  logger = uatLogger();
} else {
  logger = devLogger();
}

export default logger;
