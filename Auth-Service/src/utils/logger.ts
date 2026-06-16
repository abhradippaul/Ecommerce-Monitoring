import winston from 'winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
import { config } from './config.js';

const logger: winston.Logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new OpenTelemetryTransportV3()
  ]
});

export default logger;
