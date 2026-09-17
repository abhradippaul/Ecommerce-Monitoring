import { createLogger, format, transports } from 'winston';
import { config } from '../utils/config.js';

const productionLogger = () => {
  return createLogger({
    level: config.logLevel,
    format: format.json(),
    transports: [
      new transports.File({ filename: config.logFile }),
      new transports.File({ filename: config.errorFile, level: 'error' }),
      new transports.Console(), // ONLY PRINTING LOGS IN TERMINAL
    ],
  });
};

export default productionLogger;
